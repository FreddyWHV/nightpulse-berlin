/**
 * Hex mirrors of the palette in `global.css`.
 *
 * React Native cannot parse `oklch(...)`, so any colour passed outside of
 * `className` (icon props, navigation tints, map markers) must come from here.
 */
export const palette = {
  canvas: '#F9FCFA',
  card: '#FFFFFF',
  surface: '#F1F6F2',
  ink: '#141A16',
  inkSoft: '#66706A',
  inkFaint: '#959E98',
  line: '#E8EDEA',
  lineStrong: '#D8DFDB',
  /** Signal colour — fills, map pins, selected pills. Too light for text. */
  brand: '#00DD8A',
  /** Darker green for brand coloured text and small icons on light surfaces. */
  brandInk: '#007E4E',
  /** Near-black green used for labels and icons sitting on `brand`. */
  onBrand: '#072618',
  brandDeep: '#003B1D',
  brandTint: '#E3FAEC',
  brandTintStrong: '#AEEFCE',
} as const;
