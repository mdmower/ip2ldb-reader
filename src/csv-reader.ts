import fs, {FSWatcher} from 'fs';
import csvParser from 'csv-parser';

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

abstract class CsvReader {
  private readerStatus_: ReaderStatus;
  private fsWatcher_: FSWatcher | null;
  private reloadPromise_: Promise<void>;
  protected requiredCsvHeaders_: string[];

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.fsWatcher_ = null;
    this.reloadPromise_ = Promise.resolve();
    this.requiredCsvHeaders_ = [];
  }

  /**
   * Load IP2Location CSV databas
   * @param csvPath Filesystem path to IP2Location CSV database
   */
  private async loadCsv(csvPath: string): Promise<void> {
    const parser = fs.createReadStream(csvPath).pipe(csvParser());

    let firstRecord = true;

    for await (const record of parser) {
      const inputData = record as {[key: string]: string};

      if (
        firstRecord &&
        Object.keys(inputData).filter((key) => this.requiredCsvHeaders_.includes(key)).length !==
          this.requiredCsvHeaders_.length
      ) {
        throw new Error('CSV database does not have expected headings');
      }
      firstRecord = false;

      this.processRecord(inputData);
    }
  }

  /**
   * Process line from CSV database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected abstract processRecord(record: {[key: string]: string}): void;

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

    this.fsWatcher_ = null;
  }

  /**
   * Initialize reader
   * @param dbPath IP2Location CSV database
   * @param reloadOnDbUpdate Options for database reader
   */
  public async init(dbPath: string, reloadOnDbUpdate?: boolean): Promise<void> {
    if (!dbPath) {
      throw new Error('Must specify path to CSV database');
    }

    this.readerStatus_ = ReaderStatus.Initializing;

    await this.loadCsv(dbPath);

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
      if (!filename) {
        return;
      }

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
}

export {CsvReader, ReaderStatus};
