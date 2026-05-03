import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AuthError } from "../src/errors.js";
import * as rootSdk from "../src/index.js";
import * as refereeSdk from "../src/referee/index.js";
import {
  assertLocalRefereeOutcomeSummaryPayload,
  assertLocalRefereeOutcomeSummaryPayloadIsSafe,
  assertLocalRefereeReceipt,
  buildLocalRefereeContractRef,
  buildLocalRefereeOutcomeSummaryPayload,
  buildLocalRefereeReceipt,
  evaluateLocalRefereeContract,
  labelLocalRefereeCheckType,
  LOCAL_REFEREE_CHECK_LABELS,
  LocalRefereeContractError,
  normalizeLocalRefereeEvidence,
  parseLocalRefereeContract,
  parseLocalRefereeContractJson,
  renderLocalRefereeOutcomeSharePreview,
  renderLocalRefereeReceipt,
  renderLocalRefereeReceiptMarkdown,
  shouldShareLocalRefereeOutcomeSummary,
  submitLocalRefereeOutcomeSummary,
  type LocalRefereeCheck,
  type LocalRefereeRawEvidence,
  type LocalRefereeReceipt,
} from "../src/referee/index.js";

function contractWith(checks: LocalRefereeCheck[]) {
  return parseLocalRefereeContract({ version: 1, checks });
}

function receiptFixture(overrides: Partial<LocalRefereeReceipt> = {}): LocalRefereeReceipt {
  return {
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    contractRef: "contract_test",
    verdict: "passed",
    evidence: {
      filesTouchedBucket: "1_to_2",
      toolCallsBucket: "3_to_5",
      validationStatus: "passed",
      testsRun: true,
      networkRequired: false,
      elapsedMinutesBucket: "15_to_30",
      outcome: "completed",
    },
    checks: [
      {
        id: "check_1",
        type: "validation_status",
        status: "passed",
        reasonCode: "validation_status_matched",
      },
      {
        id: "check_2",
        type: "max_files_touched",
        status: "passed",
        reasonCode: "files_within_limit",
      },
    ],
    ...overrides,
  };
}

describe("Local Referee contract parsing", () => {
  it("parses supported check types including optional commit presence", () => {
    expect(
      parseLocalRefereeContract({
        version: 1,
        checks: [
          { type: "validation status", required: "Passed" },
          { type: "max-files-touched", max: 5 },
          { type: "max_tool_calls", max: 10 },
          { type: "require_tests" },
          { type: "network_required", required: false },
          { type: "outcome", required: "completed" },
          { type: "git_commit_present" },
        ],
      }),
    ).toEqual({
      version: 1,
      checks: [
        { type: "validation_status", required: "passed" },
        { type: "max_files_touched", max: 5 },
        { type: "max_tool_calls", max: 10 },
        { type: "require_tests", required: true },
        { type: "network_required", required: false },
        { type: "outcome", required: "completed" },
        { type: "git_commit_present", required: true },
      ],
    });
  });

  it("rejects invalid contracts before evaluation", () => {
    const badContracts = [
      null,
      { version: 2, checks: [{ type: "validation_status" }] },
      { version: 1, checks: [] },
      { version: 1, checks: [{ type: "raw_log_contains", required: "secret" }] },
      { version: 1, checks: [{ type: "max_files_touched", max: -1 }] },
      { version: 1, checks: [{ type: "max_tool_calls", max: 1.5 }] },
      { version: 1, checks: [{ type: "network_required" }] },
      { version: 1, checks: [{ type: "git_commit_present", required: "yes" }] },
    ];

    for (const contract of badContracts) {
      expect(() => parseLocalRefereeContract(contract)).toThrow(LocalRefereeContractError);
    }
  });

  it("rejects malformed JSON before contract validation", () => {
    expect(() => parseLocalRefereeContractJson("{not json")).toThrow("valid JSON");
  });
});

describe("Local Referee evidence normalization", () => {
  it("normalizes raw local evidence variants into counts booleans categories and buckets", () => {
    expect(
      normalizeLocalRefereeEvidence({
        filesTouched: "4",
        toolCalls: "8",
        validationStatus: "success",
        testsRun: "yes",
        networkRequired: "no",
        gitCommitPresent: "present",
        elapsedMinutes: "22",
        manualReviewRoundTripsAvoided: "2",
        outcome: "complete",
      }),
    ).toMatchObject({
      filesTouched: 4,
      filesTouchedBucket: "3_to_5",
      toolCalls: 8,
      toolCallsBucket: "6_to_10",
      validationStatus: "passed",
      testsRun: true,
      networkRequired: false,
      gitCommitPresent: true,
      elapsedMinutesBucket: "15_to_30",
      manualReviewRoundTripsAvoided: 2,
      outcome: "completed",
    });
  });

  it("normalizes missing optional minutes and manual review counts as unknown", () => {
    expect(normalizeLocalRefereeEvidence({ elapsedMinutes: "not-a-number" })).toMatchObject({
      elapsedMinutes: null,
      elapsedMinutesBucket: "unknown",
      manualReviewRoundTripsAvoided: null,
    });
  });

  it("marks malformed count evidence as unavailable instead of assuming zero", () => {
    expect(
      normalizeLocalRefereeEvidence({ filesTouched: "unknown", toolCalls: "n/a" }),
    ).toMatchObject({
      filesTouched: 0,
      filesTouchedKnown: false,
      toolCalls: 0,
      toolCallsKnown: false,
    });
  });
});

describe("Local Referee evaluation", () => {
  const cases: Array<{
    check: LocalRefereeCheck;
    pass: LocalRefereeRawEvidence;
    fail: LocalRefereeRawEvidence;
    passReason: string;
    failReason: string;
  }> = [
    {
      check: { type: "validation_status", required: "passed" },
      pass: { validationStatus: "passed" },
      fail: { validationStatus: "failed" },
      passReason: "validation_status_matched",
      failReason: "validation_status_mismatch",
    },
    {
      check: { type: "max_files_touched", max: 2 },
      pass: { filesTouched: 2 },
      fail: { filesTouched: 3 },
      passReason: "files_within_limit",
      failReason: "files_over_limit",
    },
    {
      check: { type: "max_tool_calls", max: 2 },
      pass: { toolCalls: 2 },
      fail: { toolCalls: 3 },
      passReason: "tool_calls_within_limit",
      failReason: "tool_calls_over_limit",
    },
    {
      check: { type: "require_tests", required: true },
      pass: { testsRun: true },
      fail: { testsRun: false },
      passReason: "tests_requirement_matched",
      failReason: "tests_requirement_mismatch",
    },
    {
      check: { type: "network_required", required: false },
      pass: { networkRequired: false },
      fail: { networkRequired: true },
      passReason: "network_requirement_matched",
      failReason: "network_requirement_mismatch",
    },
    {
      check: { type: "outcome", required: "completed" },
      pass: { outcome: "completed" },
      fail: { outcome: "blocked" },
      passReason: "outcome_matched",
      failReason: "outcome_mismatch",
    },
    {
      check: { type: "git_commit_present", required: true },
      pass: { gitCommitPresent: true },
      fail: { gitCommitPresent: false },
      passReason: "git_commit_requirement_matched",
      failReason: "git_commit_requirement_mismatch",
    },
  ];

  it("evaluates every check type as passed and failed", () => {
    for (const item of cases) {
      const passing = evaluateLocalRefereeContract(
        contractWith([item.check]),
        normalizeLocalRefereeEvidence(item.pass),
      );
      const failing = evaluateLocalRefereeContract(
        contractWith([item.check]),
        normalizeLocalRefereeEvidence(item.fail),
      );

      expect(passing).toMatchObject({
        verdict: "passed",
        checks: [{ status: "passed", reasonCode: item.passReason }],
      });
      expect(failing).toMatchObject({
        verdict: "needs_review",
        checks: [{ status: "failed", reasonCode: item.failReason }],
      });
    }
  });

  it("fails scope checks closed when count evidence is unavailable", () => {
    const contract = contractWith([
      { type: "max_files_touched", max: 5 },
      { type: "max_tool_calls", max: 10 },
    ]);
    const evaluation = evaluateLocalRefereeContract(contract, normalizeLocalRefereeEvidence({}));

    expect(evaluation).toMatchObject({
      verdict: "needs_review",
      checks: [
        { status: "failed", reasonCode: "files_touched_unknown" },
        { status: "failed", reasonCode: "tool_calls_unknown" },
      ],
    });
  });
});

describe("Local Referee receipts", () => {
  it("preserves the structured renderer format", () => {
    expect(renderLocalRefereeReceipt(receiptFixture())).toBe(
      [
        "HEADSDOWN LOCAL REFEREE RECEIPT",
        "Verdict: passed",
        "Contract: contract_test",
        "Generated: 2026-01-01T00:00:00.000Z",
        "Evidence:",
        "- Files touched: 1_to_2",
        "- Tool calls: 3_to_5",
        "- Validation: passed",
        "- Tests run: yes",
        "- Network required: no",
        "- Elapsed: 15_to_30",
        "- Outcome: completed",
        "Checks:",
        "- check_1: passed (validation_status, validation_status_matched)",
        "- check_2: passed (max_files_touched, files_within_limit)",
        "",
        "Local-only: this receipt contains derived review fields only. It does not include prompts, source code, file paths, repository names, branch names, terminal output, logs, or message contents.",
      ].join("\n"),
    );
  });

  it("rejects unsafe or inconsistent caller-provided receipt fields before rendering", () => {
    expect(() => assertLocalRefereeReceipt(receiptFixture())).not.toThrow();
    expect(() =>
      renderLocalRefereeReceipt({
        ...receiptFixture(),
        contractRef: "https://example.invalid/private",
      }),
    ).toThrow("safe token");
    expect(() =>
      renderLocalRefereeReceiptMarkdown({
        ...receiptFixture(),
        checks: [
          {
            id: "check_1",
            type: "validation_status",
            status: "passed",
            reasonCode: "console.log(secret)",
          },
        ],
      }),
    ).toThrow("safe token");
    expect(() => renderLocalRefereeReceipt({ ...receiptFixture(), checks: [] })).toThrow(
      "requires at least one check",
    );
    expect(() =>
      renderLocalRefereeReceipt({
        ...receiptFixture(),
        verdict: "passed",
        checks: [
          {
            id: "check_1",
            type: "validation_status",
            status: "failed",
            reasonCode: "validation_status_mismatch",
          },
        ],
      }),
    ).toThrow("verdict does not match failed checks");
  });

  it("builds contract refs from normalized contract fields only", () => {
    const contract = contractWith([{ type: "validation_status", required: "passed" }]);
    const contractWithIgnoredRuntimeFields = {
      ...contract,
      ignoredRuntimeField: "ignored_value",
      checks: [{ ...contract.checks[0], ignoredRuntimeField: "ignored_value" }],
    };

    expect(buildLocalRefereeContractRef(contractWithIgnoredRuntimeFields)).toBe(
      buildLocalRefereeContractRef(contract),
    );
  });

  it("renders the canonical concise markdown receipt", () => {
    const contract = contractWith([
      { type: "outcome", required: "completed" },
      { type: "validation_status", required: "passed" },
      { type: "git_commit_present", required: true },
      { type: "max_files_touched", max: 5 },
      { type: "max_tool_calls", max: 10 },
    ]);
    const evidence = normalizeLocalRefereeEvidence({
      filesTouched: 4,
      toolCalls: 8,
      validationStatus: "passed",
      testsRun: true,
      networkRequired: false,
      gitCommitPresent: true,
      elapsedMinutes: 22,
      manualReviewRoundTripsAvoided: 2,
      outcome: "completed",
    });
    const evaluation = evaluateLocalRefereeContract(contract, evidence);
    const receipt = buildLocalRefereeReceipt({
      contract,
      evidence,
      evaluation,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(renderLocalRefereeReceiptMarkdown(receipt)).toBe(
      [
        "### HeadsDown Referee",
        "",
        "✓ Definition of done satisfied",
        "✓ Validation completed",
        "✓ Commit present",
        "✓ Scope within contract",
        "↩ Manual review round trips avoided: 2",
        "🔒 Verified locally",
      ].join("\n"),
    );
  });

  it("keeps labels canonical and avoids misleading network language", () => {
    expect(LOCAL_REFEREE_CHECK_LABELS.max_files_touched).toBe("Scope within contract");
    expect(labelLocalRefereeCheckType("max_tool_calls")).toBe("Scope within contract");
    expect(labelLocalRefereeCheckType("network_required")).toBe("Network requirement satisfied");
  });
});

describe("Local Referee outcome payloads and sharing", () => {
  it("builds metadata-only payloads with parameterized client kind", () => {
    const payload = buildLocalRefereeOutcomeSummaryPayload({
      receipt: receiptFixture(),
      client: { kind: "claude", version: "0.9.0" },
      executionMode: "local_only",
    });

    expect(payload).toMatchObject({
      schemaVersion: 1,
      finalState: "passed",
      controlDecisionCounts: { passed: 2, failed: 0 },
      completionExceptionCount: 0,
      validationStatus: "passed",
      elapsedTimeBucket: "15_to_30",
      manualReviewRoundTripEstimate: "none",
      executionMode: "local_only",
      client: { kind: "claude", version: "0.9.0" },
    });
    expect(() => assertLocalRefereeOutcomeSummaryPayload(payload)).not.toThrow();
    expect(() =>
      buildLocalRefereeOutcomeSummaryPayload({
        receipt: { ...receiptFixture(), contractRef: "https://example.invalid/private" },
        client: { kind: "claude", version: "0.9.0" },
      }),
    ).toThrow("safe token");
  });

  it("rejects unknown payload fields and unsafe client tokens before submission", () => {
    const payload = buildLocalRefereeOutcomeSummaryPayload({
      receipt: receiptFixture(),
      client: { kind: "test_client", version: "0.9.0" },
    });

    expect(() =>
      assertLocalRefereeOutcomeSummaryPayload({ ...payload, apiKey: "hd_secret" }),
    ).toThrow("unsupported field");
    expect(() =>
      assertLocalRefereeOutcomeSummaryPayload({
        ...payload,
        client: { ...payload.client, version: "src/index.ts" },
      }),
    ).toThrow("safe token");
    expect(() =>
      assertLocalRefereeOutcomeSummaryPayload({
        ...payload,
        controlDecisionCounts: { passed: 0, failed: 0 },
      }),
    ).toThrow("requires at least one control decision");
    expect(() =>
      assertLocalRefereeOutcomeSummaryPayload({
        ...payload,
        controlDecisionCounts: { passed: 1, failed: 1 },
      }),
    ).toThrow("completionExceptionCount must match failed decisions");
    expect(() =>
      assertLocalRefereeOutcomeSummaryPayload({
        ...payload,
        finalState: "needs_review",
      }),
    ).toThrow("finalState does not match passed decisions");
    expect(() =>
      assertLocalRefereeOutcomeSummaryPayload({
        ...payload,
        manualReviewRoundTripEstimate: "one",
      }),
    ).toThrow("manualReviewRoundTripEstimate does not match failed decisions");
  });

  it("rejects every prohibited key pattern recursively", () => {
    const prohibitedKeys = [
      "prompt",
      "source",
      "code",
      "diff",
      "file",
      "path",
      "repo",
      "repository",
      "branch",
      "terminal",
      "output",
      "log",
      "issue",
      "pr",
      "url",
      "message",
      "content",
      "hash",
    ];

    for (const key of prohibitedKeys) {
      expect(() =>
        assertLocalRefereeOutcomeSummaryPayloadIsSafe({
          safe: [{ nested: { [key]: "safe_token" } }],
        }),
      ).toThrow("prohibited field");
    }
  });

  it("rejects every prohibited value pattern recursively", () => {
    const prohibitedValues = [
      "https://example.invalid/resource",
      "git@example.invalid:team/project",
      "C:\\workspace\\project",
      "/Users/example/project",
      "/home/example/project",
      "/private/project",
      "/tmp/project",
      "/var/project",
      "/src/project",
      "/lib/project",
      "/test/project",
      "project.git",
      "BEGIN RSA PRIVATE KEY",
      "diff --git a/example b/example",
      "@@ -1 +1 @@",
      "console.log(secret)",
      "defmodule Example do",
      "function example()",
      "class Example",
    ];

    for (const value of prohibitedValues) {
      expect(() =>
        assertLocalRefereeOutcomeSummaryPayloadIsSafe({ safe: [{ nested: value }] }),
      ).toThrow("prohibited content");
    }
  });

  it("renders the share preview only after payload validation and resolves every share choice", () => {
    const payload = buildLocalRefereeOutcomeSummaryPayload({
      receipt: receiptFixture(),
      client: { kind: "test_client", version: "0.9.0" },
      executionMode: "hosted",
    });
    const preview = renderLocalRefereeOutcomeSharePreview(payload);

    expect(preview).toContain("Share this run summary with HeadsDown?");
    expect(preview).toContain("Client: test_client 0.9.0");
    expect(() =>
      renderLocalRefereeOutcomeSharePreview({
        ...payload,
        client: { ...payload.client, version: "src/index.ts" },
      }),
    ).toThrow("safe token");
    expect(shouldShareLocalRefereeOutcomeSummary({})).toBe(false);
    expect(shouldShareLocalRefereeOutcomeSummary({ config: { preference: "always_share" } })).toBe(
      true,
    );
    expect(
      shouldShareLocalRefereeOutcomeSummary({
        choice: "preview",
        config: { preference: "always_share" },
      }),
    ).toBe(false);
    expect(
      shouldShareLocalRefereeOutcomeSummary({
        choice: "keep_local",
        config: { preference: "always_share" },
      }),
    ).toBe(false);
    expect(
      shouldShareLocalRefereeOutcomeSummary({
        choice: "share_once",
        config: { preference: "local_only" },
      }),
    ).toBe(true);
    expect(
      shouldShareLocalRefereeOutcomeSummary({
        choice: "always_share",
        config: { preference: "local_only" },
      }),
    ).toBe(true);
    expect(
      shouldShareLocalRefereeOutcomeSummary({
        choice: "keep_local " as "keep_local",
        config: { preference: "always_share" },
      }),
    ).toBe(false);
  });
});

describe("Local Referee outcome submission", () => {
  it("runs the privacy filter before posting", async () => {
    const fetch = vi.fn();
    const payload = {
      ...buildLocalRefereeOutcomeSummaryPayload({
        receipt: receiptFixture(),
        client: { kind: "test_client", version: "0.9.0" },
      }),
      note: "https://example.invalid/private",
    };

    await expect(
      submitLocalRefereeOutcomeSummary(payload, { apiKey: "hd_test_key", source: "local", fetch }),
    ).rejects.toThrow("prohibited content");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts the filtered payload to the hosted endpoint", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("{}", { status: 202, headers: { "x-request-id": "req_123" } }),
      );
    const payload = buildLocalRefereeOutcomeSummaryPayload({
      receipt: receiptFixture(),
      client: { kind: "test_client", version: "0.9.0" },
    });

    await expect(
      submitLocalRefereeOutcomeSummary(payload, {
        apiKey: "hd_test_key",
        baseUrl: "https://example.invalid///",
        source: "hosted",
        fetch,
      }),
    ).resolves.toEqual({ ok: true, status: 202, requestId: "req_123" });

    expect(fetch).toHaveBeenCalledWith(
      "https://example.invalid/v1/referee/outcomes",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer hd_test_key",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ source: "hosted", payload }),
      }),
    );
  });

  it("returns endpoint_unavailable when the endpoint is unavailable", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    const payload = buildLocalRefereeOutcomeSummaryPayload({
      receipt: receiptFixture(),
      client: { kind: "test_client", version: "0.9.0" },
    });

    await expect(
      submitLocalRefereeOutcomeSummary(payload, { apiKey: "hd_test_key", source: "local", fetch }),
    ).resolves.toEqual({
      ok: false,
      reason: "endpoint_unavailable",
      status: 404,
      requestId: undefined,
    });
  });

  it("rejects invalid source values before posting", async () => {
    const fetch = vi.fn();
    const payload = buildLocalRefereeOutcomeSummaryPayload({
      receipt: receiptFixture(),
      client: { kind: "test_client", version: "0.9.0" },
    });

    await expect(
      submitLocalRefereeOutcomeSummary(payload, {
        apiKey: "hd_test_key",
        source: "src/index.ts" as "local",
        fetch,
      }),
    ).rejects.toThrow("source must be local or hosted");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires an API key before hosted submission", async () => {
    const original = process.env.HEADSDOWN_API_KEY;
    try {
      delete process.env.HEADSDOWN_API_KEY;
      const payload = buildLocalRefereeOutcomeSummaryPayload({
        receipt: receiptFixture(),
        client: { kind: "test_client", version: "0.9.0" },
      });
      await expect(
        submitLocalRefereeOutcomeSummary(payload, { source: "local", fetch: vi.fn() }),
      ).rejects.toThrow(AuthError);
    } finally {
      if (original) process.env.HEADSDOWN_API_KEY = original;
    }
  });
});

describe("Local Referee import purity", () => {
  it("keeps pure referee modules away from filesystem network and SDK client dependencies", async () => {
    const refereeDir = join(process.cwd(), "src", "referee");
    const files = (await readdir(refereeDir)).filter(
      (file) => file.endsWith(".ts") && file !== "submit.ts",
    );

    for (const file of files) {
      const source = await readFile(join(refereeDir, file), "utf-8");
      const importLines = source
        .split("\n")
        .filter((line) => line.trim().startsWith("import"))
        .join("\n");

      expect(importLines, file).not.toMatch(
        /from ["']node:(?:fs|child_process|http|https|net)["']/,
      );
      expect(importLines, file).not.toMatch(/from ["'][^"']*client[^"']*["']/i);
      expect(source, file).not.toMatch(/\bfetch\b/);
    }
  });

  it("publishes the focused referee subpath export and curated root exports", async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf-8"));

    expect(packageJson.exports["./referee"]).toEqual({
      types: "./dist/referee/index.d.ts",
      import: "./dist/referee/index.js",
    });

    const rootExports = rootSdk as Record<string, unknown>;
    const refereeExports = refereeSdk as Record<string, unknown>;
    for (const name of Object.keys(refereeExports)) {
      expect(rootExports[name], name).toBe(refereeExports[name]);
    }
  });
});
