import {ReaderStatus, CsvReader} from './csv-reader.js';

interface SampleResult {
  [key: string]: string | number;
}

interface SampleCsvMap {
  [key: string]: SampleResult | undefined;
}

class SampleCsvReader extends CsvReader {
  private sampleCsvMap_: SampleCsvMap;

  constructor() {
    super();
    this.sampleCsvMap_ = {};
    this.requiredCsvHeaders_ = ['column_1', 'column_2', 'column_3'];
  }

  /**
   * Process line from sample CSV database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected processRecord(record: {[key: string]: string}): void {
    const {column_1, column_2, column_3} = record;

    this.sampleCsvMap_[column_1] = {
      column_2,
      column_3: Number(column_3),
    };
  }

  /**
   * Close database and uninitialize reader
   */
  public close(): void {
    super.close();
    this.sampleCsvMap_ = {};
  }

  /**
   * Get the sample database content
   * @param firstColumn First column name
   */
  public get(firstColumn: string): SampleResult | null {
    if (this.readerStatus !== ReaderStatus.Ready) {
      return null;
    }

    return this.sampleCsvMap_[firstColumn] || null;
  }
}

export {SampleCsvReader, ReaderStatus};
