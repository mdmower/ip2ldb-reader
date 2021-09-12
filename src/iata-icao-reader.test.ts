import {IataIcaoReader} from './iata-icao-reader';
import fs from 'fs';

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
          latitude: 33.94250107,
          longitude: -118.4079971,
        },
        SFO: {
          iata: 'SFO',
          icao: 'KSFO',
          airport: 'San Francisco International Airport',
          latitude: 37.61899948,
          longitude: -122.375,
        },
      };

      const results = iataIcaoReader.get('US', 'California');
      expect(results.length).toBeGreaterThan(0);
      const laxResult = results.find((airport) => airport.iata === 'LAX');
      expect(laxResult).toEqual(expectedResult.LAX);
      const sfoResult = results.find((airport) => airport.iata === 'SFO');
      expect(sfoResult).toEqual(expectedResult.SFO);
    });

    it('Does not identify XX, Abcdef airports', () => {
      expect(iataIcaoReader.get('XX', 'Abcdef')).toEqual([]);
    });
  });
});
