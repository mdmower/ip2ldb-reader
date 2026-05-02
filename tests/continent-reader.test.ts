import {ContinentReader} from '../src/continent-reader.js';
import type {ContinentData} from '../src/interfaces.js';

// Requires Continent Multilingual CSV database from
// https://www.ip2location.com/free/continent-multilingual
// to be decompressed and made available in /database folder within project directory.
const continentDbPath = 'database/IP2LOCATION-CONTINENT-MULTILINGUAL.CSV';

describe('Continent', () => {
  describe('Identify', () => {
    let continentReader: ContinentReader;

    beforeAll(async () => {
      continentReader = new ContinentReader();
      await continentReader.init(continentDbPath);
    });

    afterAll(() => {
      continentReader.close();
    });

    it('Identifies US continent', () => {
      const expectedResult: ContinentData = {
        continent_code: 'NA',
        continent: 'North America',
      };
      expect(continentReader.get('US')).toEqual(expectedResult);
    });

    it('Identifies JP continent', () => {
      const expectedResult: ContinentData = {
        continent_code: 'AS',
        continent: 'Asia',
      };
      expect(continentReader.get('JP')).toEqual(expectedResult);
    });

    it('Does not identify XX continent', () => {
      expect(continentReader.get('XX')).toBe(null);
    });
  });

  describe('Reload', () => {
    it('Returns the same continent when init is called again', async () => {
      const reader = new ContinentReader();
      await reader.init(continentDbPath);
      const record = reader.get('US');
      expect(record).not.toBe(null);

      await reader.init(continentDbPath);
      expect(reader.get('US')).toEqual(record);

      reader.close();
    });
  });
});
