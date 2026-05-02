import {CsvReader, ReaderStatus} from './csv-reader.js';
import type {OlsonTzData} from './interfaces.js';

type OlsonTzMap = Record<
  string,
  Record<string, Record<string, OlsonTzData | undefined> | undefined> | undefined
>;

class OlsonTzReader extends CsvReader {
  private olsonTzMap_: OlsonTzMap;

  constructor() {
    super();
    this.olsonTzMap_ = {};
    this.requiredCsvHeaders_ = [
      'country_code',
      'region_name',
      'city_name',
      'olson_tz',
      'abbreviation',
      'dst_start',
      'dst_end',
    ];
  }

  /**
   * Process line from IP2Location Olson TZ database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected processRecord(record: Record<string, string>): void {
    const {country_code, region_name, city_name, olson_tz, abbreviation, dst_start, dst_end} =
      record;
    if (!olson_tz) {
      return;
    }

    const countryMap = this.olsonTzMap_[country_code] ?? {};
    const regionMap = countryMap[region_name] ?? {};
    regionMap[city_name] = {
      olson_tz,
      abbreviation,
      dst_start: dst_start || null,
      dst_end: dst_end || null,
    };
    countryMap[region_name] = regionMap;
    this.olsonTzMap_[country_code] = countryMap;
  }

  /**
   * Reset stored data
   */
  protected resetData(): void {
    this.olsonTzMap_ = {};
  }

  /**
   * Get the Olson Time Zone from a country code, region, and city
   * @param country ISO 3166-1 country code from IP2Location database
   * @param region Region from from IP2Location database
   * @param city City from IP2Location database
   */
  public get(country: string, region: string, city: string): OlsonTzData | null {
    if (this.readerStatus !== ReaderStatus.Ready) {
      return null;
    }
    if (!country || !region || !city) {
      return null;
    }

    return this.olsonTzMap_[country]?.[region]?.[city] ?? null;
  }
}

export {OlsonTzReader, ReaderStatus};
