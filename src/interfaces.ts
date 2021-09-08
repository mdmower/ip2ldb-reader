export interface Ip2lOptions {
  /**
   * Reload database when file changes (default: false)
   */
  reloadOnDbUpdate?: boolean;

  /**
   * Cache database in memory (default: false)
   */
  cacheDatabaseInMemory?: boolean;

  /**
   * Path to IP2Location subdivision CSV database (default: undefined)
   */
  subdivisionCsvPath?: string;

  /**
   * Path to IP2Location GeoNameID CSV database (default: undefined)
   */
  geoNameIdCsvPath?: string;

  /**
   * Path to IP2Location Country Info CSV database (default: undefined)
   */
  countryInfoCsvPath?: string;
}

export interface CountryInfoData {
  [key: string]: string | number | null | undefined;

  /**
   * Country name based on ISO 3166
   */
  country_name?: string | null;

  /**
   * Three-character country code based on ISO 3166
   */
  country_alpha3_code?: string | null;

  /**
   * Three-character country numeric code based on ISO 3166
   */
  country_numeric_code?: number | null;

  /**
   * Capital of the country
   */
  capital: string | null;

  /**
   * Demonym of the country
   */
  country_demonym?: string | null;

  /**
   * Total area in square-km
   */
  total_area: number | null;

  /**
   * Population of year 2014
   */
  population?: number | null;

  /**
   * The IDD prefix to call the city from another country
   */
  idd_code?: number | null;

  /**
   * Currency code based on ISO 4217
   */
  currency_code?: string | null;

  /**
   * Currency name
   */
  currency_name?: string | null;

  /**
   * Currency symbol
   */
  currency_symbol?: string | null;

  /**
   * Language code based on ISO 639
   */
  lang_code?: string | null;

  /**
   * Language name
   */
  lang_name?: string | null;

  /**
   * Country-Code Top-Level Domain
   */
  cctld?: string | null;
}

export interface Ip2lData {
  [key: string]: string | number | CountryInfoData | null | undefined;

  /**
   * IP address
   */
  ip: string | null;

  /**
   * IP number
   */
  ip_no: string | null;

  /**
   * Status of geolocation query
   */
  status: string | null;

  /**
   * ISO 3166-1 country code
   */
  country_short?: string;

  /**
   * Country name
   */
  country_long?: string;

  /**
   * Country info
   */
  country_info?: CountryInfoData | null;

  /**
   * Subdivision part of ISO 3166-2 country-subdivision code
   */
  subdivision?: string;

  /**
   * Region or state name
   */
  region?: string;

  /**
   * City name
   */
  city?: string;

  /**
   * Internet Service Provider or company name
   */
  isp?: string;

  /**
   * City latitude; defaults to capital city latitude if city is unknown
   */
  latitude?: number;

  /**
   * City longitude; defaults to capital city longitude if city is unknown
   */
  longitude?: number;

  /**
   * Internet domain name associated with IP address range
   */
  domain?: string;

  /**
   * ZIP/Postal code
   */
  zipcode?: string;

  /**
   * UTC time zone (DST is supported)
   */
  timezone?: string;

  /**
   * Internet connection type (DIAL, DSL, COMP)
   */
  netspeed?: string;

  /**
   * The IDD prefix to call the city from another country
   */
  iddcode?: string;

  /**
   * A varying length number assigned to geographic areas for calls between cities
   */
  areacode?: string;

  /**
   * The code of the nearest weather observation station
   */
  weatherstationcode?: string;

  /**
   * The name of the nearest weather observation station
   */
  weatherstationname?: string;

  /**
   * Mobile Country Code (MCC)
   */
  mcc?: string;

  /**
   * Mobile Network Code (MNC)
   */
  mnc?: string;

  /**
   * Commercial brand associated with the mobile carrier
   */
  mobilebrand?: string;

  /**
   * Average height of city above sea level in meters (m)
   */
  elevation?: string;

  /**
   * Usage type classification of ISP or company
   */
  usagetype?: string;

  /**
   * Address type
   */
  addresstype?: string;

  /**
   * IAB category
   */
  category?: string;

  /**
   * GeoName ID
   */
  geoname_id?: number;
}
