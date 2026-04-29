import { describe, expect, it } from "vitest";
import { HEADSDOWN_ACTION_KEYS, HEADSDOWN_CALL_KEYS } from "../src/index.js";

describe("agent-control type constants", () => {
  it("exports canonical HeadsDown call keys", () => {
    expect(HEADSDOWN_CALL_KEYS).toEqual([
      "good_to_run",
      "keep_it_tight",
      "attention_window_closing",
      "not_worth_starting_now",
      "off_the_clock",
      "finish_line_friction",
      "rabbit_hole_detected",
      "ready_to_resume",
      "all_contained",
      "needs_your_yes",
    ]);
  });

  it("exports canonical HeadsDown action keys", () => {
    expect(HEADSDOWN_ACTION_KEYS).toEqual([
      "continue",
      "continue_with_limit",
      "narrow_scope",
      "ask_user",
      "queue_for_later",
      "queue_for_morning",
      "pause_and_summarize",
      "stop_run",
      "resume_run",
      "allow_once",
      "allow_for_duration",
      "create_temporary_exception",
      "keep_queued",
    ]);
  });

  it("keeps exported keys unique", () => {
    expect(new Set(HEADSDOWN_CALL_KEYS).size).toBe(HEADSDOWN_CALL_KEYS.length);
    expect(new Set(HEADSDOWN_ACTION_KEYS).size).toBe(HEADSDOWN_ACTION_KEYS.length);
  });
});
