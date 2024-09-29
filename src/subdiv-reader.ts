import {ReaderStatus, CsvReader} from './csv-reader.js';

type SubdivisionMap = Record<string, Record<string, string | undefined> | undefined>;

class SubdivReader extends CsvReader {
  private subdivisionMap_: SubdivisionMap;

  constructor() {
    super();
    this.subdivisionMap_ = {};
    this.requiredCsvHeaders_ = ['country_code', 'subdivision_name', 'code'];
  }

  /**
   * Process line from IP2Location subdivision database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected processRecord(record: Record<string, string>): void {
    const {country_code, subdivision_name, code} = record;

    const subdivisionCode = code?.length > 3 ? code.substring(3) : undefined;
    if (!subdivisionCode) {
      return;
    }

    const countryMap = this.subdivisionMap_[country_code] ?? {};
    countryMap[subdivision_name] = subdivisionCode;
    this.subdivisionMap_[country_code] = countryMap;
  }

  /**
   * Close database and uninitialize reader
   */
  public close(): void {
    super.close();
    this.subdivisionMap_ = {};
  }

  /**
   * Get the ISO 3166-2 subdivision part from a country code and region
   * @param country ISO 3166-1 country code from IP2Location database
   * @param region Region from from IP2Location database
   */
  public get(country: string, region: string): string | null {
    if (this.readerStatus !== ReaderStatus.Ready) {
      return null;
    }
    if (!country || !region) {
      return null;
    }

    return this.subdivisionMap_[country]?.[region] ?? null;
  }
}

export {SubdivReader, ReaderStatus};
