'use strict';

const axios = require('axios');
const xml2js = require('xml2js');

// ---------------------------------------------------------------------------
// In-memory caches
// ---------------------------------------------------------------------------

/** @type {Map<string, { data: any, ts: number }>} */
const m3uCache = new Map();
const M3U_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** @type {Map<string, { data: any, ts: number }>} */
const epgCache = new Map();
const EPG_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// M3U parser
// ---------------------------------------------------------------------------

/**
 * Fetches and parses an M3U playlist from `url`.
 *
 * Supports standard EXTINF attributes:
 *   tvg-id, tvg-name, tvg-logo, group-title
 *
 * @param {string} url
 * @returns {Promise<Array<{id: string, name: string, logo: string, group: string, url: string, epgId: string}>>}
 */
async function parseM3U(url) {
  const response = await axios.get(url, {
    responseType: 'text',
    timeout: 30000,
    headers: { 'User-Agent': 'iptvParser/1.0' },
  });

  const text = response.data;
  const lines = text.split(/\r?\n/);
  const channels = [];

  let pendingInfo = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse attributes from the EXTINF line
      const tvgId    = _extractAttr(line, 'tvg-id');
      const tvgName  = _extractAttr(line, 'tvg-name');
      const tvgLogo  = _extractAttr(line, 'tvg-logo');
      const group    = _extractAttr(line, 'group-title');

      // The display name is the text after the last comma on the EXTINF line
      const commaIdx = line.lastIndexOf(',');
      const displayName = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : '';

      pendingInfo = {
        epgId: tvgId,
        name: tvgName || displayName,
        logo: tvgLogo,
        group: group,
      };
      continue;
    }

    // Any non-comment, non-empty line after a #EXTINF is the stream URL
    if (pendingInfo && !line.startsWith('#')) {
      channels.push({
        id: pendingInfo.epgId || _slugify(pendingInfo.name),
        name: pendingInfo.name,
        logo: pendingInfo.logo,
        group: pendingInfo.group,
        url: line,
        epgId: pendingInfo.epgId,
      });
      pendingInfo = null;
    }
  }

  return channels;
}

/**
 * Extract a named attribute value from an EXTINF line, e.g.
 *   tvg-id="foo" → "foo"
 *
 * @param {string} line
 * @param {string} attr
 * @returns {string}
 */
function _extractAttr(line, attr) {
  const re = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = line.match(re);
  return match ? match[1] : '';
}

/**
 * Very simple slug helper used as a fallback channel ID.
 *
 * @param {string} name
 * @returns {string}
 */
function _slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// EPG / XMLTV parser
// ---------------------------------------------------------------------------

/**
 * Fetches and parses an XMLTV EPG from `url`.
 *
 * Returns a map keyed by channel id:
 *   { [channelId]: [{ start, stop, title, desc, icon }] }
 *
 * Only programmes within the next 24 hours from now are included.
 * Returns `{}` when no url is provided or when the fetch/parse fails.
 *
 * @param {string|undefined} url
 * @returns {Promise<Object>}
 */
async function parseEPG(url) {
  if (!url) return {};

  let xmlText;
  try {
    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 60000,
      headers: { 'User-Agent': 'iptvParser/1.0' },
    });
    xmlText = response.data;
  } catch (_err) {
    return {};
  }

  let parsed;
  try {
    parsed = await xml2js.parseStringPromise(xmlText, {
      explicitArray: true,
      mergeAttrs: false,
    });
  } catch (_err) {
    return {};
  }

  const now = Date.now();
  const cutoff = now + 24 * 60 * 60 * 1000; // 24 hours from now

  const result = {};

  const tv = parsed && parsed.tv;
  if (!tv) return result;

  const programmes = tv.programme;
  if (!Array.isArray(programmes)) return result;

  for (const prog of programmes) {
    const attrs = prog.$ || {};
    const channelId = attrs.channel || '';
    if (!channelId) continue;

    const start = _parseXmltvDate(attrs.start);
    const stop  = _parseXmltvDate(attrs.stop);

    // Filter: only keep programmes whose stop time is in the future and
    // whose start time is within the next 24 hours.
    if (stop !== null && stop < now) continue;
    if (start !== null && start > cutoff) continue;

    const title = _firstText(prog.title) || '';
    const desc  = _firstText(prog.desc) || '';

    // Icon may appear as <icon src="..."/>
    let icon = '';
    if (Array.isArray(prog.icon) && prog.icon[0] && prog.icon[0].$) {
      icon = prog.icon[0].$.src || '';
    }

    if (!result[channelId]) {
      result[channelId] = [];
    }
    result[channelId].push({ start, stop, title, desc, icon });
  }

  return result;
}

/**
 * Parse an XMLTV date string into a Unix timestamp (ms).
 * XMLTV dates look like: "20240522183000 +0000" or "20240522183000"
 *
 * @param {string|undefined} dateStr
 * @returns {number|null}
 */
function _parseXmltvDate(dateStr) {
  if (!dateStr) return null;
  // Normalise: remove spaces, handle timezone offset
  const s = dateStr.trim();
  // Format: YYYYMMDDHHmmss [+/-HHMM]
  const re = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/;
  const m = s.match(re);
  if (!m) return null;

  const [, year, month, day, hour, min, sec, tz] = m;
  // Build ISO string
  let iso = `${year}-${month}-${day}T${hour}:${min}:${sec}`;
  if (tz) {
    // Insert colon into tz offset for ISO 8601 compliance
    iso += `${tz.slice(0, 3)}:${tz.slice(3)}`;
  } else {
    iso += 'Z';
  }
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : null;
}

/**
 * Extract the text content of the first element in an xml2js array field.
 *
 * xml2js with mergeAttrs=false stores text as `item._` or as the item itself
 * when there are no attributes.
 *
 * @param {Array|undefined} arr
 * @returns {string}
 */
function _firstText(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const first = arr[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    return first._ || first['#text'] || '';
  }
  return '';
}

// ---------------------------------------------------------------------------
// Cached wrappers
// ---------------------------------------------------------------------------

/**
 * Returns the cached channel list for `m3uUrl`, calling parseM3U on a miss
 * or when the cache entry is older than 30 minutes.
 *
 * @param {string} m3uUrl
 * @returns {Promise<Array>}
 */
async function getCachedChannels(m3uUrl) {
  const cached = m3uCache.get(m3uUrl);
  if (cached && (Date.now() - cached.ts) < M3U_CACHE_TTL_MS) {
    return cached.data;
  }
  const data = await parseM3U(m3uUrl);
  m3uCache.set(m3uUrl, { data, ts: Date.now() });
  return data;
}

/**
 * Returns the cached EPG map for `epgUrl`, calling parseEPG on a miss
 * or when the cache entry is older than 1 hour.
 *
 * @param {string|undefined} epgUrl
 * @returns {Promise<Object>}
 */
async function getCachedEPG(epgUrl) {
  if (!epgUrl) return {};
  const cached = epgCache.get(epgUrl);
  if (cached && (Date.now() - cached.ts) < EPG_CACHE_TTL_MS) {
    return cached.data;
  }
  const data = await parseEPG(epgUrl);
  epgCache.set(epgUrl, { data, ts: Date.now() });
  return data;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseM3U,
  parseEPG,
  getCachedChannels,
  getCachedEPG,
};
