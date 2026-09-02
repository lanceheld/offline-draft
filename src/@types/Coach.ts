export interface Coach {
  id: string;
  name: string;
  /** 1-indexed slot in the snake draft order, unique across coaches. Gaps are allowed and represent untracked "other" draft slots. */
  draftPosition: number;
}
