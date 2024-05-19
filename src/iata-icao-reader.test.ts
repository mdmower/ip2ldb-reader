import fs from 'node:fs';
import {IataIcaoReader} from './iata-icao-reader.js';

// Requires CSV IATA/ICAO database from https://github.com/ip2location/ip2location-iata-icao
// to be made available in /database folder within project directory.
const iataIcaoDbPath = 'database/IP2LOCATION-IATA-ICAO.CSV';
const conditionalDescribe = fs.existsSync(iataIcaoDbPath) ? describe : describe.skip;

describe('IATA/ICAO airport info', () => {
  conditionalDescribe('Identify', () => {
    let iataIcaoReader: IataIcaoReader;

    beforeAll(async () => {
      iataIcaoReader = new IataIcaoReader();
      await iataIcaoReader.init(iataIcaoDbPath);
    });

    afterAll(() => {
      iataIcaoReader.close();
    });

    it('Identifies US, California airports', () => {
      const expectedResult = {
        LAX: {
          iata: 'LAX',
          icao: 'KLAX',
          airport: 'Los Angeles International Airport',
          latitude: Math.round(33.94250107),
          longitude: Math.round(-118.4079971),
        },
        SFO: {
          iata: 'SFO',
          icao: 'KSFO',
          airport: 'San Francisco International Airport',
          latitude: Math.round(37.61899948),
          longitude: Math.round(-122.375),
        },
      };

      const results = iataIcaoReader.get('US', 'California');
      expect(results.length).toBeGreaterThan(0);

      const laxResult = results.find((airport) => airport.iata === 'LAX');
      expect(laxResult).toBeTruthy();
      laxResult!.latitude = Math.round(laxResult!.latitude ?? 0);
      laxResult!.longitude = Math.round(laxResult!.longitude ?? 0);
      expect(laxResult).toEqual(expectedResult.LAX);
      const sfoResult = results.find((airport) => airport.iata === 'SFO');
      expect(sfoResult).toBeTruthy();
      sfoResult!.latitude = Math.round(sfoResult!.latitude ?? 0);
      sfoResult!.longitude = Math.round(sfoResult!.longitude ?? 0);
      expect(sfoResult).toEqual(expectedResult.SFO);
    });

    it('Does not identify XX, Abcdef airports', () => {
      expect(iataIcaoReader.get('XX', 'Abcdef')).toEqual([]);
    });
  });
});
