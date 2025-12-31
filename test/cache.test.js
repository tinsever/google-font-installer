'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs').promises;

// Store original fs.promises methods
const originalReadFile = fs.readFile;
const originalWriteFile = fs.writeFile;
const originalMkdir = fs.mkdir;

describe('Cache', () => {
	let Cache;
	const CACHE_DIR = path.join(os.homedir(), '.gfcli');
	const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

	beforeEach(() => {
		// Reset module cache to get fresh instance
		jest.resetModules();
		Cache = require('../lib/cache');
	});

	describe('module exports', () => {
		it('should export readCache function', () => {
			expect(typeof Cache.readCache).toBe('function');
		});

		it('should export writeCache function', () => {
			expect(typeof Cache.writeCache).toBe('function');
		});

		it('should export CACHE_FILE constant', () => {
			expect(Cache.CACHE_FILE).toBe(CACHE_FILE);
		});

		it('should export CACHE_TTL_MS constant', () => {
			expect(Cache.CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
		});
	});

	describe('readCache', () => {
		it('should return null when cache file does not exist', async () => {
			// Mock readFile to throw ENOENT error
			jest.spyOn(fs, 'readFile').mockRejectedValue({ code: 'ENOENT' });
			
			const result = await Cache.readCache();
			expect(result).toBeNull();
		});

		it('should return null for invalid JSON', async () => {
			jest.spyOn(fs, 'readFile').mockResolvedValue('invalid json');
			
			const result = await Cache.readCache();
			expect(result).toBeNull();
		});

		it('should return null for missing fonts array', async () => {
			const cacheData = {
				fetchedAt: Date.now(),
				notFonts: []
			};
			jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(cacheData));
			
			const result = await Cache.readCache();
			expect(result).toBeNull();
		});

		it('should return null for missing fetchedAt', async () => {
			const cacheData = {
				fonts: [{ family: 'Roboto' }]
			};
			jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(cacheData));
			
			const result = await Cache.readCache();
			expect(result).toBeNull();
		});

		it('should return null for expired cache', async () => {
			const cacheData = {
				fetchedAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
				fonts: [{ family: 'Roboto' }]
			};
			jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(cacheData));
			
			const result = await Cache.readCache();
			expect(result).toBeNull();
		});

		it('should return fonts for valid fresh cache', async () => {
			const fonts = [{ family: 'Roboto' }, { family: 'Open Sans' }];
			const cacheData = {
				fetchedAt: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
				fonts: fonts
			};
			jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(cacheData));
			
			const result = await Cache.readCache();
			expect(result).toEqual(fonts);
		});

		it('should return fonts for cache at exactly TTL boundary', async () => {
			const fonts = [{ family: 'Test' }];
			const cacheData = {
				fetchedAt: Date.now() - (23 * 60 * 60 * 1000), // 23 hours ago
				fonts: fonts
			};
			jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(cacheData));
			
			const result = await Cache.readCache();
			expect(result).toEqual(fonts);
		});
	});

	describe('writeCache', () => {
		it('should create cache directory if not exists', async () => {
			const mkdirSpy = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
			jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

			await Cache.writeCache([{ family: 'Test' }]);

			expect(mkdirSpy).toHaveBeenCalledWith(CACHE_DIR, { recursive: true });
		});

		it('should write fonts with timestamp', async () => {
			// Clear all mocks first
			jest.restoreAllMocks();
			const mkdirSpy = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
			const writeFileSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
			const fonts = [{ family: 'Roboto' }];

			const beforeWrite = Date.now();
			await Cache.writeCache(fonts);
			const afterWrite = Date.now();

			expect(writeFileSpy).toHaveBeenCalledWith(
				CACHE_FILE,
				expect.any(String),
				'utf8'
			);

			// Parse the last write call to verify structure
			const lastCall = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
			const writtenData = JSON.parse(lastCall[1]);
			expect(writtenData.fonts).toEqual(fonts);
			expect(writtenData.fetchedAt).toBeGreaterThanOrEqual(beforeWrite);
			expect(writtenData.fetchedAt).toBeLessThanOrEqual(afterWrite);
			
			mkdirSpy.mockRestore();
			writeFileSpy.mockRestore();
		});

		it('should not throw on mkdir error', async () => {
			jest.spyOn(fs, 'mkdir').mockRejectedValue(new Error('mkdir failed'));
			jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

			// Should not throw
			await expect(Cache.writeCache([{ family: 'Test' }])).resolves.not.toThrow();
		});

		it('should not throw on writeFile error', async () => {
			jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
			jest.spyOn(fs, 'writeFile').mockRejectedValue(new Error('write failed'));

			// Should not throw
			await expect(Cache.writeCache([{ family: 'Test' }])).resolves.not.toThrow();
		});
	});
});
