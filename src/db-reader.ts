import net from 'net';
import fs, {FSWatcher} from 'fs';
import {Ip2lData, Ip2lOptions} from './interfaces';

// prettier-ignore
const Position: {
  [key: string]: number[];
} = {
  country: [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  region: [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  city: [0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  isp: [0, 0, 3, 0, 5, 0, 7, 5, 7, 0, 8, 0, 9, 0, 9, 0, 9, 0, 9, 7, 9, 0, 9, 7, 9],
  latitude: [0, 0, 0, 0, 0, 5, 5, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  longitude: [0, 0, 0, 0, 0, 6, 6, 0, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  domain: [0, 0, 0, 0, 0, 0, 0, 6, 8, 0, 9, 0, 10, 0, 10, 0, 10, 0, 10, 8, 10, 0, 10, 8, 10],
  zipcode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 7, 0, 7, 7, 7, 0, 7, 0, 7, 7, 7, 0, 7],
  timezone: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 7, 8, 8, 8, 7, 8, 0, 8, 8, 8, 0, 8],
  netspeed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 11, 0, 11, 8, 11, 0, 11, 0, 11, 0, 11],
  iddcode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 0, 12, 0, 12, 9, 12, 0, 12],
  areacode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 13, 0, 13, 0, 13, 10, 13, 0, 13],
  weatherstationcode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 14, 0, 14, 0, 14, 0, 14],
  weatherstationname: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 15, 0, 15, 0, 15, 0, 15],
  mcc: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 16, 0, 16, 9, 16],
  mnc: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 17, 0, 17, 10, 17],
  mobilebrand: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 18, 0, 18, 11, 18],
  elevation: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 19, 0, 19],
  usagetype: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 20],
};

const MAX_SIZE = 65536;
const MAX_IPV4_RANGE = BigInt('4294967295');
const MAX_IPV6_RANGE = BigInt('340282366920938463463374607431768211455');
const FROM_6TO4 = BigInt('42545680458834377588178886921629466624');
const TO_6TO4 = BigInt('42550872755692912415807417417958686719');
const FROM_TEREDO = BigInt('42540488161975842760550356425300246528');
const TO_TEREDO = BigInt('42540488241204005274814694018844196863');
const LAST_32BITS = BigInt('4294967295');

enum ReaderStatus {
  NotInitialized = 0,
  Initializing,
  Ready,
}

class DbReader {
  private readerStatus_: ReaderStatus;
  private dbPath_: string | null;
  private fd_: number | null;
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
    Indexed: boolean;
    IndexedIPv6: boolean;
    OldBIN: boolean;
  };

  constructor() {
    this.readerStatus_ = ReaderStatus.NotInitialized;
    this.dbPath_ = null;
    this.fd_ = null;
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
   * Get numeric IPv4
   * @param ipv4 IPv4 address
   */
  private ipv4ToNum(ipv4: string): number {
    const d = ipv4.split('.');
    return ((+d[0] * 256 + +d[1]) * 256 + +d[2]) * 256 + +d[3];
  }

  /**
   * Get numeric IPv6
   * @param ipv6 IPv6 address
   */
  private ipv6ToNum(ipv6: string): bigint {
    const maxsections = 8; // should have 8 sections
    const sectionbits = 16; // 16 bits per section
    const m = ipv6.split('::');

    let total = BigInt(0);

    if (m.length === 2) {
      const arrLeft = m[0] !== '' ? m[0].split(':') : [];
      const arrRight = m[1] !== '' ? m[1].split(':') : [];

      for (let x = 0; x < arrLeft.length; x++) {
        total +=
          BigInt(parseInt('0x' + arrLeft[x])) << BigInt((maxsections - (x + 1)) * sectionbits);
      }

      for (let x = 0; x < arrRight.length; x++) {
        total +=
          BigInt(parseInt('0x' + arrRight[x])) << BigInt((arrRight.length - (x + 1)) * sectionbits);
      }
    } else if (m.length === 1) {
      const arr = m[0].split(':');

      for (let x = 0; x < arr.length; x++) {
        total += BigInt(parseInt('0x' + arr[x])) << BigInt((maxsections - (x + 1)) * sectionbits);
      }
    }

    return total;
  }

  /**
   * Load database
   * @param dbPath IP2Location BIN database
   */
  private loadDatabase(dbPath: string): void {
    this.dbPath_ = dbPath;

    if (this.fd_ !== null) {
      try {
        fs.closeSync(this.fd_);
      } catch (ex) {}
    }
    this.fd_ = fs.openSync(this.dbPath_, 'r');

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

    this.readerStatus_ = ReaderStatus.Initializing;

    this.loadDatabase(dbPath);

    if (options && options.reloadOnDbUpdate) {
      this.watchDbFile(dbPath);
    }

    this.readerStatus_ = ReaderStatus.Ready;
  }

  /**
   * Watch database file for changes and re-init if a change is detected
   * @param dbPath Path to watch
   */
  private watchDbFile(dbPath: string): void {
    let timeout: NodeJS.Timeout | null = null;
    let originalState: ReaderStatus = this.readerStatus_;

    const dbChangeHandler = (filename: string) => {
      if (filename && fs.existsSync(dbPath)) {
        if (this.fsWatcher_ !== null) {
          this.fsWatcher_.close();
          this.fsWatcher_ = null;
        }
        this.init(dbPath, <Ip2lOptions>{reloadOnDbUpdate: true});
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

    this.fsWatcher_ = fs.watch(dbPath, (eventType, filename) => {
      // Use a 500ms debounce on database changes before init re-runs,
      // but mark as initializing right away to avoid attempts to read
      // from the old file descriptor.
      originalState = this.readerStatus_;
      this.readerStatus_ = ReaderStatus.Initializing;
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        dbChangeHandler(filename);
      }, 500);
    });
  }

  /**
   * Populate data object with database query results for an IP address
   * @param ip IP address
   * @param ipVersion IP version
   * @param data Output data object
   */
  private query(ip: string, ipVersion: number, data: Ip2lData): void {
    let low: number = 0;
    let high: number;
    let maxIpRange: bigint;
    let baseAddr: number;
    let columnSize: number;
    let ipnum: bigint;

    if (ipVersion === 6) {
      maxIpRange = MAX_IPV6_RANGE;
      high = this.dbStats_.DBCountIPv6;
      baseAddr = this.dbStats_.BaseAddrIPv6;
      columnSize = this.dbStats_.ColumnSizeIPv6;
      ipnum = this.ipv6ToNum(ip);

      if (
        (ipnum >= FROM_6TO4 && ipnum <= TO_6TO4) ||
        (ipnum >= FROM_TEREDO && ipnum <= TO_TEREDO)
      ) {
        ipVersion = 4;
        maxIpRange = MAX_IPV4_RANGE;
        high = this.dbStats_.DBCount;
        baseAddr = this.dbStats_.BaseAddr;
        columnSize = this.dbStats_.ColumnSize;

        if (ipnum >= FROM_6TO4 && ipnum <= TO_6TO4) {
          ipnum = (ipnum >> BigInt(80)) & LAST_32BITS;
        } else {
          ipnum = ~ipnum & LAST_32BITS;
        }
        if (this.dbStats_.Indexed) {
          const indexaddr = Number(ipnum) >>> 16;
          low = this.indiciesIPv4_[indexaddr][0];
          high = this.indiciesIPv4_[indexaddr][1];
        }
        ipnum = BigInt(ipnum);
      } else {
        if (this.dbStats_.IndexedIPv6) {
          const indexaddr = Number(ipnum >> BigInt(112));
          low = this.indiciesIPv6_[indexaddr][0];
          high = this.indiciesIPv6_[indexaddr][1];
        }
      }
    } else {
      maxIpRange = MAX_IPV4_RANGE;
      high = this.dbStats_.DBCount;
      baseAddr = this.dbStats_.BaseAddr;
      columnSize = this.dbStats_.ColumnSize;
      ipnum = BigInt(this.ipv4ToNum(ip));

      if (this.dbStats_.Indexed) {
        const indexaddr = Number(ipnum) >>> 16;
        low = this.indiciesIPv4_[indexaddr][0];
        high = this.indiciesIPv4_[indexaddr][1];
      }
    }

    data.ip = ip;

    if (ipnum >= maxIpRange) {
      ipnum = maxIpRange - BigInt(1);
    }

    data.ip_no = ipnum.toString();

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const rowoffset = baseAddr + mid * columnSize;
      const rowoffset2 = rowoffset + columnSize;

      const ipfrom = ipVersion === 6 ? this.readInt128Big(rowoffset) : this.readInt32Big(rowoffset);
      const ipto = ipVersion === 6 ? this.readInt128Big(rowoffset2) : this.readInt32Big(rowoffset2);
      if (ipfrom === undefined || ipto === undefined) {
        break;
      }

      if (ipfrom <= ipnum && ipto > ipnum) {
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
              data[key] =
                Math.round(this.readBufferFloat(this.offset_[key], buff) * 1000000) / 1000000;
            } else {
              data[key] = this.readString(this.readBufferInt32(this.offset_[key], buff)) || '';
            }
          });

        data.status = 'OK';
        return;
      } else {
        if (ipfrom > ipnum) {
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
      ip: '',
      ip_no: '',
      status: '',
    };

    if (this.readerStatus_ === ReaderStatus.NotInitialized) {
      data.status = 'NOT_INITIALIZED';
    } else if (this.readerStatus_ === ReaderStatus.Initializing) {
      data.status = 'INITIALIZING';
    } else if (!this.dbPath_ || !fs.existsSync(this.dbPath_)) {
      data.status = 'DATABASE_NOT_FOUND';
    } else if (!this.dbStats_.DBType) {
      data.status = 'NOT_INITIALIZED';
    }

    if (data.status) {
      return data;
    }

    if (/^[:0]+:F{4}:(\d+\.){3}\d+$/i.test(ip)) {
      ip = ip.replace(/^[:0]+:F{4}:/i, '');
    } else if (/^[:0]+F{4}(:[\dA-Z]{4}){2}$/i.test(ip)) {
      let tmp = ip.replace(/^[:0]+F{4}:/i, '');
      tmp = tmp.replace(/:/, '');
      const tmparr = [];
      for (let x = 0; x < 8; x = x + 2) {
        tmparr.push(parseInt('0x' + tmp.substring(x, x + 2)));
      }
      ip = tmparr.join('.');
    }

    const iptype = net.isIP(ip);
    if (iptype === 0) {
      data.status = 'INVALID_IP_ADDRESS';
    } else if (iptype === 6 && this.dbStats_.OldBIN) {
      data.status = 'IPV6_NOT_SUPPORTED';
    }

    if (data.status) {
      return data;
    }

    this.query(ip, iptype, data);
    return data;
  }
}

export {DbReader};
