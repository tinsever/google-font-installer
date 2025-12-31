'use strict';

const GoogleFont = require('../lib/google-font');

describe('GoogleFont', () => {
	describe('constructor', () => {
		it('should create instance with fontData', () => {
			const fontData = {
				family: 'Roboto',
				category: 'sans-serif',
				variants: ['regular', 'italic', '700']
			};
			const font = new GoogleFont(fontData);

			expect(font.family).toBe('Roboto');
			expect(font.category).toBe('sans-serif');
			expect(font.getVariants()).toEqual(['regular', 'italic', '700']);
		});

		it('should work without new keyword', () => {
			const fontData = { family: 'Open Sans' };
			const font = GoogleFont(fontData);

			expect(font).toBeInstanceOf(GoogleFont);
			expect(font.family).toBe('Open Sans');
		});

		it('should handle familyName property', () => {
			const fontData = { familyName: 'Lato' };
			const font = new GoogleFont(fontData);

			expect(font.family).toBe('Lato');
		});

		it('should default to empty string for missing family', () => {
			const font = new GoogleFont({});

			expect(font.family).toBe('');
		});

		it('should generate correct API URL', () => {
			const font = new GoogleFont({ family: 'Open Sans' });

			expect(font.apiUrl).toBe('https://gwfh.mranftl.com/api/fonts/open-sans');
		});

		it('should generate correct API URL with spaces', () => {
			const font = new GoogleFont({ family: 'Roboto Mono' });

			expect(font.apiUrl).toBe('https://gwfh.mranftl.com/api/fonts/roboto-mono');
		});
	});

	describe('getFamily', () => {
		it('should return the font family name', () => {
			const font = new GoogleFont({ family: 'Inter' });

			expect(font.getFamily()).toBe('Inter');
		});
	});

	describe('getVariants', () => {
		it('should return variants array', () => {
			const font = new GoogleFont({
				family: 'Roboto',
				variants: ['regular', '500', '700', 'italic']
			});

			expect(font.getVariants()).toEqual(['regular', '500', '700', 'italic']);
		});

		it('should return object keys when variants is an object', () => {
			const font = new GoogleFont({
				family: 'Roboto',
				variants: { regular: 'url1', italic: 'url2' }
			});

			expect(font.getVariants()).toEqual(['regular', 'italic']);
		});

		it('should return empty array when no variants', () => {
			const font = new GoogleFont({ family: 'Test' });

			expect(font.getVariants()).toEqual([]);
		});
	});

	describe('getCategory', () => {
		it('should return the font category', () => {
			const font = new GoogleFont({
				family: 'Roboto',
				category: 'sans-serif'
			});

			expect(font.getCategory()).toBe('sans-serif');
		});

		it('should return undefined for missing category', () => {
			const font = new GoogleFont({ family: 'Test' });

			expect(font.getCategory()).toBeUndefined();
		});
	});

	describe('getCssUrl', () => {
		it('should return correct Google Fonts CSS URL', () => {
			const font = new GoogleFont({ family: 'Roboto' });

			expect(font.getCssUrl()).toBe('https://fonts.googleapis.com/css?family=Roboto');
		});

		it('should replace spaces with + in URL', () => {
			const font = new GoogleFont({ family: 'Open Sans' });

			expect(font.getCssUrl()).toBe('https://fonts.googleapis.com/css?family=Open+Sans');
		});

		it('should handle multiple spaces', () => {
			const font = new GoogleFont({ family: 'Noto Sans JP' });

			expect(font.getCssUrl()).toBe('https://fonts.googleapis.com/css?family=Noto+Sans+JP');
		});
	});

	describe('_normalizeVariant', () => {
		it('should normalize 400 to regular', () => {
			const font = new GoogleFont({ family: 'Test' });

			expect(font._normalizeVariant('400')).toBe('regular');
		});

		it('should normalize 400italic to italic', () => {
			const font = new GoogleFont({ family: 'Test' });

			expect(font._normalizeVariant('400italic')).toBe('italic');
		});

		it('should keep other variants unchanged', () => {
			const font = new GoogleFont({ family: 'Test' });

			expect(font._normalizeVariant('700')).toBe('700');
			expect(font._normalizeVariant('500italic')).toBe('500italic');
			expect(font._normalizeVariant('regular')).toBe('regular');
		});

		it('should handle numeric input', () => {
			const font = new GoogleFont({ family: 'Test' });

			expect(font._normalizeVariant(400)).toBe('regular');
			expect(font._normalizeVariant(700)).toBe('700');
		});

		it('should trim whitespace', () => {
			const font = new GoogleFont({ family: 'Test' });

			expect(font._normalizeVariant('  700  ')).toBe('700');
		});
	});

	describe('_getFileMap', () => {
		it('should accept format and callback', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			
			// Test that format parameter is accepted
			expect(() => font._getFileMap('ttf', () => {})).not.toThrow();
			expect(() => font._getFileMap('woff2', () => {})).not.toThrow();
		});

		it('should accept only callback (backward compatibility)', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			
			expect(() => font._getFileMap(() => {})).not.toThrow();
		});

		it('should return a promise when no callback provided', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			const result = font._getFileMap('ttf');

			expect(result).toBeInstanceOf(Promise);
		});
	});

	describe('_getFileMapAsync', () => {
		it('should default to ttf format when not specified', async () => {
			const font = new GoogleFont({ family: 'Roboto' });
			// We just check that it doesn't throw for undefined format
			const promise = font._getFileMapAsync();
			expect(promise).toBeInstanceOf(Promise);
		});
	});

	describe('install', () => {
		it('should accept variants and callback', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			
			expect(() => font.install(['regular'], () => {})).not.toThrow();
		});

		it('should work without callback', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			
			expect(() => font.install(['regular'])).not.toThrow();
		});
	});

	describe('saveAt', () => {
		it('should accept variants, destFolder, format, and callback', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			
			expect(() => font.saveAt(['regular'], '/tmp', 'ttf', () => {})).not.toThrow();
		});

		it('should accept callback as third argument (backward compatibility)', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			
			expect(() => font.saveAt(['regular'], '/tmp', () => {})).not.toThrow();
		});

		it('should work without callback', () => {
			const font = new GoogleFont({ family: 'Roboto' });
			
			expect(() => font.saveAt(['regular'], '/tmp', 'woff2')).not.toThrow();
		});
	});
});
