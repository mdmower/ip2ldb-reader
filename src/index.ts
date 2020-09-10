import {DbReader} from './db-reader';
import {Ip2lOptions, Ip2lData} from './interfaces';

export default class Ip2lReader {
  /**
   * Initialize IP2Location database reader
   * @param dbPath IP2Location BIN database
   * @param options Options for database reader
   */
  public init: (dbPath: string, options?: Ip2lOptions) => Promise<void>;

  /**
   * Query IP2Location database with an IP and get location information
   * @param ip IP address
   */
  public get: (ip: string) => Ip2lData;

  constructor() {
    const dbReader = new DbReader();

    this.init = dbReader.init.bind(dbReader);
    this.get = dbReader.get.bind(dbReader);
  }
}

export {Ip2lData, Ip2lOptions, Ip2lReader};
