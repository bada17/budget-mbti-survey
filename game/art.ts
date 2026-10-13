/** Kenney RPG Urban Pack, original packed atlas: 27 columns of 16px tiles. */
export const ATLAS_URL = new URL('./assets/urban.png', import.meta.url).href;
export const tile = (column: number, row: number) => row * 27 + column;
export const ART = {
  tileSize: 16, playerRow: 0,
  residents: [[1, 4, 7], [3, 6, 9], [8, 2, 5], [10, 13, 16], [11, 14, 17]],
  face: { down: 23, right: 24, up: 25, left: 26 },
  tree: [tile(16, 8), tile(16, 9)],
  bench: [tile(6, 9), tile(7, 9)],
  flower: tile(6, 10), lamp: tile(5, 6), bin: tile(9, 10),
} as const;
