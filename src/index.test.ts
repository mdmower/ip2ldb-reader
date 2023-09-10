import {Ip2lReader} from './index';
import {parseIp} from './ip-utils';
import fs from 'fs';

describe('Multiple DB readers', () => {
  // Requires sample BIN IPV6 DB26 database from
  // https://www.ip2location.com/database/db26-ip-country-region-city-latitude-longitude-zipcode-timezone-isp-domain-netspeed-areacode-weather-mobile-elevation-usagetype-addresstype-category-district-asnhttps://www.ip2location.com/database/db26-ip-country-region-city-latitude-longitude-zipcode-timezone-isp-domain-netspeed-areacode-weather-mobile-elevation-usagetype-addresstype-category-district-asn
  // to be decompressed, renamed to IP2LOCATION-SAMPLE-DB26.IPV6.BIN,
  // and made available in /database folder within project directory.
  const db26Path = 'database/IP2LOCATION-SAMPLE-DB26.IPV6.BIN';
  // Requires CSV subdivision database from https://www.ip2location.com/free/geoname-id
  // to be decompressed and made available in /database folder within project directory.
  const geonameidDbPath = 'database/IP2LOCATION-GEONAMEID.CSV';
  // Requires CSV subdivision database from https://www.ip2location.com/free/iso3166-2
  // to be decompressed and made available in /database folder within project directory.
  const subdivDbPath = 'database/IP2LOCATION-ISO3166-2.CSV';
  // Requires "more information" country info CSV database from
  // https://www.ip2location.com/free/country-information
  // to be decompressed and made available in /database folder within project directory.
  const countryInfoDbPath = 'database/IP2LOCATION-COUNTRY-INFORMATION.CSV';
  // Requires CSV IATA/ICAO database from https://github.com/ip2location/ip2location-iata-icao
  // to be made available in /database folder within project directory.
  const iataIcaoDbPath = 'database/IP2LOCATION-IATA-ICAO.CSV';

  const conditionalDescribeMulti =
    fs.existsSync(db26Path) &&
    fs.existsSync(subdivDbPath) &&
    fs.existsSync(geonameidDbPath) &&
    fs.existsSync(countryInfoDbPath) &&
    fs.existsSync(iataIcaoDbPath)
      ? describe
      : describe.skip;

  conditionalDescribeMulti('Identify using multiple readers', () => {
    let dbReader: Ip2lReader;

    beforeAll(async () => {
      dbReader = new Ip2lReader();
      await dbReader.init(db26Path, {
        geoNameIdCsvPath: geonameidDbPath,
        subdivisionCsvPath: subdivDbPath,
        countryInfoCsvPath: countryInfoDbPath,
        iataIcaoCsvPath: iataIcaoDbPath,
      });
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
        ip: testIp,
        ip_no: ipNum,
        latitude: 37.405991,
        longitude: -122.078514,
        status: 'OK',
      };

      const {
        airports,
        country_short,
        geoname_id,
        ip,
        ip_no,
        latitude,
        longitude,
        status,
        subdivision,
        country_info,
      } = dbResult;
      expect(country_short).toEqual(expectedResultPartial.country_short);
      expect(geoname_id).toEqual(5375481);
      expect(ip).toEqual(expectedResultPartial.ip);
      expect(ip_no).toEqual(expectedResultPartial.ip_no);
      expect(latitude).toBeCloseTo(expectedResultPartial.latitude);
      expect(longitude).toBeCloseTo(expectedResultPartial.longitude);
      expect(status).toEqual(expectedResultPartial.status);
      expect(subdivision).toEqual('CA');
      expect(country_info?.idd_code).toEqual(1);
      expect(airports?.length).toBeGreaterThan(0);
    });

    it('Contains all possible keys', () => {
      const allPossibleKeys = [
        'addresstype',
        'airports',
        'areacode',
        'as',
        'asn',
        'category',
        'city',
        'country_info',
        'country_long',
        'country_short',
        'district',
        'domain',
        'elevation',
        'geoname_id',
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
        'subdivision',
        'timezone',
        'usagetype',
        'weatherstationcode',
        'weatherstationname',
        'zipcode',
      ];

      const testIp = '8.8.8.8';
      const dbResult = dbReader.get(testIp);
      expect(Object.keys(dbResult).sort()).toEqual(allPossibleKeys);
    });

    it('Supports reinitialization', async () => {
      dbReader.close();
      const testIp = '8.8.8.8';
      expect(dbReader.get(testIp)).toEqual({
        ip: testIp,
        ip_no: '',
        status: 'NOT_INITIALIZED',
      });
      await dbReader.init(db26Path, {
        geoNameIdCsvPath: geonameidDbPath,
        subdivisionCsvPath: subdivDbPath,
        countryInfoCsvPath: countryInfoDbPath,
        iataIcaoCsvPath: iataIcaoDbPath,
      });
      const {status, country_short, geoname_id, subdivision, country_info, airports} =
        dbReader.get(testIp);
      expect(status).toEqual('OK');
      expect(country_short).toEqual('US');
      expect(geoname_id).toEqual(5375481);
      expect(subdivision).toEqual('CA');
      expect(country_info?.idd_code).toEqual(1);
      expect(airports?.length).toBeGreaterThan(0);
    });
  });
});
