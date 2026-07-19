/** Shared geometry types for the scene layers. */
export type Rect = { x: number; y: number; w: number; h: number; r: number };
export type Dir = 'south' | 'west' | 'north' | 'east';
export const DIR_BY_REL: Dir[] = ['south', 'west', 'north', 'east'];
