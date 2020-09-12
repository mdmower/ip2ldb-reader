import net from 'net';

const FROM_6TO4 = BigInt('42545680458834377588178886921629466624');
const TO_6TO4 = BigInt('42550872755692912415807417417958686719');
const FROM_TEREDO = BigInt('42540488161975842760550356425300246528');
const TO_TEREDO = BigInt('42540488241204005274814694018844196863');
const LAST_32BITS = BigInt('4294967295');

/**
 * Check whether an IPv6 address can be expressed as IPv4
 * and use IPv4 if available. Remove zone index from link
 * local IPv6 address. Calculate IP number.
 * @param ip IP address
 */
export function parseIp(ip: string): {ip: string; ipVersion: number; ipNum: bigint} {
  let ipVersion = net.isIP(ip);
  let ipNum = BigInt(0);

  if (ipVersion === 6) {
    if (/^[:0]+:F{4}:(\d+\.){3}\d+$/i.test(ip)) {
      ip = ip.replace(/^[:0]+:F{4}:/i, '');
      ipVersion = net.isIP(ip);
    } else if (/^[:0]+F{4}(:[\dA-Z]{4}){2}$/i.test(ip)) {
      const tmp = ip.replace(/^[:0]+F{4}:/i, '').replace(/:/, '');
      ip = (tmp.match(/../g) || []).map((b) => parseInt('0x' + b)).join('.');
      ipVersion = net.isIP(ip);
    }
  }

  if (ipVersion) {
    ({ipNum, ipVersion} = getIpNum(ip, ipVersion));
  }

  return {ip, ipVersion, ipNum};
}

/**
 * Get numeric IP and verify version
 * @param ip IP address
 * @param ipVersion IP version
 */
function getIpNum(ip: string, ipVersion: number): {ipNum: bigint; ipVersion: number} {
  let ipNum = BigInt(0);

  // IPv4
  if (ipVersion === 4) {
    const d = ip.split('.');
    ipNum = BigInt(((+d[0] * 256 + +d[1]) * 256 + +d[2]) * 256 + +d[3]);
  }

  // IPv6
  else if (ipVersion === 6) {
    const maxsections = 8; // should have 8 sections
    const sectionbits = 16; // 16 bits per section
    const m = ip.split('::');

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

    ipNum = total;

    // Check whther this is a 6to4 or Toredo address, and if
    // so, extract the IPv4 number.
    if (ipNum >= FROM_6TO4 && ipNum <= TO_6TO4) {
      // Sample: 2002:808:808:: --> 8.8.8.8
      ipNum = (ipNum >> BigInt(80)) & LAST_32BITS;
      ipVersion = 4;
    } else if (ipNum >= FROM_TEREDO && ipNum <= TO_TEREDO) {
      // Sample: 2001:0000:4136:E378:8000:63BF:F7F7:F7F7 --> 8.8.8.8
      ipNum = ~ipNum & LAST_32BITS;
      ipVersion = 4;
    }
  }

  return {ipNum, ipVersion};
}
