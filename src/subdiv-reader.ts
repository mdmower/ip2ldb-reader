import fs, {FSWatcher} from 'fs';
import readline from 'readline';

interface SubdivisionMap {
  [key: string]: {[key: string]: string | undefined};
}

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

class SubdivReader {
  readerStatus_: ReaderStatus;
  dbPath_: string | null;
  fsWatcher_: FSWatcher | null;
  subdivisionMap_: SubdivisionMap | null;

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.dbPath_ = null;
    this.fsWatcher_ = null;
    this.subdivisionMap_ = null;
  }

  /**
   * Load IP2Location subdivision map into memory
   * @param csvPath Filesystem path to IP2Location CSV subdivision database
   * @private
   */
  async loadSubdivisionMap(csvPath: string): Promise<void> {
    const expectedHeader = '"country_code","subdivision_name","code"';
    const expectedLineRe = /^"(\w{2})","([^"]+)","([^"]+)"$/;
    let subdivisionMap: SubdivisionMap | null = {};

    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath),
      crlfDelay: Infinity,
    });

    let firstLine = true;

    const processLine = (line: string) => {
      if (firstLine) {
        if (line !== expectedHeader) {
          subdivisionMap = null;
          rl.close();
        }
        firstLine = false;
      } else if (subdivisionMap !== null) {
        const match = line.match(expectedLineRe);
        if (match && match[3] !== '-') {
          const country = match[1];
          const region = match[2];
          const subdivision = match[3];
          if (!subdivisionMap[country]) {
            subdivisionMap[country] = {};
          }
          subdivisionMap[country][region] = subdivision;
        }
      }
    };

    return new Promise((resolve) => {
      rl.on('line', processLine).on('close', () => {
        if (subdivisionMap !== null) {
          this.subdivisionMap_ = subdivisionMap;
        }
        resolve();
      });
    });
  }

  /**
   * Initialize reader
   * @param dbPath IP2Location BIN database
   * @param reloadOnDbUpdate Options for database reader
   */
  async init(dbPath: string, reloadOnDbUpdate?: boolean): Promise<void> {
    if (!dbPath) {
      throw new Error('Must specify path to subdivision CSV database');
    }

    this.readerStatus_ = ReaderStatus.Initializing;
    this.dbPath_ = dbPath;

    await this.loadSubdivisionMap(dbPath);

    if (reloadOnDbUpdate) {
      this.watchDbFile(dbPath);
    }

    this.readerStatus_ = ReaderStatus.Ready;
  }

  /**
   * Watch database file for changes and re-init if a change is detected
   * @param dbPath Path to watch
   */
  watchDbFile(dbPath: string): void {
    let timeout: NodeJS.Timeout | null = null;

    const dbChangeHandler = (filename: string) => {
      if (filename && fs.existsSync(dbPath)) {
        if (this.fsWatcher_ !== null) {
          this.fsWatcher_.close();
          this.fsWatcher_ = null;
        }
        this.init(dbPath, true);
      }
    };

    this.fsWatcher_ = fs.watch(dbPath, (eventType, filename) => {
      // Use a 500ms debounce on database changes before init re-runs.
      // Since subdivisions are cached in memory, there's no need to
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
   * Get the ISO 3166-2 subdivision part from a country code and region
   * @param country ISO 3166-1 country code from IP2Location database
   * @param region Region from from IP2Location database
   */
  get(country: string, region: string): string | null {
    if (this.readerStatus_ !== ReaderStatus.Ready || !this.subdivisionMap_) {
      return null;
    }
    if (!country || !region) {
      return '';
    }

    const isoCode = this.subdivisionMap_[country] && this.subdivisionMap_[country][region];
    return isoCode && isoCode.length > 3 ? isoCode.substring(3) : '';
  }
}

export {SubdivReader};