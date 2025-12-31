'use strict';

const GoogleFont = require('../lib/google-font');

// Mock modules before requiring GoogleFontList
jest.mock('../lib/cache', () => ({
	readCache: jest.fn().mockResolvedValue(null),
	writeCache: jest.fn()
}));

// Simple mock that doesn't emit anything - tests will manually set data
jest.mock('../lib/request', () => {
	const { EventEmitter } = require('events');
	return jest.fn().mockImplementation(() => {
		return new EventEmitter();
	});
});

const GoogleFontList = require('../lib/google-font-list');

describe('GoogleFontList', () => {
	let consoleSpy;

	beforeAll(() => {
		// Suppress console.log during tests
		consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterAll(() => {
		consoleSpy.mockRestore();
	});

	describe('constructor', () => {
		it('should create instance', () => {
			const fontList = new GoogleFontList();
			expect(fontList).toBeInstanceOf(GoogleFontList);
		});

		it('should work without new keyword', () => {
			const list = GoogleFontList();
			expect(list).toBeInstanceOf(GoogleFontList);
		});

		it('should initialize with empty data array', () => {
			const list = new GoogleFontList();
			expect(Array.isArray(list.data)).toBe(true);
		});

		it('should be an EventEmitter', () => {
			const fontList = new GoogleFontList();
			expect(typeof fontList.on).toBe('function');
			expect(typeof fontList.emit).toBe('function');
		});
	});

	describe('load', () => {
		it('should return a promise', async () => {
			const list = new GoogleFontList();
			const result = list.load();
			expect(result).toBeInstanceOf(Promise);
		});

		it('should return the same promise if already loading', async () => {
			const list = new GoogleFontList();
			const promise1 = list.load();
			const promise2 = list.load();
			expect(promise1).toBe(promise2);
		});
	});

	describe('parseRawData', () => {
		it('should parse valid JSON array', (done) => {
			const list = new GoogleFontList();
			list.on('success', () => {
				expect(list.data.length).toBe(2);
				done();
			});
			list.parseRawData(JSON.stringify([
				{ family: 'Test1', category: 'serif' },
				{ family: 'Test2', category: 'sans-serif' }
			]));
		});

		it('should emit error for invalid JSON', (done) => {
			const list = new GoogleFontList();
			list.on('error', (err) => {
				expect(err.isInvalidJson).toBe(true);
				done();
			});
			list.parseRawData('invalid json');
		});

		it('should emit error for non-array JSON', (done) => {
			const list = new GoogleFontList();
			list.on('error', (err) => {
				expect(err.isInvalidJson).toBe(true);
				done();
			});
			list.parseRawData(JSON.stringify({ not: 'an array' }));
		});
	});

	describe('populate', () => {
		it('should populate data with GoogleFont instances', (done) => {
			const list = new GoogleFontList();
			list.on('success', () => {
				expect(list.data.length).toBe(2);
				expect(list.data[0]).toBeInstanceOf(GoogleFont);
				expect(list.data[0].getFamily()).toBe('Font1');
				done();
			});
			list.populate([
				{ family: 'Font1' },
				{ family: 'Font2' }
			]);
		});

		it('should emit success event', (done) => {
			const list = new GoogleFontList();
			list.on('success', (result) => {
				expect(result).toBe(list);
				done();
			});
			list.populate([{ family: 'Test' }]);
		});
	});

	describe('clone', () => {
		it('should return new GoogleFontList instance', () => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Test' })];
			const cloned = list.clone();

			expect(cloned).toBeInstanceOf(GoogleFontList);
			expect(cloned).not.toBe(list);
		});

		it('should share the same data reference', () => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Test' })];
			const cloned = list.clone();

			expect(cloned.data).toBe(list.data);
		});
	});

	describe('searchFont', () => {
		it('should find fonts matching search term', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Roboto', category: 'sans-serif' }),
				new GoogleFont({ family: 'Open Sans', category: 'sans-serif' }),
				new GoogleFont({ family: 'Roboto Mono', category: 'monospace' }),
				new GoogleFont({ family: 'Lato', category: 'sans-serif' })
			];
			
			list.searchFont('Roboto', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(2);
				expect(result.data[0].getFamily()).toBe('Roboto');
				expect(result.data[1].getFamily()).toBe('Roboto Mono');
				done();
			});
		});

		it('should search case-insensitively', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Roboto' }),
				new GoogleFont({ family: 'Roboto Mono' })
			];
			
			list.searchFont('roboto', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(2);
				done();
			});
		});

		it('should return empty array for no matches', (done) => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Roboto' })];
			
			list.searchFont('NonExistent', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(0);
				done();
			});
		});

		it('should search by category', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Roboto', category: 'sans-serif' }),
				new GoogleFont({ family: 'Roboto Mono', category: 'monospace' })
			];
			
			list.searchFont('monospace', 'category', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(1);
				expect(result.data[0].getFamily()).toBe('Roboto Mono');
				done();
			});
		});

		it('should handle multiple search terms', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Open Sans' }),
				new GoogleFont({ family: 'Roboto' })
			];
			
			list.searchFont('open sans', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(1);
				expect(result.data[0].getFamily()).toBe('Open Sans');
				done();
			});
		});

		it('should return no matches for empty search term', (done) => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Test' })];
			
			list.searchFont('', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(0);
				done();
			});
		});

		it('should set filter metadata on result', (done) => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Roboto' })];
			
			list.searchFont('Roboto', 'family', (err, result) => {
				expect(result._filterField).toBe('family');
				expect(result._filterTerm).toBe('Roboto');
				done();
			});
		});
	});

	describe('searchFontByName', () => {
		it('should search fonts by family name', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Roboto' }),
				new GoogleFont({ family: 'Open Sans' })
			];
			
			list.searchFontByName('Roboto', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(1);
				expect(result.data[0].getFamily()).toBe('Roboto');
				done();
			});
		});
	});

	describe('searchFontByType', () => {
		it('should search fonts by category', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Roboto', category: 'sans-serif' }),
				new GoogleFont({ family: 'Merriweather', category: 'serif' })
			];
			
			list.searchFontByType('serif', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(2); // Both contain 'serif'
				done();
			});
		});
	});

	describe('getFont', () => {
		it('should get exact font match', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Roboto' }),
				new GoogleFont({ family: 'Roboto Mono' })
			];
			
			list.getFont('Roboto', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(1);
				expect(result.data[0].getFamily()).toBe('Roboto');
				done();
			});
		});

		it('should be case insensitive', (done) => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Roboto' })];
			
			list.getFont('roboto', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(1);
				expect(result.data[0].getFamily()).toBe('Roboto');
				done();
			});
		});

		it('should return empty for partial matches', (done) => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Roboto' })];
			
			list.getFont('Rob', 'family', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(0);
				done();
			});
		});
	});

	describe('getFontByName', () => {
		it('should get font by exact name', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Inter' }),
				new GoogleFont({ family: 'Inter Tight' })
			];
			
			list.getFontByName('Inter', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(1);
				expect(result.data[0].getFamily()).toBe('Inter');
				done();
			});
		});
	});

	describe('getFontByType', () => {
		it('should get fonts by exact category', (done) => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Roboto', category: 'sans-serif' }),
				new GoogleFont({ family: 'Courier', category: 'monospace' })
			];
			
			list.getFontByType('monospace', (err, result) => {
				expect(err).toBeNull();
				expect(result.data.length).toBe(1);
				done();
			});
		});
	});

	describe('getFirst', () => {
		it('should return first font if data exists', () => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'First' }),
				new GoogleFont({ family: 'Second' })
			];

			const first = list.getFirst();
			expect(first.getFamily()).toBe('First');
		});

		it('should return false if data is empty', () => {
			const list = new GoogleFontList();
			list.data = [];

			expect(list.getFirst()).toBe(false);
		});
	});

	describe('isSingle', () => {
		it('should return true for single item', () => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Only' })];

			expect(list.isSingle()).toBe(true);
		});

		it('should return false for multiple items', () => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'First' }),
				new GoogleFont({ family: 'Second' })
			];

			expect(list.isSingle()).toBe(false);
		});

		it('should return false for empty list', () => {
			const list = new GoogleFontList();
			list.data = [];

			expect(list.isSingle()).toBe(false);
		});
	});

	describe('forEachFont', () => {
		it('should iterate over all fonts', () => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Font1' }),
				new GoogleFont({ family: 'Font2' }),
				new GoogleFont({ family: 'Font3' })
			];
			
			const families = [];
			list.forEachFont((font) => {
				families.push(font.getFamily());
			});

			expect(families).toEqual(['Font1', 'Font2', 'Font3']);
		});

		it('should provide index in callback', () => {
			const list = new GoogleFontList();
			list.data = [
				new GoogleFont({ family: 'Font1' }),
				new GoogleFont({ family: 'Font2' })
			];
			
			const indices = [];
			list.forEachFont((font, index) => {
				indices.push(index);
			});

			expect(indices).toEqual([0, 1]);
		});

		it('should call callback after iteration', (done) => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Test' })];
			
			list.forEachFont(() => {}, () => {
				done();
			});
		});

		it('should work without callback', () => {
			const list = new GoogleFontList();
			list.data = [new GoogleFont({ family: 'Test' })];
			
			expect(() => {
				list.forEachFont(() => {});
			}).not.toThrow();
		});
	});
});
