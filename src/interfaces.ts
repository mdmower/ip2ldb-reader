export interface Ip2lOptions {
  /** Reload database when file changes (default: false) */
  reloadOnDbUpdate?: boolean;

  /** Cache database in memory (default: false) */
  cacheDatabaseInMemory?: boolean;

  /** Path to IP2Location subdivision CSV database (default: undefined) */
  subdivisionCsvPath?: string;

  /** Path to IP2Location GeoNameID CSV database (default: undefined) */
  geoNameIdCsvPath?: string;

  /** Path to IP2Location Country Info CSV database (default: undefined) */
  countryInfoCsvPath?: string;

  /** Path to IATA/ICAO airport CSV database (default: undefined) */
  iataIcaoCsvPath?: string;

  /** Path to IP2Location Continent Multilingual CSV database (default: undefined) */
  continentCsvPath?: string;

  /** Path to IP2Location Olson Time Zone CSV database (default: undefined) */
  olsonTzCsvPath?: string;
}

export interface CountryInfoData {
  [key: string]: string | number | null | undefined;

  /** Capital of the country */
  capital: string;

  /** Country-Code Top-Level Domain */
  cctld?: string;

  /** Three-character country code based on ISO 3166 */
  country_alpha3_code?: string;

  /** Two-character country code based on ISO 3166 */
  country_code: string;

  /** Demonym of the country */
  country_demonym?: string;

  /** Country name based on ISO 3166 */
  country_name?: string;

  /** Three-character country numeric code based on ISO 3166 */
  country_numeric_code?: number | null;

  /** Currency code based on ISO 4217 */
  currency_code?: string;

  /** Currency name */
  currency_name?: string;

  /** Currency symbol */
  currency_symbol?: string;

  /** The IDD prefix to call the city from another country */
  idd_code?: number | null;

  /** Language code based on ISO 639 */
  lang_code?: string;

  /** Language name */
  lang_name?: string;

  /** Population of year 2014 */
  population?: number | null;

  /** Total area in square-km */
  total_area: number | null;
}

export interface ContinentData {
  /** Two-character continent code (AF, AN, AS, EU, NA, OC, SA) */
  continent_code: string;

  /** Continent name */
  continent: string;
}

export interface OlsonTzData {
  /** Time zone abbreviation */
  abbreviation: string;

  /** The UTC ISO-8601 date when Daylight Saving Time ends */
  dst_end: string | null;

  /** The UTC ISO-8601 date when Daylight Saving Time begins */
  dst_start: string | null;

  /** Olson time zone */
  olson_tz: string;
}

export interface IataIcaoData {
  [key: string]: string | number | null | undefined;

  /** Airport name */
  airport: string;

  /** Three-character code of IATA airport code */
  iata: string;

  /** Four-character code of ICAO airport code */
  icao: string;

  /** Latitude of the airport */
  latitude: number | null;

  /** Longitude of the airport */
  longitude: number | null;
}

export interface Ip2lData {
  /** IP address */
  ip: string | null;

  /** IP number */
  ip_no: string | null;

  /** Status of geolocation query */
  status: string | null;

  /** Address type */
  addresstype?: string;

  /** IATA/ICAO airport info */
  airports?: IataIcaoData[];

  /** A varying length number assigned to geographic areas for calls between cities */
  areacode?: string;

  /** Autonomous system */
  as?: string;

  /** CIDR range for the whole autonomous system */
  ascidr?: string;

  /** Domain name of the autonomous system registrant */
  asdomain?: string;

  /** Autonomous system number */
  asn?: string;

  /** Usage type of the autonomous system registrant */
  asusagetype?: string;

  /** IAB category */
  category?: string;

  /** City name */
  city?: string;

  /** Continent */
  continent?: ContinentData | null;

  /** Country info */
  country_info?: CountryInfoData | null;

  /** Country name */
  country_long?: string;

  /** ISO 3166-1 country code */
  country_short?: string;

  /** District name */
  district?: string;

  /** Internet domain name associated with IP address range */
  domain?: string;

  /** Average height of city above sea level in meters (m) */
  elevation?: string;

  /** GeoName ID */
  geoname_id?: number | null;

  /** The IDD prefix to call the city from another country */
  iddcode?: string;

  /** Internet Service Provider or company name */
  isp?: string;

  /** City latitude; defaults to capital city latitude if city is unknown */
  latitude?: number | null;

  /** City longitude; defaults to capital city longitude if city is unknown */
  longitude?: number | null;

  /** Mobile Country Code (MCC) */
  mcc?: string;

  /** Mobile Network Code (MNC) */
  mnc?: string;

  /** Commercial brand associated with the mobile carrier */
  mobilebrand?: string;

  /** Internet connection type (DIAL, DSL, COMP) */
  netspeed?: string;

  /** Olson time zone */
  olson_timezone?: OlsonTzData | null;

  /** Region or state name */
  region?: string;

  /** Subdivision part of ISO 3166-2 country-subdivision code */
  subdivision?: string | null;

  /** UTC time zone (DST is supported) */
  timezone?: string;

  /** Usage type classification of ISP or company */
  usagetype?: string;

  /** The code of the nearest weather observation station */
  weatherstationcode?: string;

  /** The name of the nearest weather observation station */
  weatherstationname?: string;

  /** ZIP/Postal code */
  zipcode?: string;
}
