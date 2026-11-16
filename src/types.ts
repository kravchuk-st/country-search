export interface Currency {
  code: string;
  name: string;
  symbol?: string;
}

export interface Language {
  name: string;
  iso639_1?: string;
  iso639_2?: string;
  nativeName?: string;
}

export interface ApiCountry {
  name: string;
  nativeName?: string;
  alpha2Code: string;
  alpha3Code: string;
  capital?: string;
  demonym?: string;
  region: string;
  subregion?: string;
  population: number;
  area?: number;
  borders?: string[];
  currencies?: Currency[];
  languages?: Language[];
  flag?: string;
  flags?: { svg?: string; png?: string };
  maps?: { googleMaps?: string; openStreetMaps?: string };
}

export interface CountryCard {
  name: string;
  flagUrl: string;
  capital: string;
  region: string;
  population: number;
  languages: string[];
}

export interface CountryDetails extends CountryCard {
  description: string;
  area: number | null;
  borders: string[];
  currencies: string[];
}
