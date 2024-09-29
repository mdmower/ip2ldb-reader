import {GeoNameIdReader} from './geonameid-reader.js';

// Requires CSV subdivision database from https://www.ip2location.com/free/geoname-id
// to be decompressed and made available in /database folder within project directory.
const geonameidDbPath = 'database/IP2LOCATION-GEONAMEID.CSV';

describe('GeoName ID', () => {
  describe('Identify', () => {
    let geoNameIdReader: GeoNameIdReader;

    beforeAll(async () => {
      geoNameIdReader = new GeoNameIdReader();
      await geoNameIdReader.init(geonameidDbPath);
    });

    afterAll(() => {
      geoNameIdReader.close();
    });

    it('Identifies US, California, Los Angeles GeoName ID', () => {
      expect(geoNameIdReader.get('US', 'California', 'Los Angeles')).toBe(5368361);
    });

    it('Does not identify XX, Abcdef, Ghijkl GeoName ID', () => {
      expect(geoNameIdReader.get('XX', 'Abcdef', 'Ghijkl')).toBe(null);
    });
  });
});
