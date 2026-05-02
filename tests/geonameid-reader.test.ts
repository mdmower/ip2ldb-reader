import {GeoNameIdReader} from '../src/geonameid-reader.js';

// Requires CSV GeoName ID database from https://www.ip2location.com/free/geoname-id
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

  describe('Reload', () => {
    it('Returns the same GeoName ID when init is called again', async () => {
      const reader = new GeoNameIdReader();
      await reader.init(geonameidDbPath);
      const id = reader.get('US', 'California', 'Los Angeles');
      expect(id).toBe(5368361);

      await reader.init(geonameidDbPath);
      expect(reader.get('US', 'California', 'Los Angeles')).toBe(id);

      reader.close();
    });
  });
});
