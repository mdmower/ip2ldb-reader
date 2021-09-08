import fs, {FSWatcher} from 'fs';
import readline from 'readline';
import {CountryInfoData} from './interfaces';

interface CountryInfoMap {
  [key: string]: CountryInfoData | undefined;
}

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

enum CsvVariant {
  Basic,
  More,
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
    const expectedHeaderBasic = '"country_code","capital","total_area"';
    const expectedLineBasicRe = /^"(\w{2})","([^"]*)","([^"]*)"$/;
    const expectedHeaderMore =
      '"country_code","country_name","country_alpha3_code","country_numeric_code","capital","country_demonym","total_area","population","idd_code","currency_code","currency_name","currency_symbol","lang_code","lang_name","cctld"';
    const expectedLineMoreRe =
      /^"(\w{2})","([^"]*)","([^"]*)","([\d\-]*)","([^"]*)","([^"]*)","([\d\-\.]*)","([\d\-]*)","([\d\-]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/;
    let countryInfoMap: CountryInfoMap | null = {};

    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath),
      crlfDelay: Infinity,
    });

    let firstLine = true;
    let variant: CsvVariant;

    const normalizeStr = (val: string): string => {
      return val.replace(/^-$/, '');
    };

    const normalizeNum = (val: string): number | null => {
      const numStr = normalizeStr(val).trim();
      const num = numStr ? Number(numStr) : null;
      return num != null && !Number.isNaN(num) ? num : null;
    };

    const processLine = (line: string) => {
      if (firstLine) {
        if (line === expectedHeaderMore) {
          variant = CsvVariant.More;
        } else if (line === expectedHeaderBasic) {
          variant = CsvVariant.Basic;
        } else {
          countryInfoMap = null;
          rl.close();
        }
        firstLine = false;
      }

      if (!countryInfoMap) {
        return;
      }

      if (variant === CsvVariant.Basic) {
        const match = expectedLineBasicRe.exec(line);
        if (match) {
          countryInfoMap[match[1]] = {
            capital: normalizeStr(match[2]),
            total_area: normalizeNum(match[3]),
          };
        }
      } else if (variant === CsvVariant.More) {
        const match = expectedLineMoreRe.exec(line);
        if (match) {
          countryInfoMap[match[1]] = {
            country_name: normalizeStr(match[2]),
            country_alpha3_code: normalizeStr(match[3]),
            country_numeric_code: normalizeNum(match[4]),
            capital: normalizeStr(match[5]),
            country_demonym: normalizeStr(match[6]),
            total_area: normalizeNum(match[7]),
            population: normalizeNum(match[8]),
            idd_code: normalizeNum(match[9]),
            currency_code: normalizeStr(match[10]),
            currency_name: normalizeStr(match[11]),
            currency_symbol: normalizeStr(match[12]),
            lang_code: normalizeStr(match[13]),
            lang_name: normalizeStr(match[14]),
            cctld: normalizeStr(match[15]),
          };
        }
      } else {
        countryInfoMap = null;
      }
    };

    return new Promise((resolve) => {
      rl.on('line', processLine).on('close', () => {
        if (countryInfoMap !== null) {
          this.countryInfoMap_ = countryInfoMap;
        }
        resolve();
      });
    });
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
