import {DbReader} from './db-reader';
import {Ip2lOptions, Ip2lData} from './interfaces';
import {SubdivReader} from './subdiv-reader';

export default class Ip2lReader {
  private dbReader_: DbReader;
  private subdivReader_: SubdivReader | undefined;

  constructor() {
    this.dbReader_ = new DbReader();
    this.subdivReader_ = undefined;
  }

  /**
   * Initialize IP2Location database reader
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

    return ip2lData;
  }
}

export {Ip2lData, Ip2lOptions, Ip2lReader};
