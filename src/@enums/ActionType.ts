export const ActionType = {
  Hydrate: 'HYDRATE',
  ImportPlayers: 'IMPORT_PLAYERS',
  SetDraftedBy: 'SET_DRAFTED_BY',
  SetDraftedOther: 'SET_DRAFTED_OTHER',
  AddCoach: 'ADD_COACH',
  RenameCoach: 'RENAME_COACH',
  RemoveCoach: 'REMOVE_COACH',
  SetActiveCoach: 'SET_ACTIVE_COACH',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];
