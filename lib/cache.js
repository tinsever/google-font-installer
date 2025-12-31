'use strict'

/**
 * @typedef {import('./types').FontData} FontData
 * @typedef {import('./types').CachePayload} CachePayload
 */

var fs = require('fs');
var path = require('path');
var os = require('os');

/** @type {string} */
const CACHE_DIR = path.join(os.homedir(), '.gfcli');
/** @type {string} */
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');
/** @type {number} Cache time-to-live in milliseconds (24 hours) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Ensures the cache directory exists
 * @returns {Promise<void>}
 */
async function ensureDir() {
	try {
		await fs.promises.mkdir(CACHE_DIR, { recursive: true });
	} catch (err) {
		// Swallow mkdir errors; caching is best-effort
	}
}

/**
 * Reads the cached font list if valid and not expired
 * @returns {Promise<FontData[] | null>} Cached font data or null if cache miss/expired
 */
async function readCache() {
	try {
		const content = await fs.promises.readFile(CACHE_FILE, 'utf8');
		/** @type {CachePayload} */
		const parsed = JSON.parse(content);
		if (!parsed || !Array.isArray(parsed.fonts) || typeof parsed.fetchedAt !== 'number') return null;
		const age = Date.now() - parsed.fetchedAt;
		if (age > CACHE_TTL_MS) return null;
		return parsed.fonts;
	} catch (err) {
		return null;
	}
}

/**
 * Writes the font list to the cache file
 * @param {FontData[]} fonts - Font data to cache
 * @returns {Promise<void>}
 */
async function writeCache(fonts) {
	try {
		await ensureDir();
		/** @type {CachePayload} */
		const payload = { fetchedAt: Date.now(), fonts: fonts };
		await fs.promises.writeFile(CACHE_FILE, JSON.stringify(payload), 'utf8');
	} catch (err) {
		// Ignore cache write errors; not critical
	}
}

module.exports = {
	readCache,
	writeCache,
	CACHE_FILE,
	CACHE_TTL_MS
};
