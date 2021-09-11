import fs, {FSWatcher} from 'fs';
import csvParser from 'csv-parser';
import {IataIcaoData} from './interfaces';

interface IataIcaoMap {
  [key: string]: {[key: string]: IataIcaoData[] | undefined} | undefined;
}

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

class IataIcaoReader {
  private readerStatus_: ReaderStatus;
  private dbPath_: string | null;
  private fsWatcher_: FSWatcher | null;
  private reloadPromise_: Promise<void>;
  private iataIcaoMap_: IataIcaoMap | null;

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.dbPath_ = null;
    this.fsWatcher_ = null;
    this.reloadPromise_ = Promise.resolve();
    this.iataIcaoMap_ = null;
  }

  /**
   * Load IP2Location IATA/ICAO map into memory
   * @param csvPath Filesystem path to IP2Location CSV IATA/ICAO database
   */
  private async loadIataIcaoMap(csvPath: string): Promise<void> {
    const normalizeStr = (val: string): string => {
      return val.replace(/^-$/, '');
    };

    const normalizeNum = (val: string): number | null => {
      const numStr = normalizeStr(val).trim();
      const num = numStr ? Number(numStr) : null;
      return num != null && !Number.isNaN(num) ? num : null;
    };

    const parser = fs.createReadStream(csvPath).pipe(csvParser());

    const iataIcaoMap: IataIcaoMap = {};
    let firstRecord = true;

    for await (const record of parser) {
      const airportInputData = record as {[key: string]: string};

      if (
        firstRecord &&
        Object.keys(airportInputData).filter((key) =>
          ['country_code', 'region_name', 'iata', 'icao', 'latitude', 'longitude'].includes(key)
        ).length !== 6
      ) {
        throw new Error('IATA/ICAO database does not have expected headings');
      }
      firstRecord = false;

      const airportOutputData: IataIcaoData = {
        iata: null,
        icao: null,
        airport: null,
        latitude: null,
        longitude: null,
      };

      const {country_code, region_name} = airportInputData;
      for (const key in airportInputData) {
        if (['country_code', 'region_name'].includes(key)) {
          continue;
        }
        airportOutputData[key] = ['latitude', 'longitude'].includes(key)
          ? normalizeNum(airportInputData[key])
          : normalizeStr(airportInputData[key]);
      }

      const countryMap = iataIcaoMap[country_code] || {};
      const regionArray = countryMap[region_name] || [];
      regionArray.push(airportOutputData);
      countryMap[region_name] = regionArray;
      iataIcaoMap[country_code] = countryMap;
    }

    this.iataIcaoMap_ = Object.keys(iataIcaoMap).length ? iataIcaoMap : null;
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
    this.iataIcaoMap_ = null;
  }

  /**
   * Initialize reader
   * @param dbPath IP2Location CSV database
   * @param reloadOnDbUpdate Options for database reader
   */
  public async init(dbPath: string, reloadOnDbUpdate?: boolean): Promise<void> {
    if (!dbPath) {
      throw new Error('Must specify path to IATA/ICAO CSV database');
    }

    this.readerStatus_ = ReaderStatus.Initializing;
    this.dbPath_ = dbPath;

    await this.loadIataIcaoMap(dbPath);

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
      // Since iataIcaoMap is cached in memory, there's no need to
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
   * Get IATA/ICAO airport info from country code and region name
   * @param country ISO 3166-1 country code from IP2Location database
   * @param region Region from from IP2Location database
   */
  public get(country: string, region: string): IataIcaoData[] {
    if (this.readerStatus_ !== ReaderStatus.Ready || !this.iataIcaoMap_) {
      return [];
    }
    if (!country || !region) {
      return [];
    }

    return (this.iataIcaoMap_[country] || {})[region] || [];
  }
}

export {IataIcaoReader, ReaderStatus};
