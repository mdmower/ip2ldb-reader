import {CsvReader, ReaderStatus} from './csv-reader';

interface GeoNameIdMap {
  [key: string]: {[key: string]: {[key: string]: number | undefined} | undefined} | undefined;
}

class GeoNameIdReader extends CsvReader {
  private geoNameIdMap_: GeoNameIdMap;

  constructor() {
    super();
    this.geoNameIdMap_ = {};
    this.requiredCsvHeaders_ = ['country_code', 'region_name', 'city_name', 'geonameid'];
  }

  /**
   * Process line from IP2Location GeoName ID database
   * @param record Individual row from CSV database, broken into key/value pairs based on CSV headers
   */
  protected processRecord(record: {[key: string]: string}): void {
    const {country_code, region_name, city_name, geonameid} = record;
    if (!/^\d+$/.test(geonameid)) {
      return;
    }

    const countryMap = this.geoNameIdMap_[country_code] || {};
    const regionMap = countryMap[region_name] || {};
    regionMap[city_name] = parseInt(geonameid);
    countryMap[region_name] = regionMap;
    this.geoNameIdMap_[country_code] = countryMap;
  }

  /**
   * Close database and uninitialize reader
   */
  public close(): void {
    super.close();
    this.geoNameIdMap_ = {};
  }

  /**
   * Get the GeoName ID from a country code, region, and city
   * @param country ISO 3166-1 country code from IP2Location database
   * @param region Region from from IP2Location database
   * @param city City from IP2Location database
   */
  public get(country: string, region: string, city: string): number | null {
    if (this.readerStatus !== ReaderStatus.Ready) {
      return null;
    }
    if (!country || !region || !city) {
      return 0;
    }

    const geoNameId = ((this.geoNameIdMap_[country] || {})[region] || {})[city];
    return geoNameId != undefined ? geoNameId : null;
  }
}

export {GeoNameIdReader, ReaderStatus};
