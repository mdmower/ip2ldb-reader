import {SubdivReader} from '../src/subdiv-reader.js';

// Requires CSV subdivision database from https://www.ip2location.com/free/iso3166-2
// to be decompressed and made available in /database folder within project directory.
const subdivDbPath = 'database/IP2LOCATION-ISO3166-2.CSV';

describe('Subdivision', () => {
  describe('Identify', () => {
    let subdivReader: SubdivReader;

    beforeAll(async () => {
      subdivReader = new SubdivReader();
      await subdivReader.init(subdivDbPath);
    });

    afterAll(() => {
      subdivReader.close();
    });

    it('Identifies US-California subdivision', () => {
      expect(subdivReader.get('US', 'California')).toBe('CA');
    });

    it('Identifies JP-Kyoto subdivision', () => {
      expect(subdivReader.get('JP', 'Kyoto')).toBe('26');
    });

    it('Does not identify XX-Abcdef subdivision', () => {
      expect(subdivReader.get('XX', 'Abcdef')).toBe(null);
    });
  });
});
