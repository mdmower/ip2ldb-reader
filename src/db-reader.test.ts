import fs, {FSWatcher} from 'node:fs';
import {DbReader, ReaderStatus} from './db-reader.js';
import {parseIp} from './ip-utils.js';

describe('IP2Location DB reader', () => {
  // Requires sample BIN IPV6 DB26 database from
  // https://www.ip2location.com/database/db26-ip-country-region-city-latitude-longitude-zipcode-timezone-isp-domain-netspeed-areacode-weather-mobile-elevation-usagetype-addresstype-category-district-asn
  // to be decompressed, renamed to IP2LOCATION-SAMPLE-DB26.IPV6.BIN,
  // and made available in /database folder within project directory.
  // Note: full, paid database will not work; we're looking for string
  // "This is demo DB26 BIN database." to be returned.
  const db26Path = 'database/IP2LOCATION-SAMPLE-DB26.IPV6.BIN';

  describe('Identify with Sample IPv6 DB26', () => {
    let dbReader: DbReader;

    beforeAll(() => {
      dbReader = new DbReader();
      dbReader.init(db26Path);
    });

    afterAll(() => {
      dbReader.close();
    });

    it('Identifies IPv6 address', () => {
      const testIp = '2001:4860:4860::8888';
      const ipNum = parseIp(testIp).ipNum.toString();
      const dbResult = dbReader.get(testIp);

      const demoKeys = Object.keys(dbResult).filter((key) => {
        return !['country_short', 'ip', 'ip_no', 'latitude', 'longitude', 'status'].includes(key);
      });

      for (const demoKey of demoKeys) {
        expect(dbResult[demoKey]).toMatch(/^This is IP2Location DB26 IPv6 sample BIN database\./);
      }

      const {country_short, ip, ip_no, latitude, longitude, status} = dbResult;
      expect(country_short).toBe('');
      expect(ip).toBe(testIp);
      expect(ip_no).toBe(ipNum);
      expect(latitude).toBe(null);
      expect(longitude).toBe(null);
      expect(status).toBe('OK');
    });

    it('Identifies IPv4 address', () => {
      const testIp = '8.8.8.8';
      const ipNum = parseIp(testIp).ipNum.toString();
      const dbResult = dbReader.get(testIp);

      const expectedResultPartial = {
        country_short: 'US',
        ip: testIp,
        ip_no: ipNum,
        latitude: 37.386051,
        longitude: -122.083847,
        status: 'OK',
      };

      const {country_short, ip, ip_no, latitude, longitude, status} = dbResult;
      expect(country_short).toBe(expectedResultPartial.country_short);
      expect(ip).toBe(expectedResultPartial.ip);
      expect(ip_no).toBe(expectedResultPartial.ip_no);
      expect(latitude).toBeCloseTo(expectedResultPartial.latitude);
      expect(longitude).toBeCloseTo(expectedResultPartial.longitude);
      expect(status).toBe(expectedResultPartial.status);
    });

    it('Contains all DB26 keys', () => {
      const allDb26Keys = [
        'addresstype',
        'areacode',
        'as',
        'asn',
        'category',
        'city',
        'country_long',
        'country_short',
        'district',
        'domain',
        'elevation',
        'iddcode',
        'ip',
        'ip_no',
        'isp',
        'latitude',
        'longitude',
        'mcc',
        'mnc',
        'mobilebrand',
        'netspeed',
        'region',
        'status',
        'timezone',
        'usagetype',
        'weatherstationcode',
        'weatherstationname',
        'zipcode',
      ];

      const testIp = '2001:4860:4860::8888';
      const dbResult = dbReader.get(testIp);
      expect(Object.keys(dbResult).sort()).toEqual(allDb26Keys);
    });

    it('Does not identify invalid IPv6 address', () => {
      const testIp = '2001:4860:4860::FFFG';
      expect(dbReader.get(testIp)).toEqual({
        ip: testIp,
        ip_no: '',
        status: 'INVALID_IP_ADDRESS',
      });
    });

    it('Does not identify invalid IPv4 address', () => {
      const testIp = '255.255.255.256';
      expect(dbReader.get(testIp)).toEqual({
        ip: testIp,
        ip_no: '',
        status: 'INVALID_IP_ADDRESS',
      });
    });
  });

  // Requires LITE BIN IPV4 DB1 database from
  // https://lite.ip2location.com/database/db1-ip-country
  // to be decompressed, renamed to IP2LOCATION-LITE-DB1.BIN,
  // and made available in /database folder within project directory.
  const db1Path = 'database/IP2LOCATION-LITE-DB1.BIN';

  describe('Identify with LITE IPv4 DB1', () => {
    let dbReader: DbReader;

    beforeAll(() => {
      dbReader = new DbReader();
      dbReader.init(db1Path);
    });

    afterAll(() => {
      dbReader.close();
    });

    it('Identifies IPv4 address', () => {
      const testIp = '8.8.8.8';
      const ipNum = parseIp(testIp).ipNum.toString();
      const dbResult = dbReader.get(testIp);

      const expectedResultPartial = {
        country_short: 'US',
        country_long: 'United States of America',
        ip: testIp,
        ip_no: ipNum,
        status: 'OK',
      };

      const {country_short, country_long, ip, ip_no, status} = dbResult;
      expect(country_short).toBe(expectedResultPartial.country_short);
      expect(country_long).toBe(expectedResultPartial.country_long);
      expect(ip).toBe(expectedResultPartial.ip);
      expect(ip_no).toBe(expectedResultPartial.ip_no);
      expect(status).toBe(expectedResultPartial.status);
    });

    it('Contains only DB1 keys', () => {
      const allDb1Keys = ['country_long', 'country_short', 'ip', 'ip_no', 'status'];

      const testIp = '8.8.8.8';
      const dbResult = dbReader.get(testIp);
      expect(Object.keys(dbResult).sort()).toEqual(allDb1Keys);
    });

    it('Does not identify IPv6 address', () => {
      const testIp = '2001:4860:4860::8888';
      expect(dbReader.get(testIp)).toEqual({
        ip: testIp,
        ip_no: '',
        status: 'IPV6_NOT_SUPPORTED',
      });
    });

    it('Does not identify invalid IPv4 address', () => {
      expect(dbReader.get('255.255.255.256')).toEqual({
        ip: '255.255.255.256',
        ip_no: '',
        status: 'INVALID_IP_ADDRESS',
      });
    });

    it('Supports reinitialization', () => {
      dbReader.close();
      const testIp = '8.8.8.8';
      expect(dbReader.get(testIp)).toEqual({
        ip: testIp,
        ip_no: '',
        status: 'NOT_INITIALIZED',
      });
      dbReader.init(db1Path);
      const {status, country_short} = dbReader.get(testIp);
      expect(status).toBe('OK');
      expect(country_short).toBe('US');
    });

    it('Throws if DB not found and survives re-init', () => {
      dbReader.close();
      expect(() => dbReader.init('none.bin')).toThrow();
      dbReader.init(db1Path);
      const testIp = '8.8.8.8';
      const {status, country_short} = dbReader.get(testIp);
      expect(status).toBe('OK');
      expect(country_short).toBe('US');
    });
  });

  describe('Identify with in-memory LITE IPv4 DB1', () => {
    let dbReader: DbReader;

    beforeAll(() => {
      dbReader = new DbReader();
      dbReader.init(db1Path, {
        cacheDatabaseInMemory: true,
      });
    });

    afterAll(() => {
      dbReader.close();
    });

    it('Identifies IPv4 address', () => {
      const testIp = '8.8.8.8';
      const {country_short, status} = dbReader.get(testIp);
      expect(dbReader.readerStatus).toBe(ReaderStatus.Ready);
      expect(country_short).toBe('US');
      expect(status).toBe('OK');
    });

    it('Supports reinitialization', () => {
      dbReader.close();
      const testIp = '8.8.8.8';
      expect(dbReader.get(testIp)).toEqual({
        ip: testIp,
        ip_no: '',
        status: 'NOT_INITIALIZED',
      });
      dbReader.init(db1Path, {
        cacheDatabaseInMemory: true,
      });
      const {status, country_short} = dbReader.get(testIp);
      expect(status).toBe('OK');
      expect(country_short).toBe('US');
    });

    it('Throws if DB not found and survives re-init', () => {
      dbReader.close();
      expect(() => dbReader.init('none.bin')).toThrow();
      dbReader.init(db1Path, {
        cacheDatabaseInMemory: true,
      });
      const testIp = '8.8.8.8';
      const {status, country_short} = dbReader.get(testIp);
      expect(status).toBe('OK');
      expect(country_short).toBe('US');
    });
  });

  describe('DB watch', () => {
    let dbReader: DbReader;
    let initSpy: jest.SpyInstance;
    let watchSpy: jest.SpyInstance;
    let loadDatabaseSpy: jest.SpyInstance;
    let watchCallbackCount: number;

    beforeAll(() => {
      jest.useFakeTimers();
    });

    beforeEach(() => {
      watchCallbackCount = 0;
      watchSpy = jest.spyOn(fs, 'watch').mockImplementation((filename, callback): FSWatcher => {
        const runCallbackAndIncrementCount = () => {
          if (callback) callback('change', filename.toString());
          watchCallbackCount += 1;
        };
        const timeouts = [
          setTimeout(runCallbackAndIncrementCount, 50),
          setTimeout(runCallbackAndIncrementCount, 100),
          setTimeout(runCallbackAndIncrementCount, 150),
        ];
        return {
          close: () => timeouts.forEach(clearTimeout),
        } as FSWatcher;
      });

      dbReader = new DbReader();

      initSpy = jest.spyOn(dbReader, 'init');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loadDatabaseSpy = jest.spyOn(DbReader.prototype as any, 'loadDatabase');
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.restoreAllMocks();
      dbReader.close();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('Reloads database once', () => {
      dbReader.init(db1Path, {
        reloadOnDbUpdate: true,
        cacheDatabaseInMemory: false,
      });
      expect(dbReader.readerStatus).toBe(ReaderStatus.Ready);
      jest.advanceTimersByTime(200);
      expect(watchCallbackCount).toBe(3);
      jest.advanceTimersByTime(300);
      jest.runOnlyPendingTimers();
      expect(dbReader.readerStatus).toBe(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(loadDatabaseSpy).toHaveBeenCalledTimes(2);

      const testIp = '8.8.8.8';
      const {status, country_short} = dbReader.get(testIp);
      expect(status).toBe('OK');
      expect(country_short).toBe('US');
    });

    it('Reloads in-memory database once', () => {
      dbReader.init(db1Path, {
        reloadOnDbUpdate: true,
        cacheDatabaseInMemory: true,
      });
      expect(dbReader.readerStatus).toBe(ReaderStatus.Ready);
      jest.advanceTimersByTime(200);
      expect(watchCallbackCount).toBe(3);
      jest.advanceTimersByTime(300);
      jest.runOnlyPendingTimers();
      expect(dbReader.readerStatus).toBe(ReaderStatus.Ready);
      expect(watchSpy).toHaveBeenCalledTimes(2);
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(loadDatabaseSpy).toHaveBeenCalledTimes(2);

      const testIp = '8.8.8.8';
      const {status, country_short} = dbReader.get(testIp);
      expect(status).toBe('OK');
      expect(country_short).toBe('US');
    });
  });
});
