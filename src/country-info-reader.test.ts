import {CountryInfoReader, ReaderStatus} from './country-info-reader';
import fs, {FSWatcher} from 'fs';
import {CountryInfoData} from './interfaces';

// Requires "more information" CSV subdivision database from
// https://www.ip2location.com/free/country-information
// to be decompressed and made available in /database folder within project directory.
const countryInfoDbPath = 'database/IP2LOCATION-COUNTRY-INFORMATION.CSV';
const conditionalDescribe = fs.existsSync(countryInfoDbPath) ? describe : describe.skip;

describe('Country info', () => {
  conditionalDescribe('Identify', () => {
    let countryInfoReader: CountryInfoReader;

    beforeAll(async () => {
      countryInfoReader = new CountryInfoReader();
      await countryInfoReader.init(countryInfoDbPath);
    });

    afterAll(() => {
      countryInfoReader.close();
    });

    it('Identifies US country info', () => {
      const expectedResult: CountryInfoData = {
        country_name: 'United States of America',
        country_alpha3_code: 'USA',
        country_numeric_code: 840,
        capital: 'Washington, D.C.',
        country_demonym: 'Americans',
        total_area: 9826675,
        population: 326766748,
        idd_code: 1,
        currency_code: 'USD',
        currency_name: 'United States Dollar',
        currency_symbol: '$',
        lang_code: 'EN',
        lang_name: 'English',
        cctld: 'us',
      };
      expect(countryInfoReader.get('US')).toEqual(expectedResult);
    });

    it('Does not identify XX country info', () => {
      expect(countryInfoReader.get('XX')).toEqual(null);
    });
  });

  conditionalDescribe('DB watch', () => {
    let countryInfoReader: CountryInfoReader;
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

      countryInfoReader = new CountryInfoReader();

      initSpy = jest.spyOn(countryInfoReader, 'init');
    });

    afterEach(() => {
      countryInfoReader.close();
      jest.restoreAllMocks();
    });

    afterAll(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('Reloads database once', async () => {
      await countryInfoReader.init(countryInfoDbPath, true);
      expect(countryInfoReader.readerStatus).toEqual(ReaderStatus.Ready);
      jest.advanceTimersByTime(200);
      expect(watchCallbackCount).toEqual(3);
      jest.advanceTimersByTime(300);
      jest.runOnlyPendingTimers();
      expect(countryInfoReader.readerStatus).toEqual(ReaderStatus.Initializing);
      await countryInfoReader.reloadPromise;
      expect(countryInfoReader.readerStatus).toEqual(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(2);
      expect(countryInfoReader.get('US')?.country_name).toEqual('United States of America');
    });
  });
});
