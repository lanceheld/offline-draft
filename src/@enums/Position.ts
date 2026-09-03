export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DP', 'DST', 'HC'] as const;

export type Position = (typeof POSITIONS)[number];
