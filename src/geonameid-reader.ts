import fs, {FSWatcher} from 'fs';
import readline from 'readline';

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
  private geoNameIdMap_: GeoNameIdMap | null;

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.dbPath_ = null;
    this.fsWatcher_ = null;
    this.geoNameIdMap_ = null;
  }

  /**
   * Load IP2Location geoNameId map into memory
   * @param csvPath Filesystem path to IP2Location CSV GeoNameID database
   */
  private async loadGeoNameIdMap(csvPath: string): Promise<void> {
    const expectedHeader = '"country_code","region_name","city_name","geonameid"';
    const expectedLineRe = /^"(\w{2})","([^"]+)","([^"]+)","(\d+)"$/;
    let geoNameIdMap: GeoNameIdMap | null = {};

    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath),
      crlfDelay: Infinity,
    });

    let firstLine = true;

    const processLine = (line: string) => {
      if (firstLine) {
        if (line !== expectedHeader) {
          geoNameIdMap = null;
          rl.close();
        }
        firstLine = false;
      } else if (geoNameIdMap !== null) {
        const match = expectedLineRe.exec(line);
        if (match && match[3] !== '-') {
          const country = match[1];
          const region = match[2];
          const city = match[3];
          const geonameid = parseInt(match[4]);
          // Less than pretty workaround for ts(2532)
          const countryMap = geoNameIdMap[country] || {};
          const regionMap = countryMap[region] || {};
          regionMap[city] = geonameid;
          countryMap[region] = regionMap;
          geoNameIdMap[country] = countryMap;
        }
      }
    };

    return new Promise((resolve) => {
      rl.on('line', processLine).on('close', () => {
        if (geoNameIdMap !== null) {
          this.geoNameIdMap_ = geoNameIdMap;
        }
        resolve();
      });
    });
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

    await this.loadGeoNameIdMap(this.dbPath_);

    if (reloadOnDbUpdate) {
      this.watchDbFile(this.dbPath_);
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
        this.init(dbPath, true).catch(() => undefined);
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

export {GeoNameIdReader};
