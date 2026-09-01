export const SortableColumn = {
  Rank: 'rank',
  Position: 'position',
  Name: 'name',
  Team: 'team',
  Bye: 'bye',
} as const;

export type SortableColumn =
  (typeof SortableColumn)[keyof typeof SortableColumn];
