import {CsvReader, ReaderStatus} from './csv-reader';
import {CountryInfoData} from './interfaces';

interface CountryInfoMap {
  [key: string]: CountryInfoData | undefined;
}

class CountryInfoReader extends CsvReader {
  private countryInfoMap_: CountryInfoMap;

  constructor() {
    super();
    this.countryInfoMap_ = {};
    this.requiredCsvHeaders_ = ['country_code', 'capital', 'total_area'];
  }

  /**
   * Process line from IP2Location country info database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected processRecord(record: {[key: string]: string}): void {
    const normalizeStr = (val: string): string => {
      return val.replace(/^-$/, '');
    };

    const normalizeNum = (val: string): number | null => {
      const numStr = normalizeStr(val).trim();
      const num = numStr ? Number(numStr) : null;
      return num != null && !Number.isNaN(num) ? num : null;
    };

    const countryInfoData: CountryInfoData = {
      country_code: null,
      capital: null,
      total_area: null,
    };

    for (const key in record) {
      countryInfoData[key] = [
        'country_numeric_code',
        'total_area',
        'population',
        'idd_code',
      ].includes(key)
        ? normalizeNum(record[key])
        : normalizeStr(record[key]);
    }
    if (countryInfoData.country_code) {
      this.countryInfoMap_[countryInfoData.country_code] = countryInfoData;
    }
  }

  /**
   * Close database and uninitialize reader
   */
  public close(): void {
    super.close();
    this.countryInfoMap_ = {};
  }

  /**
   * Get country info from a country code
   * @param country ISO 3166-1 country code from IP2Location database
   */
  public get(country: string): CountryInfoData | null {
    if (this.readerStatus !== ReaderStatus.Ready) {
      return null;
    }
    if (!country) {
      return null;
    }

    return this.countryInfoMap_[country] || null;
  }
}

export {CountryInfoReader, ReaderStatus};
