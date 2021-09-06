import {SubdivReader, ReaderStatus} from './subdiv-reader';
import fs, {FSWatcher} from 'fs';

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

  conditionalDescribe('DB watch', () => {
    let subdivReader: SubdivReader;
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

      subdivReader = new SubdivReader();

      initSpy = jest.spyOn(subdivReader, 'init');
    });

    afterEach(() => {
      subdivReader.close();
      jest.restoreAllMocks();
    });

    afterAll(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('Reloads database once', async () => {
      await subdivReader.init(subdivDbPath, true);
      expect(subdivReader.readerStatus).toEqual(ReaderStatus.Ready);
      jest.advanceTimersByTime(200);
      expect(watchCallbackCount).toEqual(3);
      jest.advanceTimersByTime(300);
      jest.runOnlyPendingTimers();
      expect(subdivReader.readerStatus).toEqual(ReaderStatus.Initializing);
      await subdivReader.reloadPromise;
      expect(subdivReader.readerStatus).toEqual(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(2);
      expect(subdivReader.get('US', 'California')).toEqual('CA');
    });
  });
});
