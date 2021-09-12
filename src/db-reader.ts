import {parseIp} from './ip-utils';
import fs, {FSWatcher} from 'fs';
import {Ip2lData, Ip2lOptions} from './interfaces';

// prettier-ignore
const Position: {
  [key: string]: number[];
} = {
  country: [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  region: [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  city: [0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  isp: [0, 0, 3, 0, 5, 0, 7, 5, 7, 0, 8, 0, 9, 0, 9, 0, 9, 0, 9, 7, 9, 0, 9, 7, 9, 9],
  latitude: [0, 0, 0, 0, 0, 5, 5, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  longitude: [0, 0, 0, 0, 0, 6, 6, 0, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  domain: [0, 0, 0, 0, 0, 0, 0, 6, 8, 0, 9, 0, 10, 0, 10, 0, 10, 0, 10, 8, 10, 0, 10, 8, 10, 10],
  zipcode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 7, 0, 7, 7, 7, 0, 7, 0, 7, 7, 7, 0, 7, 7],
  timezone: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 7, 8, 8, 8, 7, 8, 0, 8, 8, 8, 0, 8, 8],
  netspeed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 11, 0, 11, 8, 11, 0, 11, 0, 11, 0, 11, 11],
  iddcode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 0, 12, 0, 12, 9, 12, 0, 12, 12],
  areacode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 13, 0, 13, 0, 13, 10, 13, 0, 13, 13],
  weatherstationcode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 14, 0, 14, 0, 14, 0, 14, 14],
  weatherstationname: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 15, 0, 15, 0, 15, 0, 15, 15],
  mcc: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 16, 0, 16, 9, 16, 16],
  mnc: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 17, 0, 17, 10, 17, 17],
  mobilebrand: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 18, 0, 18, 11, 18, 18],
  elevation: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 19, 0, 19, 19],
  usagetype: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 20, 20],
  addresstype: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 21],
  category: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22],
};

const MAX_SIZE = 65536;
const MAX_IPV4_RANGE = BigInt('4294967295');
const MAX_IPV6_RANGE = BigInt('340282366920938463463374607431768211455');

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

class DbReader {
  private readerStatus_: ReaderStatus;
  private dbPath_: string | null;
  private cacheInMemory_: boolean;
  private fd_: number | null;
  private dbCache_: Buffer | null;
  private fsWatcher_: FSWatcher | null;
  private indiciesIPv4_: number[][];
  private indiciesIPv6_: number[][];
  private offset_: {[key: string]: number};
  private enabled_: {[key: string]: boolean};
  private dbStats_: {
    DBType: number;
    DBColumn: number;
    DBYear: number;
    DBMonth: number;
    DBDay: number;
    DBCount: number;
    DBCountIPv6: number;
    BaseAddr: number;
    BaseAddrIPv6: number;
    IndexBaseAddr: number;
    IndexBaseAddrIPv6: number;
    ColumnSize: number;
    ColumnSizeIPv6: number;
    ProductCode: number;
    ProductType: number;
    FileSize: number;
    Indexed: boolean;
    IndexedIPv6: boolean;
    OldBIN: boolean;
  };

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.dbPath_ = null;
    this.cacheInMemory_ = false;
    this.fd_ = null;
    this.dbCache_ = null;
    this.fsWatcher_ = null;

    this.indiciesIPv4_ = [];
    this.indiciesIPv6_ = [];

    this.offset_ = {};

    this.enabled_ = {};

    this.dbStats_ = {
      DBType: 0,
      DBColumn: 0,
      DBYear: 0,
      DBMonth: 0,
      DBDay: 0,
      DBCount: 0,
      DBCountIPv6: 0,
      BaseAddr: 0,
      BaseAddrIPv6: 0,
      IndexBaseAddr: 0,
      IndexBaseAddrIPv6: 0,
      ColumnSize: 0,
      ColumnSizeIPv6: 0,
      ProductCode: 0,
      ProductType: 0,
      FileSize: 0,
      Indexed: false,
      IndexedIPv6: false,
      OldBIN: false,
    };
  }

  /**
   * Read data from database into a buffer
   * @param readbytes Number of bytes to read
   * @param pos Offset from beginning of database
   */
  private readToBuffer(readbytes: number, pos: number): Buffer | undefined {
    if (this.dbCache_) {
      // TODO: A readonly buffer would be nice
      // https://github.com/nodejs/node/issues/27080
      const buff = this.dbCache_.subarray(pos, pos + readbytes);
      return buff.length === readbytes ? buff : undefined;
    }

    if (!this.fd_) {
      throw new Error('Missing file descriptor, cannot read data');
    }

    const buff = Buffer.alloc(readbytes);
    const totalread = fs.readSync(this.fd_, buff, 0, readbytes, pos);
    return totalread === readbytes ? buff : undefined;
  }

  /**
   * Read 8-bit integer from the database
   * @param pos Offset from beginning of database
   */
  private readInt8(pos: number): number | undefined {
    const buff = this.readToBuffer(1, pos - 1);
    return buff ? buff.readUInt8(0) : undefined;
  }

  /**
   * Read 32-bit integer from the database
   * @param pos Offset from beginning of database
   */
  private readInt32(pos: number): number | undefined {
    const buff = this.readToBuffer(4, pos - 1);
    return buff ? buff.readUInt32LE(0) : undefined;
  }

  /**
   * Read 32-bit integer from the database as a BigInt
   * @param pos Offset from beginning of database
   */
  private readInt32Big(pos: number): bigint | undefined {
    const buff = this.readToBuffer(4, pos - 1);
    return buff ? BigInt(buff.readUInt32LE(0)) : undefined;
  }

  /**
   * Read 32-bit float from the database
   * @param pos Offset from beginning of database
   */
  private readFloat(pos: number): number | undefined {
    const buff = this.readToBuffer(4, pos - 1);
    return buff ? buff.readFloatLE(0) : undefined;
  }

  /**
   * Read 128-bit integer from the database as a BigInt
   * @param pos Offset from beginning of database
   */
  private readInt128Big(pos: number): bigint | undefined {
    const buff = this.readToBuffer(16, pos - 1);
    if (!buff) {
      return;
    }

    let ret = BigInt(0);
    for (let x = 0; x < 16; x++) {
      ret += BigInt(buff.readUInt8(x)) << BigInt(8 * x);
    }
    return ret;
  }

  /**
   * Read string from the database
   * @param pos Offset from beginning of database
   */
  private readString(pos: number): string | undefined {
    const strBytes = this.readInt8(pos + 1);
    if (!strBytes) {
      return;
    }

    const buff = this.readToBuffer(strBytes, pos + 1);
    const str = buff ? buff.toString('utf8') : undefined;
    return str === '-' ? '' : str;
  }

  /**
   * Read 32-bit integer from a Buffer
   * @param pos Offset from beginning of buffer
   * @param buff Buffer
   */
  private readBufferInt32(pos: number, buff: Buffer): number {
    return buff.readUInt32LE(pos);
  }

  /**
   * Read 32-bit float from a buffer
   * @param pos Offset from beginning of buffer
   * @param buff Buffer
   */
  private readBufferFloat(pos: number, buff: Buffer): number {
    return buff.readFloatLE(pos);
  }

  /**
   * (Re)load database
   */
  private loadDatabase(): void {
    if (!this.dbPath_) {
      throw new Error('Path to database not available');
    }

    this.readerStatus_ = ReaderStatus.Initializing;

    if (this.fd_ !== null) {
      try {
        fs.closeSync(this.fd_);
      } catch (ex) {}
    }

    if (this.cacheInMemory_) {
      this.fd_ = null;
      this.dbCache_ = fs.readFileSync(this.dbPath_);
    } else {
      this.fd_ = fs.openSync(this.dbPath_, 'r');
      this.dbCache_ = null;
    }

    this.dbStats_.DBType = this.readInt8(1) || 0;
    this.dbStats_.DBColumn = this.readInt8(2) || 0;
    this.dbStats_.DBYear = this.readInt8(3) || 0;
    this.dbStats_.DBMonth = this.readInt8(4) || 0;
    this.dbStats_.DBDay = this.readInt8(5) || 0;
    this.dbStats_.DBCount = this.readInt32(6) || 0;
    this.dbStats_.BaseAddr = this.readInt32(10) || 0;
    this.dbStats_.DBCountIPv6 = this.readInt32(14) || 0;
    this.dbStats_.BaseAddrIPv6 = this.readInt32(18) || 0;
    this.dbStats_.IndexBaseAddr = this.readInt32(22) || 0;
    this.dbStats_.IndexBaseAddrIPv6 = this.readInt32(26) || 0;
    this.dbStats_.ProductCode = this.readInt8(30) || 0;
    this.dbStats_.ProductType = this.readInt8(31) || 0;
    this.dbStats_.FileSize = this.readInt32(32) || 0;

    // Check if this is a valid BIN. ProductCode should be 1 for BIN files from Jan 2021 onwards.
    if (this.dbStats_.ProductCode !== 1 && this.dbStats_.DBYear >= 21) {
      throw new Error(
        'Incorrect IP2Location BIN file format. Please make sure that you are using the latest IP2Location BIN file.'
      );
    }

    // Check whether this is a zip file (PK would be the first 2 chars).
    if (this.dbStats_.DBType == 'P'.charCodeAt(0) && this.dbStats_.DBColumn === 'K'.charCodeAt(0)) {
      throw new Error('Incorrect IP2Location BIN file format. Please uncompress zip file.');
    }

    this.dbStats_.Indexed = this.dbStats_.IndexBaseAddr > 0;
    this.dbStats_.OldBIN = !this.dbStats_.DBCountIPv6;
    this.dbStats_.IndexedIPv6 = !this.dbStats_.OldBIN && this.dbStats_.IndexBaseAddrIPv6 > 0;

    // 4 bytes per column
    this.dbStats_.ColumnSize = this.dbStats_.DBColumn << 2;
    // 4 bytes per column, except IPFrom column which is 16 bytes
    this.dbStats_.ColumnSizeIPv6 = 16 + ((this.dbStats_.DBColumn - 1) << 2);

    const dbType = this.dbStats_.DBType;

    Object.keys(Position).forEach((key) => {
      this.offset_[key] = Position[key][dbType] ? (Position[key][dbType] - 2) << 2 : 0;
    });

    Object.keys(Position).forEach((key) => {
      this.enabled_[key] = Boolean(Position[key][dbType]);
    });

    this.indiciesIPv4_ = new Array<number[]>(MAX_SIZE);
    this.indiciesIPv6_ = new Array<number[]>(MAX_SIZE);

    if (this.dbStats_.Indexed) {
      let pointer = this.dbStats_.IndexBaseAddr;

      for (let x = 0; x < MAX_SIZE; x++) {
        this.indiciesIPv4_[x] = [this.readInt32(pointer) || 0, this.readInt32(pointer + 4) || 0];
        pointer += 8;
      }

      if (this.dbStats_.IndexedIPv6) {
        for (let x = 0; x < MAX_SIZE; x++) {
          this.indiciesIPv6_[x] = [this.readInt32(pointer) || 0, this.readInt32(pointer + 4) || 0];
          pointer += 8;
        }
      }
    }

    this.readerStatus_ = ReaderStatus.Ready;
  }

  /**
   * Get reader status
   */
  public get readerStatus(): ReaderStatus {
    return this.readerStatus_;
  }

  /**
   * Close database and uninitialize reader
   */
  public close(): void {
    this.readerStatus_ = ReaderStatus.NotInitialized;

    if (this.fd_ !== null) {
      try {
        fs.closeSync(this.fd_);
      } catch (ex) {}
    }

    if (this.fsWatcher_ !== null) {
      this.fsWatcher_.close();
    }

    this.dbPath_ = null;
    this.cacheInMemory_ = false;
    this.fd_ = null;
    this.dbCache_ = null;
    this.fsWatcher_ = null;

    this.indiciesIPv4_ = [];
    this.indiciesIPv6_ = [];

    this.offset_ = {};

    this.enabled_ = {};

    this.dbStats_ = {
      DBType: 0,
      DBColumn: 0,
      DBYear: 0,
      DBMonth: 0,
      DBDay: 0,
      DBCount: 0,
      DBCountIPv6: 0,
      BaseAddr: 0,
      BaseAddrIPv6: 0,
      IndexBaseAddr: 0,
      IndexBaseAddrIPv6: 0,
      ColumnSize: 0,
      ColumnSizeIPv6: 0,
      ProductCode: 0,
      ProductType: 0,
      FileSize: 0,
      Indexed: false,
      IndexedIPv6: false,
      OldBIN: false,
    };
  }

  /**
   * Initialize IP2Location database reader
   * @param dbPath IP2Location BIN database
   * @param options Options for database reader
   */
  public init(dbPath: string, options?: Ip2lOptions): void {
    if (!dbPath) {
      throw new Error('Must specify path to database');
    }

    this.dbPath_ = dbPath;
    this.cacheInMemory_ = options?.cacheDatabaseInMemory || false;

    this.loadDatabase();

    if (options && options.reloadOnDbUpdate) {
      this.watchDbFile();
    }
  }

  /**
   * Watch database file for changes and re-init if a change is detected
   */
  private watchDbFile(): void {
    let timeout: NodeJS.Timeout | null = null;
    const originalState: ReaderStatus = this.readerStatus_;

    const dbChangeHandler = (filename: string) => {
      if (filename && this.dbPath_ && fs.existsSync(this.dbPath_)) {
        this.fsWatcher_?.close();
        this.loadDatabase();
        this.fsWatcher_ = getFsWatch();
      } else {
        // TODO: This isn't terrific, since the reader status will be
        // marked as 'Ready' if a database suddenly disappears. It
        // tends to work ok, though, since .get() will report
        // DATABASE_NOT_FOUND right away without making any attempt
        // to read from the missing database, and once it reappears,
        // the FS watcher will re-init.
        this.readerStatus_ = originalState;
      }
    };

    const getFsWatch = (): fs.FSWatcher => {
      if (!this.dbPath_) {
        throw new Error('Path to database not available');
      }

      return fs.watch(this.dbPath_, (eventType, filename) => {
        // Use a 500ms debounce on database changes before database reloads.
        // If we are reading from a database on disk (the default case), we
        // need to flag the reader as initializing right away to avoid
        // reading from the old file descriptor.
        if (this.fd_) {
          this.readerStatus_ = ReaderStatus.Initializing;
        }

        if (timeout !== null) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          timeout = null;
          dbChangeHandler(filename);
        }, 500);
      });
    };

    this.fsWatcher_ = getFsWatch();
  }

  /**
   * Populate data object with database query results for an IP address
   * @param ipNum IP number
   * @param ipVersion IP version
   * @param data Output data object
   */
  private query(ipNum: bigint, ipVersion: number, data: Ip2lData): void {
    let low: number = 0;
    let high: number;
    let maxIpRange: bigint;
    let baseAddr: number;
    let columnSize: number;

    if (ipVersion === 6) {
      maxIpRange = MAX_IPV6_RANGE;
      high = this.dbStats_.DBCountIPv6;
      baseAddr = this.dbStats_.BaseAddrIPv6;
      columnSize = this.dbStats_.ColumnSizeIPv6;

      if (this.dbStats_.IndexedIPv6) {
        const indexaddr = Number(ipNum >> BigInt(112));
        low = this.indiciesIPv6_[indexaddr][0];
        high = this.indiciesIPv6_[indexaddr][1];
      }
    } else {
      maxIpRange = MAX_IPV4_RANGE;
      high = this.dbStats_.DBCount;
      baseAddr = this.dbStats_.BaseAddr;
      columnSize = this.dbStats_.ColumnSize;

      if (this.dbStats_.Indexed) {
        const indexaddr = Number(ipNum) >>> 16;
        low = this.indiciesIPv4_[indexaddr][0];
        high = this.indiciesIPv4_[indexaddr][1];
      }
    }

    if (ipNum >= maxIpRange) {
      ipNum = maxIpRange - BigInt(1);
    }

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const rowoffset = baseAddr + mid * columnSize;
      const rowoffset2 = rowoffset + columnSize;

      const ipfrom = ipVersion === 6 ? this.readInt128Big(rowoffset) : this.readInt32Big(rowoffset);
      const ipto = ipVersion === 6 ? this.readInt128Big(rowoffset2) : this.readInt32Big(rowoffset2);
      if (ipfrom === undefined || ipto === undefined) {
        break;
      }

      if (ipfrom <= ipNum && ipto > ipNum) {
        const firstcol = ipVersion === 6 ? 16 : 4;
        const buff = this.readToBuffer(columnSize - firstcol, rowoffset + firstcol - 1);
        if (!buff) {
          break;
        }

        Object.keys(this.enabled_)
          .filter((key) => this.enabled_[key])
          .forEach((key) => {
            if (key === 'country') {
              const countrypos = this.readBufferInt32(this.offset_[key], buff);
              data['country_short'] = this.readString(countrypos) || '';
              data['country_long'] = this.readString(countrypos + 3) || '';
            } else if (key === 'longitude' || key === 'latitude') {
              const num = this.readBufferFloat(this.offset_[key], buff);
              data[key] = num !== 0 ? Math.round(num * 1000000) / 1000000 : null;
            } else {
              data[key] = this.readString(this.readBufferInt32(this.offset_[key], buff)) || '';
            }
          });

        data.status = 'OK';
        return;
      } else {
        if (ipfrom > ipNum) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
    }

    data.status = 'IP_ADDRESS_NOT_FOUND';
  }

  /**
   * Query IP2Location database with an IP and get location information
   * @param ip IP address
   */
  public get(ip: string): Ip2lData {
    const data: Ip2lData = {
      ip,
      ip_no: '',
      status: '',
    };

    if (this.readerStatus_ === ReaderStatus.NotInitialized) {
      data.status = 'NOT_INITIALIZED';
    } else if (this.readerStatus_ === ReaderStatus.Initializing) {
      data.status = 'INITIALIZING';
    } else if (!this.dbPath_ || (!this.dbCache_ && !fs.existsSync(this.dbPath_))) {
      data.status = 'DATABASE_NOT_FOUND';
    } else if (!this.dbStats_.DBType) {
      data.status = 'NOT_INITIALIZED';
    }

    if (data.status) {
      return data;
    }

    let ipVersion: number;
    let ipNum: bigint;
    ({ip, ipVersion, ipNum} = parseIp(ip));

    if (!ipVersion) {
      data.status = 'INVALID_IP_ADDRESS';
    } else if (ipVersion === 6 && this.dbStats_.OldBIN) {
      data.status = 'IPV6_NOT_SUPPORTED';
    }

    if (data.status) {
      return data;
    }

    data.ip_no = ipNum.toString();

    this.query(ipNum, ipVersion, data);
    return data;
  }
}

export {DbReader, ReaderStatus};
