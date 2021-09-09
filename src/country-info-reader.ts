import fs, {FSWatcher} from 'fs';
import csvParser from 'csv-parser';
import {CountryInfoData} from './interfaces';

interface CountryInfoMap {
  [key: string]: CountryInfoData | undefined;
}

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

class CountryInfoReader {
  private readerStatus_: ReaderStatus;
  private dbPath_: string | null;
  private fsWatcher_: FSWatcher | null;
  private reloadPromise_: Promise<void>;
  private countryInfoMap_: CountryInfoMap | null;

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.dbPath_ = null;
    this.fsWatcher_ = null;
    this.reloadPromise_ = Promise.resolve();
    this.countryInfoMap_ = null;
  }

  /**
   * Load IP2Location countryInfo map into memory
   * @param csvPath Filesystem path to IP2Location CSV Country Info database
   */
  private async loadCountryInfoMap(csvPath: string): Promise<void> {
    const normalizeStr = (val: string): string => {
      return val.replace(/^-$/, '');
    };

    const normalizeNum = (val: string): number | null => {
      const numStr = normalizeStr(val).trim();
      const num = numStr ? Number(numStr) : null;
      return num != null && !Number.isNaN(num) ? num : null;
    };

    const parser = fs.createReadStream(csvPath).pipe(csvParser());

    const countryInfoMap: CountryInfoMap = {};
    let firstRecord = true;

    for await (const record of parser) {
      const countryInputData = record as {[key: string]: string};

      if (
        firstRecord &&
        Object.keys(countryInputData).filter((key) =>
          ['country_code', 'capital', 'total_area'].includes(key)
        ).length !== 3
      ) {
        throw new Error('Country info database does not have expected headings');
      }
      firstRecord = false;

      const countryOutputData: CountryInfoData = {
        country_code: null,
        capital: null,
        total_area: null,
      };

      for (const key in countryInputData) {
        countryOutputData[key] = [
          'country_numeric_code',
          'total_area',
          'population',
          'idd_code',
        ].includes(key)
          ? normalizeNum(countryInputData[key])
          : normalizeStr(countryInputData[key]);
      }
      if (countryOutputData.country_code) {
        countryInfoMap[countryOutputData.country_code] = countryOutputData;
      }
    }

    this.countryInfoMap_ = Object.keys(countryInfoMap).length ? countryInfoMap : null;
  }

  /**
   * Get reader status
   */
  public get readerStatus(): ReaderStatus {
    return this.readerStatus_;
  }

  /**
   * Get DB reload promise
   */
  public get reloadPromise(): Promise<void> {
    return this.reloadPromise_;
  }

  /**
   * Close database and uninitialize reader
   */
  public close(): void {
    this.readerStatus_ = ReaderStatus.NotInitialized;

    if (this.fsWatcher_ !== null) {
      this.fsWatcher_.close();
    }

    this.dbPath_ = null;
    this.fsWatcher_ = null;
    this.countryInfoMap_ = null;
  }

  /**
   * Initialize reader
   * @param dbPath IP2Location BIN database
   * @param reloadOnDbUpdate Options for database reader
   */
  public async init(dbPath: string, reloadOnDbUpdate?: boolean): Promise<void> {
    if (!dbPath) {
      throw new Error('Must specify path to Country Info CSV database');
    }

    this.readerStatus_ = ReaderStatus.Initializing;
    this.dbPath_ = dbPath;

    await this.loadCountryInfoMap(dbPath);

    if (reloadOnDbUpdate) {
      this.watchDbFile(dbPath);
    }

    this.readerStatus_ = ReaderStatus.Ready;
  }

  /**
   * Watch database file for changes and re-init if a change is detected
   * @param dbPath Path to watch
   */
  private watchDbFile(dbPath: string): void {
    let timeout: NodeJS.Timeout | null = null;

    const dbChangeHandler = (filename: string) => {
      if (filename && fs.existsSync(dbPath)) {
        if (this.fsWatcher_ !== null) {
          this.fsWatcher_.close();
          this.fsWatcher_ = null;
        }
        this.reloadPromise_ = this.init(dbPath, true).catch(() => undefined);
      }
    };

    this.fsWatcher_ = fs.watch(dbPath, (eventType, filename) => {
      // Use a 500ms debounce on database changes before init re-runs.
      // Since countryInfoMap is cached in memory, there's no need to
      // change the reader status; it'll just update in-place.
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        dbChangeHandler(filename);
      }, 500);
    });
  }

  /**
   * Get country info from a country code
   * @param country ISO 3166-1 country code from IP2Location database
   */
  public get(country: string): CountryInfoData | null {
    if (this.readerStatus_ !== ReaderStatus.Ready || !this.countryInfoMap_) {
      return null;
    }
    if (!country) {
      return null;
    }

    return this.countryInfoMap_[country] || null;
  }
}

export {CountryInfoReader, ReaderStatus};
