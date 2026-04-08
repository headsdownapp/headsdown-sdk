/** Get the user's active availability contract. */
export const ACTIVE_CONTRACT_QUERY = `
  query ActiveContract {
    activeContract {
      id
      mode
      status
      statusEmoji
      statusText
      autoRespond
      lock
      duration
      ruleSetType
      ruleSetParams
      expiresAt
      insertedAt
    }
  }
`;

/** Get the user's current work schedule. */
export const CALENDAR_QUERY = `
  query Calendar($at: DateTime) {
    calendar(at: $at) {
      automateEndOfDay
      automateStartOfDay
      day
      endsAt
      nextWorkday
      nextWorkdayStartsAt
      now
      offHours
      startsAt
      workHours
      working
    }
  }
`;

/** Get both contract and calendar in a single request. */
export const AVAILABILITY_QUERY = `
  query Availability {
    activeContract {
      id
      mode
      status
      statusEmoji
      statusText
      autoRespond
      lock
      duration
      ruleSetType
      ruleSetParams
      expiresAt
      insertedAt
    }
    calendar {
      automateEndOfDay
      automateStartOfDay
      day
      endsAt
      nextWorkday
      nextWorkdayStartsAt
      now
      offHours
      startsAt
      workHours
      working
    }
  }
`;

/** Submit a task proposal for verdict evaluation. */
export const SUBMIT_PROPOSAL_MUTATION = `
  mutation SubmitProposal($input: ProposalInput!) {
    submitProposal(input: $input) {
      decision
      reason
      proposalId
      evaluatedAt
    }
  }
`;

/** List previously submitted proposals. */
export const LIST_PROPOSALS_QUERY = `
  query Proposals($verdict: VerdictDecision, $latest: Int) {
    proposals(verdict: $verdict, latest: $latest) {
      id
      agentRef
      model
      framework
      description
      estimatedFiles
      estimatedMinutes
      scopeSummary
      sourceRef
      verdict
      verdictReason
      insertedAt
    }
  }
`;

/** List saved availability presets. */
export const LIST_PRESETS_QUERY = `
  query Presets {
    presets {
      id
      name
      status
      statusEmoji
      statusText
      duration
      insertedAt
      updatedAt
    }
  }
`;

/** Apply a preset to create a new contract. */
export const APPLY_PRESET_MUTATION = `
  mutation ApplyPreset($id: ID!) {
    applyPreset(id: $id) {
      id
      mode
      status
      statusEmoji
      statusText
      autoRespond
      lock
      duration
      ruleSetType
      ruleSetParams
      expiresAt
      insertedAt
    }
  }
`;

/** Create a new availability contract. */
export const CREATE_CONTRACT_MUTATION = `
  mutation CreateContract($input: ContractInput!) {
    createContract(input: $input) {
      id
      mode
      status
      statusEmoji
      statusText
      autoRespond
      lock
      duration
      ruleSetType
      ruleSetParams
      expiresAt
      insertedAt
    }
  }
`;

/** Get the authenticated user's profile. */
export const PROFILE_QUERY = `
  query Profile {
    profile {
      id
      name
      handle
      email
      avatar
      timezone
      visibilityLevel
      showStatusMessage
      confirmedAt
      location
      insertedAt
      updatedAt
    }
  }
`;

/** Override a verdict decision. */
export const OVERRIDE_VERDICT_MUTATION = `
  mutation OverrideVerdict($input: OverrideInput!) {
    overrideVerdict(input: $input) {
      id
      originalVerdict
      overrideVerdict
      reason
      proposalId
      insertedAt
    }
  }
`;

/** Evaluate whether interrupting a user is allowed. */
export const EVALUATE_INTERRUPT_QUERY = `
  query EvaluateInterrupt($handle: String!) {
    evaluateInterrupt(handle: $handle) {
      allowed
      reason
      autoResponse
    }
  }
`;

/** List calibration profiles for the current user. */
export const CALIBRATION_PROFILES_QUERY = `
  query CalibrationProfiles {
    calibrationProfiles {
      id
      model
      framework
      sampleSize
      medianDurationMinutes
      successRate
      overrideRate
      p25DurationMinutes
      p75DurationMinutes
      durationCiLower
      durationCiUpper
      successRateCiLower
      successRateCiUpper
      confidenceLevel
      tier
      status
      tasksToHighConfidence
      insertedAt
      updatedAt
    }
  }
`;

/** Get the current verdict evaluation settings. */
export const VERDICT_SETTINGS_QUERY = `
  query VerdictSettings {
    verdictSettings {
      id
      modeThresholds
      insertedAt
      updatedAt
    }
  }
`;

/** Update verdict evaluation settings. */
export const UPDATE_VERDICT_SETTINGS_MUTATION = `
  mutation UpdateVerdictSettings($modeThresholds: JSON!) {
    updateVerdictSettings(modeThresholds: $modeThresholds) {
      id
      modeThresholds
      insertedAt
      updatedAt
    }
  }
`;

/** Get the user's calendar at a specific time (combined query). */
export const AVAILABILITY_AT_QUERY = `
  query AvailabilityAt($at: DateTime) {
    activeContract {
      id
      mode
      status
      statusEmoji
      statusText
      autoRespond
      lock
      duration
      ruleSetType
      ruleSetParams
      expiresAt
      insertedAt
    }
    calendar(at: $at) {
      automateEndOfDay
      automateStartOfDay
      day
      endsAt
      nextWorkday
      nextWorkdayStartsAt
      now
      offHours
      startsAt
      workHours
      working
    }
  }
`;

/** List digest summaries (notifications aggregated during focus time). */
export const DIGEST_SUMMARIES_QUERY = `
  query DigestSummaries($latest: Int) {
    digestSummaries(latest: $latest) {
      id
      actorRef
      actorLabel
      sourceType
      action
      channelRef
      events {
        description
        insertedAt
      }
      entryCount
      firstEventAt
      lastEventAt
    }
  }
`;

/** Report a task outcome (insert or update). */
export const REPORT_OUTCOME_MUTATION = `
  mutation ReportOutcome($input: OutcomeInput!) {
    reportOutcome(input: $input) {
      id
      outcome
      actualDurationMinutes
      filesModified
      linesChanged
      errorCategory
      testsPassed
      tokensUsed
      retryCount
      turnCount
      scopeChanged
      redirectCount
      distinctTaskCount
      dataQualityScore
      insertedAt
    }
  }
`;
