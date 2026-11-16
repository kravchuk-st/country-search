import type { ApiCountry, CountryCard } from './types.js';

const NO_VALUE = '—';

export function mapCountryResponse(raw: ApiCountry): CountryCard {
  return {
    name: raw.name,
    flagUrl: raw.flags?.svg || raw.flags?.png || '',
    capital: raw.capital?.trim() || NO_VALUE,
    region: raw.region,
    population: raw.population,
    languages: (raw.languages ?? []).map((language) => language.name),
  };
}
