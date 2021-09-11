import {IataIcaoReader, ReaderStatus} from './iata-icao-reader';
import fs, {FSWatcher} from 'fs';

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

  conditionalDescribe('DB watch', () => {
    let iataIcaoReader: IataIcaoReader;
    let initSpy: jest.SpyInstance;
    let watchSpy: jest.SpyInstance;
    let watchCallbackCount: number;

    beforeAll(() => {
      jest.useFakeTimers();
    });

    beforeEach(() => {
      watchCallbackCount = 0;
      watchSpy = jest.spyOn(fs, 'watch').mockImplementation((filename, callback): FSWatcher => {
        const runCallbackAndIncrementCount = () => {
          callback && callback('change', filename.toString());
          watchCallbackCount += 1;
        };
        const timeouts = [
          setTimeout(runCallbackAndIncrementCount, 50),
          setTimeout(runCallbackAndIncrementCount, 100),
          setTimeout(runCallbackAndIncrementCount, 150),
        ];
        return {
          close: () => timeouts.forEach(clearTimeout),
        } as FSWatcher;
      });

      iataIcaoReader = new IataIcaoReader();

      initSpy = jest.spyOn(iataIcaoReader, 'init');
    });

    afterEach(() => {
      iataIcaoReader.close();
      jest.restoreAllMocks();
    });

    afterAll(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('Reloads database once', async () => {
      await iataIcaoReader.init(iataIcaoDbPath, true);
      expect(iataIcaoReader.readerStatus).toEqual(ReaderStatus.Ready);
      jest.advanceTimersByTime(200);
      expect(watchCallbackCount).toEqual(3);
      jest.advanceTimersByTime(300);
      jest.runOnlyPendingTimers();
      expect(iataIcaoReader.readerStatus).toEqual(ReaderStatus.Initializing);
      await iataIcaoReader.reloadPromise;
      expect(iataIcaoReader.readerStatus).toEqual(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(2);
      expect(iataIcaoReader.get('US', 'California')?.length).toBeGreaterThan(0);
    });
  });
});
