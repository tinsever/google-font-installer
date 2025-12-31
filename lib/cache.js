'use strict'

var fs = require('fs');
var path = require('path');
var os = require('os');

const CACHE_DIR = path.join(os.homedir(), '.gfcli');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function ensureDir() {
	try {
		await fs.promises.mkdir(CACHE_DIR, { recursive: true });
	} catch (err) {
		// Swallow mkdir errors; caching is best-effort
	}
}

async function readCache() {
	try {
		const content = await fs.promises.readFile(CACHE_FILE, 'utf8');
		const parsed = JSON.parse(content);
		if (!parsed || !Array.isArray(parsed.fonts) || typeof parsed.fetchedAt !== 'number') return null;
		const age = Date.now() - parsed.fetchedAt;
		if (age > CACHE_TTL_MS) return null;
		return parsed.fonts;
	} catch (err) {
		return null;
	}
}

async function writeCache(fonts) {
	try {
		await ensureDir();
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
