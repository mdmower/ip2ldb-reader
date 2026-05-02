import {OlsonTzData} from '../src/interfaces.js';
import {OlsonTzReader} from '../src/olson-tz-reader.js';

// Requires CSV Olson Time Zone database from https://www.ip2location.com/free/olson-timezone
// to be decompressed and made available in /database folder within project directory.
const olsontzDbPath = 'database/IP2LOCATION-OLSON-TIMEZONE.CSV';

describe('Olson time zone', () => {
  describe('Identify', () => {
    let olsonTzReader: OlsonTzReader;

    beforeAll(async () => {
      olsonTzReader = new OlsonTzReader();
      await olsonTzReader.init(olsontzDbPath);
    });

    afterAll(() => {
      olsonTzReader.close();
    });

    it('Identifies US, California, Los Angeles time zone', () => {
      const expectedResult: OlsonTzData = {
        abbreviation: 'PST,PDT',
        dst_end: '2026-11-01',
        dst_start: '2026-03-08',
        olson_tz: 'America/Los_Angeles',
      };
      expect(olsonTzReader.get('US', 'California', 'Los Angeles')).toEqual(expectedResult);
    });

    it('Does not identify XX, Abcdef, Ghijkl time zone', () => {
      expect(olsonTzReader.get('XX', 'Abcdef', 'Ghijkl')).toBe(null);
    });
  });

  describe('Reload', () => {
    it('Returns the same time zone when init is called again', async () => {
      const reader = new OlsonTzReader();
      await reader.init(olsontzDbPath);
      const record = reader.get('US', 'California', 'Los Angeles');
      expect(record).not.toBe(null);

      await reader.init(olsontzDbPath);
      expect(reader.get('US', 'California', 'Los Angeles')).toEqual(record);

      reader.close();
    });
  });
});
