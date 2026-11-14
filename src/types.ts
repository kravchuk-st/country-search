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
