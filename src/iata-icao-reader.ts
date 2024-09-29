import {CsvReader, ReaderStatus} from './csv-reader.js';
import {IataIcaoData} from './interfaces.js';

type IataIcaoMap = Record<string, Record<string, IataIcaoData[] | undefined> | undefined>;

class IataIcaoReader extends CsvReader {
  private iataIcaoMap_: IataIcaoMap;

  constructor() {
    super();
    this.iataIcaoMap_ = {};
    this.requiredCsvHeaders_ = [
      'country_code',
      'region_name',
      'iata',
      'icao',
      'latitude',
      'longitude',
    ];
  }

  /**
   * Process line from IP2Location IATA/ICAO airport database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected processRecord(record: Record<string, string>): void {
    const normalizeStr = (val: string): string => {
      return val.replace(/^-$/, '');
    };

    const normalizeNum = (val: string): number | null => {
      const numStr = normalizeStr(val).trim();
      const num = numStr ? Number(numStr) : null;
      return num != null && !Number.isNaN(num) ? num : null;
    };

    const airportOutputData: IataIcaoData = {
      iata: '',
      icao: '',
      airport: '',
      latitude: null,
      longitude: null,
    };

    const {country_code, region_name} = record;
    for (const key in record) {
      if (['country_code', 'region_name'].includes(key)) {
        continue;
      }
      airportOutputData[key] = ['latitude', 'longitude'].includes(key)
        ? normalizeNum(record[key])
        : normalizeStr(record[key]);
    }

    const countryMap = this.iataIcaoMap_[country_code] ?? {};
    const regionArray = countryMap[region_name] ?? [];
    regionArray.push(airportOutputData);
    countryMap[region_name] = regionArray;
    this.iataIcaoMap_[country_code] = countryMap;
  }

  /**
   * Close database and uninitialize reader
   */
  public close(): void {
    super.close();
    this.iataIcaoMap_ = {};
  }

  /**
   * Get IATA/ICAO airport info from country code and region name
   * @param country ISO 3166-1 country code from IP2Location database
   * @param region Region from from IP2Location database
   */
  public get(country: string, region: string): IataIcaoData[] {
    if (this.readerStatus !== ReaderStatus.Ready) {
      return [];
    }
    if (!country || !region) {
      return [];
    }

    return this.iataIcaoMap_[country]?.[region] ?? [];
  }
}

export {IataIcaoReader, ReaderStatus};
