/** Get the user's active availability contract. */
export const ACTIVE_CONTRACT_QUERY = `
  query ActiveContract {
    activeContract {
      id
      mode
      status
      statusEmoji
      statusText
      afk
      autoRespond
      lock
      duration
      expiresAt
      insertedAt
      recordMessages
      snooze
    }
  }
`;

/** Get the user's current work schedule. */
export const CALENDAR_QUERY = `
  query Calendar {
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

/** Get both contract and calendar in a single request. */
export const AVAILABILITY_QUERY = `
  query Availability {
    activeContract {
      id
      mode
      status
      statusEmoji
      statusText
      afk
      autoRespond
      lock
      duration
      expiresAt
      insertedAt
      recordMessages
      snooze
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
      alerts
      presence
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
      afk
      autoRespond
      lock
      duration
      expiresAt
      insertedAt
      recordMessages
      snooze
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
      afk
      autoRespond
      lock
      duration
      expiresAt
      insertedAt
      recordMessages
      snooze
    }
  }
`;

/** Get the authenticated user's profile. */
export const PROFILE_QUERY = `
  query Profile {
    profile {
      id
      name
      email
      avatar
      location
    }
  }
`;
