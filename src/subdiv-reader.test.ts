import {SubdivReader} from './subdiv-reader';
import fs from 'fs';

// Requires CSV subdivision database from https://www.ip2location.com/free/iso3166-2
// to be decompressed and made available in /database folder within project directory.
const subdivDbPath = 'database/IP2LOCATION-ISO3166-2.CSV';
const conditionalDescribe = fs.existsSync(subdivDbPath) ? describe : describe.skip;

describe('Subdivision', () => {
  conditionalDescribe('Identify', () => {
    let subdivReader: SubdivReader;

    beforeAll(async () => {
      subdivReader = new SubdivReader();
      await subdivReader.init(subdivDbPath);
    });

    afterAll(() => {
      subdivReader.close();
    });

    it('Identifies US-California subdivision', () => {
      expect(subdivReader.get('US', 'California')).toEqual('CA');
    });

    it('Identifies JP-Kyoto subdivision', () => {
      expect(subdivReader.get('JP', 'Kyoto')).toEqual('26');
    });

    it('Does not identify XX-Abcdef subdivision', () => {
      expect(subdivReader.get('XX', 'Abcdef')).toEqual('');
    });
  });
});
