export const ActionType = {
  Hydrate: 'HYDRATE',
  ImportPlayers: 'IMPORT_PLAYERS',
  SetDraftedBy: 'SET_DRAFTED_BY',
  SetDraftedOther: 'SET_DRAFTED_OTHER',
  AddCoach: 'ADD_COACH',
  RenameCoach: 'RENAME_COACH',
  RemoveCoach: 'REMOVE_COACH',
  SetActiveCoach: 'SET_ACTIVE_COACH',
  SetCoachDraftPosition: 'SET_COACH_DRAFT_POSITION',
  SetTotalCoaches: 'SET_TOTAL_COACHES',
  SetRosterLimits: 'SET_ROSTER_LIMITS',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];
