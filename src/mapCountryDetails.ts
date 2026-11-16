import { mapCountryResponse } from './mapCountryResponse.js';
import type { ApiCountry, CountryDetails, Currency, Language } from './types.js';

const formatLanguage = ({ name, nativeName }: Language): string =>
  nativeName && nativeName !== name ? `${name} (${nativeName})` : name;

const formatCurrency = ({ code, name, symbol }: Currency): string =>
  symbol ? `${name} (${code}, ${symbol})` : `${name} (${code})`;

function describe(raw: ApiCountry): string {
  const title = raw.nativeName && raw.nativeName !== raw.name ? `${raw.name} (${raw.nativeName})` : raw.name;
  const place = [...new Set([raw.subregion, raw.region].filter(Boolean))].join(', ');
  const sentence = place ? `${title} is a country in ${place}.` : `${title} is a country.`;

  return raw.demonym ? `${sentence} Demonym: ${raw.demonym}.` : sentence;
}

export function mapCountryDetails(raw: ApiCountry): CountryDetails {
  return {
    ...mapCountryResponse(raw),
    description: describe(raw),
    area: raw.area ?? null,
    borders: raw.borders ?? [],
    languages: (raw.languages ?? []).map(formatLanguage),
    currencies: (raw.currencies ?? []).map(formatCurrency),
  };
}
