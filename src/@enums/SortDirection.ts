export const SortDirection = {
  Asc: 'asc',
  Desc: 'desc',
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];
