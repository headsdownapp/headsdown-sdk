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

/** Dismiss a digest summary entry. */
export const DISMISS_DIGEST_ENTRY_MUTATION = `
  mutation DismissDigestEntry($id: ID!) {
    dismissDigestEntry(id: $id) {
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

/** List API keys for the current user. */
export const API_KEYS_QUERY = `
  query ApiKeys {
    apiKeys {
      id
      prefix
      label
      lastUsedAt
      insertedAt
    }
  }
`;

/** Create a new API key. */
export const CREATE_API_KEY_MUTATION = `
  mutation CreateApiKey($label: String!) {
    createApiKey(label: $label) {
      rawKey
      apiKey {
        id
        prefix
        label
        lastUsedAt
        insertedAt
      }
    }
  }
`;

/** Revoke an API key by id. */
export const REVOKE_API_KEY_MUTATION = `
  mutation RevokeApiKey($id: ID!) {
    revokeApiKey(id: $id) {
      id
      prefix
      label
      lastUsedAt
      insertedAt
    }
  }
`;

/** Get current auto-responder settings. */
export const AUTO_RESPONDER_SETTINGS_QUERY = `
  query AutoResponderSettings {
    autoResponderSettings {
      id
      busyText
      limitedText
      offlineText
      insertedAt
      updatedAt
    }
  }
`;

/** Update auto-responder settings. */
export const UPDATE_AUTO_RESPONDER_SETTINGS_MUTATION = `
  mutation UpdateAutoResponderSettings($busyText: String, $limitedText: String, $offlineText: String) {
    updateAutoResponderSettings(busyText: $busyText, limitedText: $limitedText, offlineText: $offlineText) {
      id
      busyText
      limitedText
      offlineText
      insertedAt
      updatedAt
    }
  }
`;

/** List teams for current user, optionally filtered by team id. */
export const TEAMS_QUERY = `
  query Teams($id: ID) {
    teams(id: $id) {
      id
      name
      icon
      description
      members {
        id
        email
        name
        location
        avatar
      }
    }
  }
`;

/** Get company for current user. */
export const COMPANY_QUERY = `
  query Company {
    company {
      id
      name
      teams {
        id
        name
        icon
        description
      }
    }
  }
`;

/** List currently online presence entries for a team. */
export const TEAM_PRESENCE_QUERY = `
  query TeamPresence($teamId: ID!) {
    teamPresence(teamId: $teamId) {
      userId
      onlineAt
      connectionType
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
