/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryData {
  name: string;
  commonName: string;
  capital: string;
  population: number;
  languages: string[];
  region: string;
  subregion: string;
  flag: string;
  currency: string;
  latlng: [number, number];
  cca2: string;
  cca3: string;
  currencyCode?: string;
  currencyName?: string;
}

export interface GlobeGeoJSON {
  type: string;
  features: Array<{
    type: string;
    properties: {
      NAME: string;
      ISO_A2: string;
      ISO_A3: string;
    };
    geometry: any;
  }>;
}
