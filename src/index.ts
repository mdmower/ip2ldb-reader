import {DbReader} from './db-reader';
import {Ip2lOptions, Ip2lData} from './interfaces';
import {SubdivReader} from './subdiv-reader';
import {GeoNameIdReader} from './geonameid-reader';

export default class Ip2lReader {
  private dbReader_: DbReader;
  private subdivReader_: SubdivReader | undefined;
  private geoNameIdReader_: GeoNameIdReader | undefined;

  constructor() {
    this.dbReader_ = new DbReader();
    this.subdivReader_ = undefined;
    this.geoNameIdReader_ = undefined;
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
          ip2lData['subdivision'] = subdivision;
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
          ip2lData['geoname_id'] = geoNameId;
        }
      }
    }

    return ip2lData;
  }
}

export {Ip2lData, Ip2lOptions, Ip2lReader};
