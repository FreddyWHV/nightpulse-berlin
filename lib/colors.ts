/**
 * Hex mirrors of the palette in `global.css`.
 *
 * React Native cannot parse `oklch(...)`, so any colour passed outside of
 * `className` (icon props, navigation tints, map markers) must come from here.
 */
export const palette = {
  canvas: '#FBFAFD',
  card: '#FFFFFF',
  surface: '#F3F2F8',
  ink: '#17151F',
  inkSoft: '#6B6880',
  inkFaint: '#9B98AC',
  line: '#ECEAF2',
  lineStrong: '#DEDBE8',
  brand: '#7C3AED',
  brandDeep: '#2C1064',
  brandTint: '#F5F1FE',
  brandTintStrong: '#E7DEFC',
} as const;
