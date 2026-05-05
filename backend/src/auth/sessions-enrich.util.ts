import { UAParser } from 'ua-parser-js';
import * as geoip from 'geoip-lite';

export interface DeviceInfo {
  browser?: string;
  os?: string;
  type?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

export interface LocationInfo {
  country?: string;
  city?: string;
}

export function parseDevice(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent) return { type: 'unknown' };
  const parser = new UAParser(userAgent);
  const b = parser.getBrowser();
  const o = parser.getOS();
  const d = parser.getDevice();

  const browser = [b.name, b.version].filter(Boolean).join(' ').trim() || undefined;
  const os = [o.name, o.version].filter(Boolean).join(' ').trim() || undefined;

  let type: DeviceInfo['type'] = 'desktop';
  if (d.type === 'mobile') type = 'mobile';
  else if (d.type === 'tablet') type = 'tablet';
  else if (!b.name) type = 'unknown';

  return { browser, os, type };
}

export function lookupLocation(ip: string | null | undefined): LocationInfo | null {
  if (!ip) return null;

  // Normalizar IPv4-mapped IPv6 e loopback — geoip-lite não resolve estes
  const normalized = ip.replace(/^::ffff:/, '');
  if (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.startsWith('10.') ||
    normalized.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  ) {
    return null;
  }

  try {
    const geo = geoip.lookup(normalized);
    if (!geo) return null;
    return {
      country: geo.country || undefined,
      city: geo.city || undefined,
    };
  } catch {
    return null;
  }
}
