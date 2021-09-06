import {GeoNameIdReader, ReaderStatus} from './geonameid-reader';
import fs, {FSWatcher} from 'fs';

// Requires CSV subdivision database from https://www.ip2location.com/free/geoname-id
// to be decompressed and made available in /database folder within project directory.
const geonameidDbPath = 'database/IP2LOCATION-GEONAMEID.CSV';
const conditionalDescribe = fs.existsSync(geonameidDbPath) ? describe : describe.skip;

describe('GeoName ID', () => {
  conditionalDescribe('Identify', () => {
    let geoNameIdReader: GeoNameIdReader;

    beforeAll(async () => {
      geoNameIdReader = new GeoNameIdReader();
      await geoNameIdReader.init(geonameidDbPath);
    });

    afterAll(() => {
      geoNameIdReader.close();
    });

    it('Identifies US, California, Los Angeles GeoName ID', () => {
      expect(geoNameIdReader.get('US', 'California', 'Los Angeles')).toEqual(5368361);
    });

    it('Does not identify XX, Abcdef, Ghijkl GeoName ID', () => {
      expect(geoNameIdReader.get('XX', 'Abcdef', 'Ghijkl')).toEqual(0);
    });
  });

  conditionalDescribe('DB watch', () => {
    let geoNameIdReader: GeoNameIdReader;
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

      geoNameIdReader = new GeoNameIdReader();

      initSpy = jest.spyOn(geoNameIdReader, 'init');
    });

    afterEach(() => {
      geoNameIdReader.close();
      jest.restoreAllMocks();
    });

    afterAll(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('Reloads database once', async () => {
      await geoNameIdReader.init(geonameidDbPath, true);
      expect(geoNameIdReader.readerStatus).toEqual(ReaderStatus.Ready);
      jest.advanceTimersByTime(200);
      expect(watchCallbackCount).toEqual(3);
      jest.advanceTimersByTime(300);
      jest.runOnlyPendingTimers();
      expect(geoNameIdReader.readerStatus).toEqual(ReaderStatus.Initializing);
      await geoNameIdReader.reloadPromise;
      expect(geoNameIdReader.readerStatus).toEqual(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(2);
      expect(geoNameIdReader.get('US', 'California', 'Los Angeles')).toEqual(5368361);
    });
  });
});
