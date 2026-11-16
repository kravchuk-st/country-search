import { describe, expect, it } from 'vitest';
import { spainResponse } from './fixtures/spain.js';
import { mapCountryResponse } from './mapCountryResponse.js';
import type { ApiCountry } from './types.js';

const spain = spainResponse[0] as ApiCountry;
const country = (overrides: Partial<ApiCountry> = {}): ApiCountry => ({ ...spain, ...overrides });

describe('mapCountryResponse', () => {
  it('maps a full API country to card data', () => {
    expect(mapCountryResponse(spain)).toEqual({
      name: 'Spain',
      flagUrl: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      languages: ['Spanish'],
    });
  });

  describe('flagUrl', () => {
    it('prefers the svg flag', () => {
      expect(mapCountryResponse(country()).flagUrl).toBe('https://flagcdn.com/es.svg');
    });

    it.each([
      ['svg is missing', { png: 'https://flagcdn.com/w320/es.png' }],
      ['svg is empty', { svg: '', png: 'https://flagcdn.com/w320/es.png' }],
    ])('falls back to the png flag when %s', (_case, flags) => {
      expect(mapCountryResponse(country({ flags })).flagUrl).toBe('https://flagcdn.com/w320/es.png');
    });

    it.each([
      ['flags is missing', undefined],
      ['flags is empty', {}],
    ])('is an empty string when %s', (_case, flags) => {
      expect(mapCountryResponse(country({ flags })).flagUrl).toBe('');
    });
  });

  describe('capital', () => {
    it.each([
      ['missing', undefined],
      ['empty', ''],
      ['blank', '   '],
    ])('is a dash when the capital is %s', (_case, capital) => {
      expect(mapCountryResponse(country({ capital })).capital).toBe('—');
    });
  });

  describe('languages', () => {
    it('lists language names in the original order', () => {
      const languages = [{ name: 'Catalan' }, { name: 'Spanish' }, { name: 'Basque' }];

      expect(mapCountryResponse(country({ languages })).languages).toEqual(['Catalan', 'Spanish', 'Basque']);
    });

    it.each([
      ['missing', undefined],
      ['empty', []],
    ])('is an empty list when languages are %s', (_case, languages) => {
      expect(mapCountryResponse(country({ languages })).languages).toEqual([]);
    });
  });

  it('does not mutate the input', () => {
    const input = country();
    const snapshot = structuredClone(input);

    mapCountryResponse(input);

    expect(input).toEqual(snapshot);
  });
});
