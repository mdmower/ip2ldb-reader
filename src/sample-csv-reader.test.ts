import fs, {FSWatcher} from 'node:fs';
import {SampleCsvReader, ReaderStatus} from './sample-csv-reader.js';

// Requires sample CSV database in /database folder within project directory.
const sampleCsvDbPath = 'database/SAMPLE-CSVTEST.CSV';
const conditionalDescribe = fs.existsSync(sampleCsvDbPath) ? describe : describe.skip;

describe('Sample CSV info', () => {
  conditionalDescribe('Identify', () => {
    let sampleCsvReader: SampleCsvReader;

    beforeAll(async () => {
      sampleCsvReader = new SampleCsvReader();
      await sampleCsvReader.init(sampleCsvDbPath);
    });

    afterAll(() => {
      sampleCsvReader.close();
    });

    it('Identifies first row', () => {
      const expectedResult = {
        column_2: 'Some, "Column 2" Value',
        column_3: 0.5,
      };

      expect(sampleCsvReader.get('Row 1')).toEqual(expectedResult);
    });

    it('Does not identify non-existent row', () => {
      expect(sampleCsvReader.get('Row X')).toEqual(null);
    });
  });

  conditionalDescribe('DB watch', () => {
    let sampleCsvReader: SampleCsvReader;
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

      sampleCsvReader = new SampleCsvReader();

      initSpy = jest.spyOn(sampleCsvReader, 'init');
    });

    afterEach(() => {
      sampleCsvReader.close();
      jest.restoreAllMocks();
    });

    afterAll(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('Reloads database once', async () => {
      const expectedResult = {
        column_2: 'Some, "Column 2" Value',
        column_3: 0.5,
      };

      await sampleCsvReader.init(sampleCsvDbPath, true);
      expect(sampleCsvReader.readerStatus).toEqual(ReaderStatus.Ready);
      jest.advanceTimersByTime(200);
      expect(watchCallbackCount).toEqual(3);
      jest.advanceTimersByTime(300);
      jest.runOnlyPendingTimers();
      expect(sampleCsvReader.readerStatus).toEqual(ReaderStatus.Initializing);
      await sampleCsvReader.reloadPromise;
      expect(sampleCsvReader.readerStatus).toEqual(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(2);
      expect(sampleCsvReader.get('Row 1')).toEqual(expectedResult);
    });
  });
});
