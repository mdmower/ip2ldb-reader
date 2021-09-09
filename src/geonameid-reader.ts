import fs, {FSWatcher} from 'fs';
import csvParser from 'csv-parser';

interface GeoNameIdMap {
  [key: string]: {[key: string]: {[key: string]: number | undefined} | undefined} | undefined;
}

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

class GeoNameIdReader {
  private readerStatus_: ReaderStatus;
  private dbPath_: string | null;
  private fsWatcher_: FSWatcher | null;
  private reloadPromise_: Promise<void>;
  private geoNameIdMap_: GeoNameIdMap | null;

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.dbPath_ = null;
    this.fsWatcher_ = null;
    this.reloadPromise_ = Promise.resolve();
    this.geoNameIdMap_ = null;
  }

  /**
   * Load IP2Location geoNameId map into memory
   * @param csvPath Filesystem path to IP2Location CSV GeoNameID database
   */
  private async loadGeoNameIdMap(csvPath: string): Promise<void> {
    const parser = fs.createReadStream(csvPath).pipe(csvParser());

    const geoNameIdMap: GeoNameIdMap = {};
    let firstRecord = true;

    for await (const record of parser) {
      const inputData = record as {[key: string]: string};

      if (
        firstRecord &&
        Object.keys(inputData).filter((key) =>
          ['country_code', 'region_name', 'city_name', 'geonameid'].includes(key)
        ).length !== 4
      ) {
        throw new Error('GeoName ID database does not have expected headings');
      }
      firstRecord = false;

      const {country_code, region_name, city_name, geonameid} = inputData;

      const countryMap = geoNameIdMap[country_code] || {};
      const regionMap = countryMap[region_name] || {};
      regionMap[city_name] = parseInt(geonameid);
      countryMap[region_name] = regionMap;
      geoNameIdMap[country_code] = countryMap;
    }

    this.geoNameIdMap_ = Object.keys(geoNameIdMap).length ? geoNameIdMap : null;
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
    this.geoNameIdMap_ = null;
  }

  /**
   * Initialize reader
   * @param dbPath IP2Location BIN database
   * @param reloadOnDbUpdate Options for database reader
   */
  public async init(dbPath: string, reloadOnDbUpdate?: boolean): Promise<void> {
    if (!dbPath) {
      throw new Error('Must specify path to GeoNameID CSV database');
    }

    this.readerStatus_ = ReaderStatus.Initializing;
    this.dbPath_ = dbPath;

    await this.loadGeoNameIdMap(dbPath);

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
      // Since geoNameIds are cached in memory, there's no need to
      // change the reader status; they'll just update in-place.
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
   * Get the GeoName ID from a country code, region, and city
   * @param country ISO 3166-1 country code from IP2Location database
   * @param region Region from from IP2Location database
   * @param city City from IP2Location database
   */
  public get(country: string, region: string, city: string): number | null {
    if (this.readerStatus_ !== ReaderStatus.Ready || !this.geoNameIdMap_) {
      return null;
    }
    if (!country || !region || !city) {
      return 0;
    }

    const geoNameId = ((this.geoNameIdMap_[country] || {})[region] || {})[city];
    return geoNameId != undefined ? geoNameId : 0;
  }
}

export {GeoNameIdReader, ReaderStatus};
