/**
 * Hex mirrors of the palette in `global.css`.
 *
 * React Native cannot parse `oklch(...)`, so any colour passed outside of
 * `className` (icon props, navigation tints, map markers) must come from here.
 */
export const palette = {
  canvas: '#FCFAFB',
  card: '#FFFFFF',
  surface: '#F5F1F3',
  ink: '#1A1418',
  inkSoft: '#6E656B',
  inkFaint: '#9E959B',
  line: '#EDE8EA',
  lineStrong: '#DFD8DC',
  brand: '#FF0085',
  brandDeep: '#4A0026',
  brandTint: '#FFF0F6',
  brandTintStrong: '#FFD1E4',
} as const;
