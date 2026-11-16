import { describe, expect, it } from 'vitest';
import { spainResponse } from './fixtures/spain.js';
import { mapCountryDetails } from './mapCountryDetails.js';
import type { ApiCountry } from './types.js';

const spain = spainResponse[0] as ApiCountry;
const country = (overrides: Partial<ApiCountry> = {}): ApiCountry => ({ ...spain, ...overrides });

describe('mapCountryDetails', () => {
  it('maps a full API country to details data', () => {
    expect(mapCountryDetails(spain)).toEqual({
      name: 'Spain',
      flagUrl: 'https://flagcdn.com/es.svg',
      description: 'Spain (España) is a country in Southern Europe, Europe. Demonym: Spanish.',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      languages: ['Spanish (Español)'],
      currencies: ['Euro (EUR, €)'],
    });
  });

  describe('description', () => {
    it('leaves out the native name when it equals the name', () => {
      expect(mapCountryDetails(country({ name: 'Japan', nativeName: 'Japan' })).description).toContain('Japan is a');
    });

    it('leaves out the native name when it is missing', () => {
      expect(mapCountryDetails(country({ nativeName: undefined })).description).toMatch(/^Spain is a country/);
    });

    it('leaves out the demonym when it is missing', () => {
      expect(mapCountryDetails(country({ demonym: undefined })).description).not.toContain('Demonym');
    });

    it('names only the region when there is no subregion', () => {
      expect(mapCountryDetails(country({ subregion: undefined })).description).toContain('is a country in Europe.');
    });

    it('does not repeat the subregion when it equals the region', () => {
      expect(mapCountryDetails(country({ subregion: 'Europe' })).description).toContain('is a country in Europe.');
    });

    it('stays a valid sentence when there is no place information at all', () => {
      const details = mapCountryDetails(country({ subregion: undefined, region: '', demonym: undefined }));

      expect(details.description).toBe('Spain (España) is a country.');
    });
  });

  describe('optional data', () => {
    it('uses null for a missing area and empty lists for missing borders', () => {
      const details = mapCountryDetails(country({ area: undefined, borders: undefined }));

      expect(details.area).toBeNull();
      expect(details.borders).toEqual([]);
    });

    it('lists a language without a native name by its name only', () => {
      expect(mapCountryDetails(country({ languages: [{ name: 'Catalan' }] })).languages).toEqual(['Catalan']);
    });

    it('leaves out the native name of a language when it equals the name', () => {
      const languages = [{ name: 'Basque', nativeName: 'Basque' }];

      expect(mapCountryDetails(country({ languages })).languages).toEqual(['Basque']);
    });

    it('formats a currency without a symbol', () => {
      expect(
        mapCountryDetails(country({ currencies: [{ code: 'XDR', name: 'Special drawing rights' }] })).currencies,
      ).toEqual(['Special drawing rights (XDR)']);
    });

    it.each([
      ['languages', { languages: undefined }],
      ['currencies', { currencies: undefined }],
    ])('returns an empty list when %s are missing', (field, overrides) => {
      const details = mapCountryDetails(country(overrides));

      expect(details[field as 'languages' | 'currencies']).toEqual([]);
    });
  });

  it('does not mutate the input', () => {
    const input = country();
    const snapshot = structuredClone(input);

    mapCountryDetails(input);

    expect(input).toEqual(snapshot);
  });
});
