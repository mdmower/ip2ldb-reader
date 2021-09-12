import {CountryInfoReader} from './country-info-reader';
import fs from 'fs';
import {CountryInfoData} from './interfaces';

// Requires "more information" country info CSV database from
// https://www.ip2location.com/free/country-information
// to be decompressed and made available in /database folder within project directory.
const countryInfoDbPath = 'database/IP2LOCATION-COUNTRY-INFORMATION.CSV';
const conditionalDescribe = fs.existsSync(countryInfoDbPath) ? describe : describe.skip;

describe('Country info', () => {
  conditionalDescribe('Identify', () => {
    let countryInfoReader: CountryInfoReader;

    beforeAll(async () => {
      countryInfoReader = new CountryInfoReader();
      await countryInfoReader.init(countryInfoDbPath);
    });

    afterAll(() => {
      countryInfoReader.close();
    });

    it('Identifies US country info', () => {
      const expectedResult: CountryInfoData = {
        country_code: 'US',
        country_name: 'United States of America',
        country_alpha3_code: 'USA',
        country_numeric_code: 840,
        capital: 'Washington, D.C.',
        country_demonym: 'Americans',
        total_area: 9826675,
        population: 326766748,
        idd_code: 1,
        currency_code: 'USD',
        currency_name: 'United States Dollar',
        currency_symbol: '$',
        lang_code: 'EN',
        lang_name: 'English',
        cctld: 'us',
      };
      expect(countryInfoReader.get('US')).toEqual(expectedResult);
    });

    it('Does not identify XX country info', () => {
      expect(countryInfoReader.get('XX')).toEqual(null);
    });
  });
});
