import fs, {FSWatcher} from 'node:fs';
import {SampleCsvReader, ReaderStatus} from '../src/sample-csv-reader.js';
import {MockInstance} from 'vitest';

// Requires sample CSV database in /database folder within project directory.
const sampleCsvDbPath = 'database/SAMPLE-CSVTEST.CSV';

describe('Sample CSV info', () => {
  describe('Identify', () => {
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
      expect(sampleCsvReader.get('Row X')).toBe(null);
    });
  });

  describe('DB watch', () => {
    let sampleCsvReader: SampleCsvReader;
    let initSpy: MockInstance;
    let watchSpy: MockInstance;
    let watchCallbackCount: number;

    beforeAll(() => {
      vitest.useFakeTimers();
    });

    beforeEach(() => {
      watchCallbackCount = 0;
      watchSpy = vitest.spyOn(fs, 'watch').mockImplementation((filename, callback): FSWatcher => {
        const runCallbackAndIncrementCount = () => {
          if (callback) callback('change', filename.toString());
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

      initSpy = vitest.spyOn(sampleCsvReader, 'init');
    });

    afterEach(() => {
      sampleCsvReader.close();
      vitest.restoreAllMocks();
    });

    afterAll(() => {
      vitest.clearAllTimers();
      vitest.useRealTimers();
    });

    it('Reloads database once', async () => {
      const expectedResult = {
        column_2: 'Some, "Column 2" Value',
        column_3: 0.5,
      };

      await sampleCsvReader.init(sampleCsvDbPath, true);
      expect(sampleCsvReader.readerStatus).toBe(ReaderStatus.Ready);
      vitest.advanceTimersByTime(200);
      expect(watchCallbackCount).toBe(3);
      vitest.advanceTimersByTime(300);
      vitest.runOnlyPendingTimers();
      expect(sampleCsvReader.readerStatus).toBe(ReaderStatus.Initializing);
      await sampleCsvReader.reloadPromise;
      expect(sampleCsvReader.readerStatus).toBe(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(2);
      expect(sampleCsvReader.get('Row 1')).toEqual(expectedResult);
    });
  });
});
