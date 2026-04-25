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

/** Get the user's current schedule resolution. */
export const SCHEDULE_QUERY = `
  query Schedule($at: DateTime) {
    schedule: availability(at: $at) {
      inReachableHours
      nextTransitionAt
      attentionDeadlineAt
      wrapUpGuidance {
        active
        deadlineAt
        remainingMinutes
        profile
        source
        reason
        hints
        thresholdMinutes
        selectedMode
      }
      activeWindow {
        id
        label
        priority
        startTime
        endTime
        days
        mode
        alertsPolicy
        snooze
        status
        statusEmoji
        statusText
        autoActivate
      }
      nextWindow {
        id
        label
        priority
        startTime
        endTime
        days
        mode
        alertsPolicy
        snooze
        status
        statusEmoji
        statusText
        autoActivate
      }
    }
  }
`;

/** Get the agent-control overview read model for HeadsDown call rendering. */
export const AGENT_CONTROL_OVERVIEW_QUERY = `
  query AgentControlOverview {
    agentControlOverview {
      currentCall {
        callKey
        title
        body
        primaryActionLabel
        primaryActionIntent
        secondaryActionLabel
        secondaryActionIntent
        recommendedActionKey
        allowedActionKeys
        reasonCodes
        dataState
        evaluatedAt
      }
      headsdownCall {
        key
        knownKey
        title
        body
        severity
        urgency
        primaryActionLabel
        primaryActionKey
        primaryActionKnownKey
        primaryActionIntent
        secondaryActionLabel
        secondaryActionKey
        secondaryActionKnownKey
        secondaryActionIntent
        recommendedActionKey
        recommendedActionKnownKey
        allowedActionKeys
        allowedActionKnownKeys
        allowedUiIntents
        reasonCodes
        confidence
        evidenceSource
        privacyMode
        expiresAt
      }
      needsYourYes {
        runId
        callKey
        title
        body
        itemState
        primaryActionLabel
        primaryActionIntent
        recommendedActionKey
        allowedActionKeys
        reasonCodes
        dataState
        createdAt
        updatedAt
      }
      needsYourYesState
      runSummaries {
        runId
        callKey
        runState
        actionState
        clientLabel
        safeTitle
        recommendedActionKey
        allowedActionKeys
        reasonCodes
        elapsedSeconds
        deadlineState
        budgetState
        nextActionLabel
        nextActionIntent
        dataState
        detailsState
        progressState
        insertedAt
        updatedAt
      }
      runSummariesState
      valueMetrics {
        metricKey
        label
        value
        unit
        confidence
        evidenceCount
        explanation
        dataState
      }
      valueMetricsState
      generatedAt
    }
  }
`;

/** Get both contract and schedule in a single request. */
export const AVAILABILITY_QUERY = `
  query Availability($at: DateTime) {
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
    schedule: availability(at: $at) {
      inReachableHours
      nextTransitionAt
      attentionDeadlineAt
      wrapUpGuidance {
        active
        deadlineAt
        remainingMinutes
        profile
        source
        reason
        hints
        thresholdMinutes
        selectedMode
      }
      activeWindow {
        id
        label
        priority
        startTime
        endTime
        days
        mode
        alertsPolicy
        snooze
        status
        statusEmoji
        statusText
        autoActivate
      }
      nextWindow {
        id
        label
        priority
        startTime
        endTime
        days
        mode
        alertsPolicy
        snooze
        status
        statusEmoji
        statusText
        autoActivate
      }
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
      wrapUpGuidance {
        active
        deadlineAt
        remainingMinutes
        profile
        source
        reason
        hints
        thresholdMinutes
        selectedMode
      }
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
      deliveryMode
      verdict
      verdictReason
      wrapUpGuidance {
        active
        deadlineAt
        remainingMinutes
        profile
        source
        reason
        hints
        thresholdMinutes
        selectedMode
      }
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

/** Create a delegation grant for actor-scoped authorization. */
export const CREATE_DELEGATION_GRANT_MUTATION = `
  mutation CreateDelegationGrant($input: DelegationGrantInput!) {
    createDelegationGrant(input: $input) {
      id
      scope
      sessionId
      workspaceRef
      agentId
      permissions
      source
      expiresAt
      revokedAt
      expiredAt
      createdById
      revokedById
      insertedAt
      updatedAt
    }
  }
`;

/** List delegation grants, optionally filtered. */
export const LIST_DELEGATION_GRANTS_QUERY = `
  query DelegationGrants($filter: DelegationGrantFilterInput) {
    delegationGrants(filter: $filter) {
      id
      scope
      sessionId
      workspaceRef
      agentId
      permissions
      source
      expiresAt
      revokedAt
      expiredAt
      createdById
      revokedById
      insertedAt
      updatedAt
    }
  }
`;

/** List active delegation grants. */
export const ACTIVE_DELEGATION_GRANTS_QUERY = `
  query ActiveDelegationGrants {
    activeDelegationGrants {
      id
      scope
      sessionId
      workspaceRef
      agentId
      permissions
      source
      expiresAt
      revokedAt
      expiredAt
      createdById
      revokedById
      insertedAt
      updatedAt
    }
  }
`;

/** Revoke a single delegation grant. */
export const REVOKE_DELEGATION_GRANT_MUTATION = `
  mutation RevokeDelegationGrant($id: ID!) {
    revokeDelegationGrant(id: $id) {
      id
      scope
      sessionId
      workspaceRef
      agentId
      permissions
      source
      expiresAt
      revokedAt
      expiredAt
      createdById
      revokedById
      insertedAt
      updatedAt
    }
  }
`;

/** Revoke delegation grants in bulk, optionally filtered. */
export const REVOKE_DELEGATION_GRANTS_MUTATION = `
  mutation RevokeDelegationGrants($filter: DelegationGrantFilterInput) {
    revokeDelegationGrants(filter: $filter) {
      revokedCount
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
      thresholds {
        online {
          maxFiles
          maxEstimatedMinutes
        }
        busy {
          maxFiles
          maxEstimatedMinutes
        }
        limited {
          maxFiles
          maxEstimatedMinutes
        }
        offline {
          maxFiles
          maxEstimatedMinutes
        }
      }
      defaultWrapUpMode
      wrapUpThresholdMinutes
      insertedAt
      updatedAt
    }
  }
`;

/** Update verdict evaluation settings. */
export const UPDATE_VERDICT_SETTINGS_MUTATION = `
  mutation UpdateVerdictSettings($thresholds: VerdictModeThresholdsInput, $defaultWrapUpMode: WrapUpMode, $wrapUpThresholdMinutes: Int) {
    updateVerdictSettings(thresholds: $thresholds, defaultWrapUpMode: $defaultWrapUpMode, wrapUpThresholdMinutes: $wrapUpThresholdMinutes) {
      id
      thresholds {
        online {
          maxFiles
          maxEstimatedMinutes
        }
        busy {
          maxFiles
          maxEstimatedMinutes
        }
        limited {
          maxFiles
          maxEstimatedMinutes
        }
        offline {
          maxFiles
          maxEstimatedMinutes
        }
      }
      defaultWrapUpMode
      wrapUpThresholdMinutes
      insertedAt
      updatedAt
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
