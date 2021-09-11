import {DbReader} from './db-reader';
import {Ip2lOptions, Ip2lData} from './interfaces';
import {SubdivReader} from './subdiv-reader';
import {GeoNameIdReader} from './geonameid-reader';
import {CountryInfoReader} from './country-info-reader';
import {IataIcaoReader} from './iata-icao-reader';

export default class Ip2lReader {
  private dbReader_: DbReader;
  private subdivReader_?: SubdivReader;
  private geoNameIdReader_?: GeoNameIdReader;
  private countryInfoReader_?: CountryInfoReader;
  private iataIcaoReader_?: IataIcaoReader;

  constructor() {
    this.dbReader_ = new DbReader();
  }

  /**
   * Initialize IP2Location database reader(s)
   * @param dbPath IP2Location BIN database
   * @param options Options for database reader
   */
  public async init(dbPath: string, options?: Ip2lOptions): Promise<void> {
    this.dbReader_.init(dbPath, options);

    if (!options) {
      return;
    }

    // Subdivision support
    if (options.subdivisionCsvPath) {
      this.subdivReader_ = new SubdivReader();
      await this.subdivReader_.init(options.subdivisionCsvPath, options.reloadOnDbUpdate);
    }

    // GeoName ID support
    if (options.geoNameIdCsvPath) {
      this.geoNameIdReader_ = new GeoNameIdReader();
      await this.geoNameIdReader_.init(options.geoNameIdCsvPath, options.reloadOnDbUpdate);
    }

    // Country info support
    if (options.countryInfoCsvPath) {
      this.countryInfoReader_ = new CountryInfoReader();
      await this.countryInfoReader_.init(options.countryInfoCsvPath, options.reloadOnDbUpdate);
    }

    if (options.iataIcaoCsvPath) {
      this.iataIcaoReader_ = new IataIcaoReader();
      await this.iataIcaoReader_.init(options.iataIcaoCsvPath, options.reloadOnDbUpdate);
    }
  }

  /**
   * Query IP2Location database with an IP and get location information
   * @param ip IP address
   */
  public get(ip: string): Ip2lData {
    const ip2lData = this.dbReader_.get(ip);

    // Subdivision support is optional
    if (this.subdivReader_) {
      if (typeof ip2lData.country_short === 'string' && typeof ip2lData.region === 'string') {
        const subdivision = this.subdivReader_.get(ip2lData.country_short, ip2lData.region);
        if (subdivision !== null) {
          ip2lData.subdivision = subdivision;
        }
      }
    }

    // GeoName ID support is optional
    if (this.geoNameIdReader_) {
      if (
        typeof ip2lData.country_short === 'string' &&
        typeof ip2lData.region === 'string' &&
        typeof ip2lData.city === 'string'
      ) {
        const geoNameId = this.geoNameIdReader_.get(
          ip2lData.country_short,
          ip2lData.region,
          ip2lData.city
        );
        if (geoNameId !== null) {
          ip2lData.geoname_id = geoNameId;
        }
      }
    }

    // Country info support is optional
    if (this.countryInfoReader_) {
      if (typeof ip2lData.country_short === 'string') {
        const countryInfo = this.countryInfoReader_.get(ip2lData.country_short);
        ip2lData.country_info = countryInfo;
      }
    }

    // IATA/ICAO airport info support is optional
    if (this.iataIcaoReader_) {
      if (typeof ip2lData.country_short === 'string' && typeof ip2lData.region === 'string') {
        const airports = this.iataIcaoReader_.get(ip2lData.country_short, ip2lData.region);
        ip2lData.airports = airports;
      }
    }

    return ip2lData;
  }

  /**
   * Close IP2Location database(s) and uninitialize reader(s)
   */
  public close(): void {
    this.dbReader_.close();
    this.subdivReader_?.close();
    this.geoNameIdReader_?.close();
    this.countryInfoReader_?.close();
    this.iataIcaoReader_?.close();
  }
}

export {Ip2lData, Ip2lOptions, Ip2lReader};
