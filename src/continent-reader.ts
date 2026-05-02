import {CsvReader, ReaderStatus} from './csv-reader.js';
import type {ContinentData} from './interfaces.js';

type ContinentMap = Record<string, ContinentData | undefined>;

class ContinentReader extends CsvReader {
  private continentMap_: ContinentMap;

  constructor() {
    super();
    this.continentMap_ = {};
    this.requiredCsvHeaders_ = ['lang', 'country_alpha2_code', 'continent_code', 'continent'];
  }

  /**
   * Process line from IP2Location continent database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected processRecord(record: Record<string, string>): void {
    if (record.lang !== 'EN') {
      return;
    }

    const {country_alpha2_code, continent_code, continent} = record;
    if (!country_alpha2_code) {
      return;
    }

    this.continentMap_[country_alpha2_code] = {
      continent_code,
      continent,
    };
  }

  /**
   * Reset stored data
   */
  protected resetData(): void {
    this.continentMap_ = {};
  }

  /**
   * Get continent info from a country code
   * @param country ISO 3166-1 country code from IP2Location database
   */
  public get(country: string): ContinentData | null {
    if (this.readerStatus !== ReaderStatus.Ready) {
      return null;
    }
    if (!country) {
      return null;
    }

    return this.continentMap_[country] ?? null;
  }
}

export {ContinentReader, ReaderStatus};
