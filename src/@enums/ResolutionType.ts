export const ResolutionType = {
  Other: 'other',
  Undrafted: 'undrafted',
} as const;

export type ResolutionType =
  (typeof ResolutionType)[keyof typeof ResolutionType];
