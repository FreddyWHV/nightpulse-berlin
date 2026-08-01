/**
 * Hex mirrors of the palette in `global.css`.
 *
 * React Native cannot parse `oklch(...)`, so any colour passed outside of
 * `className` (icon props, navigation tints, map markers) must come from here.
 */
export const palette = {
  canvas: '#FAFAFC',
  card: '#FFFFFF',
  ink: '#17151F',
  inkSoft: '#6B6880',
  inkFaint: '#9B98AC',
  line: '#EAE8F0',
  lineStrong: '#DCD9E6',
  brand: '#7C3AED',
  brandDeep: '#3B1E7A',
  brandTint: '#F5F1FE',
  brandTintStrong: '#E9E1FC',
} as const;
