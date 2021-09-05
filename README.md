# ip2ldb-reader

A database reader for IP2Location [paid](https://www.ip2location.com/database), [free](https://lite.ip2location.com/database), and [sample](https://www.ip2location.com/development-libraries) databases. This is derivative work, based on [github.com/ip2location-nodejs/IP2Location](https://github.com/ip2location-nodejs/IP2Location).

## Installation

This module has been tested with Node.js 10, 12, and 14. Feel free to try other versions, but additional support is not promised.

Local installation

```
npm install ip2ldb-reader
```

## Usage

```JavaScript
import Ip2lReader from 'ip2ldb-reader';
// Or using require() syntax:
// const Ip2lReader = require('ip2ldb-reader').Ip2lReader;

// Define database reader options
const options = {...};

// Construct an instance of Ip2lReader
const ip2lReader = new Ip2lReader();

// Initialize reader with the IP2Location database
await ip2lReader.init('/path/to/database.bin', options);

// Get geolocation data for IP addresses
const ipv6data = ip2lReader.get('2001:4860:4860::8888');
const ipv4data = ip2lReader.get('8.8.8.8');

// Close the database and uninitialize the reader
ip2lReader.close();
```

## Options

```JavaScript
{
  // {boolean} Cache database in memory
  cacheDatabaseInMemory: false,

  // {boolean} Watch filesystem for database updates and reload if detected
  reloadOnDbUpdate: false,

  // {string} Path to subdivision CSV database
  subdivisionCsvPath: undefined,

  // {string} Path to GeoName ID CSV database
  geoNameIdCsvPath: undefined,
}
```

**Additional information**

- `cacheDatabaseInMemory` - Read entire database into memory on intialization.
- `reloadOnDbUpdate` - When enabled, the database file is monitored for changes with a 500ms debounce.
  - If `cacheDatabaseInMemory` is `false` (the default case), the database reader is put into the `INITIALIZING` state on the leading edge of the debounce. Attempts to read from the database short circuit and do not touch the filesystem. The updated database is reloaded on the trailing edge of the debounce. This means there is a minimum of 500ms where geolocation requests will receive `{status: "INITIALIZING"}` responses.
  - If `cacheDatabaseInMemory` is `true`, the reader will continue to return results from the cached databse while the updated database loads. There is no interruption in service.
- `subdivisionCsvPath` - When a filesystem path to the [IP2Location ISO 3166-2 Subdivision Code CSV database](https://www.ip2location.com/free/iso3166-2) is provided, the country code and region will be used to identify the corresponding subdivision code.
- `geoNameIdCsvPath` - When a filesystem path to the [IP2Location GeoName ID CSV database](https://www.ip2location.com/free/geoname-id) is provided, the country code, region, and city will be used to identify the corresponding GeoName ID.

## Return

The object returned by `Ip2lReader.get(ip)` has the following structure:

```JavaScript
{
  ip: string | null;
  ip_no: string | null;
  status: string | null;

  addresstype?: string;
  areacode?: string;
  category?: string;
  city?: string;
  country_long?: string;
  country_short?: string;
  domain?: string;
  elevation?: string;
  geoname_id?: number;
  iddcode?: string;
  isp?: string;
  latitude?: number;
  longitude?: number;
  mcc?: string;
  mnc?: string;
  mobilebrand?: string;
  netspeed?: string;
  region?: string;
  subdivision?: string;
  timezone?: string;
  usagetype?: string;
  weatherstationcode?: string;
  weatherstationname?: string;
  zipcode?: string;
}
```

Properties suffixed by `?` only exist if the database supports them. For example, when using a DB1 (country only) database, a sample return object looks like

```
{
  ip: "8.8.8.8",
  ip_no: "134744072",
  status: "OK",
  country_short: "US",
  country_long: "United States of America"
}
```

Possible values for `status` include:

- `OK` - Successful search for geolocation data
- `INITIALIZING` - Database reader is initializing and is not ready to receive requests
- `NOT_INITIALIZED` - Database reader failed to initialize
- `IP_ADDRESS_NOT_FOUND` - IP address has correct format, but database does not contain data for it
- `INVALID_IP_ADDRESS` - IP address does not have correct format
- `IPV6_NOT_SUPPORTED` - Unable to lookup IPv6 address because database does not support them
- `DATABASE_NOT_FOUND` - Database is missing from the filesystem

When no geolocation data is available for a supported property in the return object:

- String values are empty (`""`)
- Number values are zero (`0`)

## Known issues

IP2Location databases store `latitude = 0` and `longitude = 0` when no coordinates are known for an IP. Unfortunately, this is a real location: [Null Island](https://en.wikipedia.org/wiki/Null_Island). This reader cannot determine for certain whether the coordinates are real or not known, so no attempt is made at invalidating them in the return object.
