/**
 * Cities the app can be pointed at. Only Berlin has listings in the database
 * right now — the others are here so the header dropdown is real and the map
 * can already re-centre, and every screen says plainly when a city is empty.
 */
export interface City {
  id: string;
  /** Shown in the headline and the dropdown. */
  name: string;
  /** Map view centred on the city. */
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  /** True when the event database covers this city. */
  hasListings: boolean;
}

export const CITIES: City[] = [
  {
    id: 'berlin',
    name: 'Berlin',
    region: { latitude: 52.505, longitude: 13.42, latitudeDelta: 0.11, longitudeDelta: 0.11 },
    hasListings: true,
  },
  {
    id: 'munich',
    name: 'Munich',
    region: { latitude: 48.1372, longitude: 11.5755, latitudeDelta: 0.1, longitudeDelta: 0.1 },
    hasListings: false,
  },
  {
    id: 'hamburg',
    name: 'Hamburg',
    region: { latitude: 53.5511, longitude: 9.9937, latitudeDelta: 0.12, longitudeDelta: 0.12 },
    hasListings: false,
  },
  {
    id: 'london',
    name: 'London',
    region: { latitude: 51.5072, longitude: -0.1276, latitudeDelta: 0.16, longitudeDelta: 0.16 },
    hasListings: false,
  },
];

export const DEFAULT_CITY_ID = CITIES[0].id;

export function cityById(id: string): City {
  return CITIES.find((city) => city.id === id) ?? CITIES[0];
}
