import {CountryInfoReader} from './country-info-reader.js';
import {CountryInfoData} from './interfaces.js';

// Requires "more information" country info CSV database from
// https://www.ip2location.com/free/country-information
// to be decompressed and made available in /database folder within project directory.
const countryInfoDbPath = 'database/IP2LOCATION-COUNTRY-INFORMATION.CSV';

describe('Country info', () => {
  describe('Identify', () => {
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
        total_area: 9000000, // Adjusted for comparison
        population: 300000000, // Adjusted for comparison
        idd_code: 1,
        currency_code: 'USD',
        currency_name: 'United States Dollar',
        currency_symbol: '$',
        lang_code: 'EN',
        lang_name: 'English',
        cctld: 'us',
      };

      const usInfo = countryInfoReader.get('US') ?? ({} as CountryInfoData);
      const gtNumericKeys = ['total_area', 'population'];
      for (const key of gtNumericKeys) {
        expect(Number(usInfo[key] ?? 0)).toBeGreaterThan(Number(expectedResult[key] ?? 0));
      }
      const otherKeys = Object.keys(expectedResult).filter((key) => !gtNumericKeys.includes(key));
      for (const key of otherKeys) {
        expect(usInfo[key]).toBe(expectedResult[key]);
      }
    });

    it('Does not identify XX country info', () => {
      expect(countryInfoReader.get('XX')).toBe(null);
    });
  });
});
