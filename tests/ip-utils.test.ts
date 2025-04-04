import {parseIp} from '../src/ip-utils.js';

describe('Parse IP', () => {
  it('identifies IPv4 address', () => {
    const ipStr = '8.8.8.8';
    const {ip, ipNum, ipVersion} = parseIp(ipStr);
    expect(ip).toBe(ipStr);
    expect(ipVersion).toBe(4);
    expect(ipNum.toString()).toBe('134744072');
  });

  it('identifies IPv6 address', () => {
    const ipStr = '2001:4860:4860::8888';
    const {ip, ipNum, ipVersion} = parseIp(ipStr);
    expect(ip).toBe(ipStr);
    expect(ipVersion).toBe(6);
    expect(ipNum.toString()).toBe('42541956123769884636017138956568135816');
  });

  it('identifies IPv6 mapped address', () => {
    const ipStr = '::FFFF:8.8.8.8';
    const {ip, ipNum, ipVersion} = parseIp(ipStr);
    expect(ip).toBe('8.8.8.8');
    expect(ipVersion).toBe(4);
    expect(ipNum.toString()).toBe('134744072');
  });

  it('identifies IPv6 Teredo address', () => {
    const ipStr = '2001:0000:4136:E378:8000:63BF:F7F7:F7F7';
    const {ip, ipNum, ipVersion} = parseIp(ipStr);
    expect(ip).toBe(ipStr);
    expect(ipVersion).toBe(4);
    expect(ipNum.toString()).toBe('134744072');
  });

  it('identifies IPv6 6to4 address', () => {
    const ipStr = '2002:808:808::';
    const {ip, ipNum, ipVersion} = parseIp(ipStr);
    expect(ip).toBe(ipStr);
    expect(ipVersion).toBe(4);
    expect(ipNum.toString()).toBe('134744072');
  });

  it('reports invalid IPv4', () => {
    const ipStr = '255.255.255.256';
    const {ip, ipNum, ipVersion} = parseIp(ipStr);
    expect(ip).toBe(ipStr);
    expect(ipVersion).toBe(0);
    expect(ipNum.toString()).toBe('0');
  });

  it('reports invalid IPv6', () => {
    const ipStr = 'FFFF::FFFG';
    const {ip, ipNum, ipVersion} = parseIp(ipStr);
    expect(ip).toBe(ipStr);
    expect(ipVersion).toBe(0);
    expect(ipNum.toString()).toBe('0');
  });
});
