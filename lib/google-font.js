'use strict'

/**
 * @typedef {import('./types').FontData} FontData
 * @typedef {import('./types').FontResult} FontResult
 * @typedef {import('./types').FontFormat} FontFormat
 * @typedef {import('./types').GWFHFontResponse} GWFHFontResponse
 * @typedef {import('./types').FontResultCallback} FontResultCallback
 * @typedef {import('./types').FileMapCallback} FileMapCallback
 */

const pascalCase = require('pascal-case');
const systemFont = require('./system-font');
const noop = require('./noop');
const https = require('https');

/** @type {FontFormat} */
const DEFAULT_FORMAT = 'ttf';

/**
 * Represents a single Google Font with download and install capabilities
 * @class
 * @param {FontData} fontData - Font data from GWFH API
 */
function googleFont(fontData) {
	if (!(this instanceof googleFont))
		return new googleFont(fontData);

	Object.assign(this, fontData);
	/** @type {string} */
	this.family = fontData.familyName || fontData.family || '';
	/** @type {string} */
	this._fileName = pascalCase(this.getFamily());
	/** @type {string | undefined} */
	this.category = fontData.category;
	/** @type {string[] | Record<string, string> | undefined} */
	this.variants = fontData.variants;
    
	/** @type {string} */
	this.apiUrl = 'https://gwfh.mranftl.com/api/fonts/' + this.getFamily().toLowerCase().replace(/\s/g, '-');
}

/**
 * Get the font family name
 * @returns {string} Font family name
 */
googleFont.prototype.getFamily = function() {
	return this.family;
};

/**
 * Get available font variants
 * @returns {string[]} Array of variant IDs
 */
googleFont.prototype.getVariants = function() {
	if (this.variants && typeof this.variants === 'object' && !Array.isArray(this.variants)) {
		return Object.keys(this.variants);
	}
	return /** @type {string[]} */ (this.variants) || [];
};

/**
 * Get file URL map for font variants
 * @overload
 * @param {FileMapCallback} format - Callback (legacy signature)
 * @returns {void}
 */
/**
 * @overload
 * @param {FontFormat} [format] - Font format ('ttf' or 'woff2')
 * @param {FileMapCallback} [callback] - Optional callback
 * @returns {void | Promise<Record<string, string>>}
 */
/**
 * @param {FontFormat | FileMapCallback} [format] - Format or callback
 * @param {FileMapCallback} [callback] - Callback function
 * @returns {void | Promise<Record<string, string>>}
 */
googleFont.prototype._getFileMap = function(format, callback) {
	// NOTE: This method is intentionally backward compatible:
	// - Legacy usage: _getFileMap(callback)
	// - New usage:    _getFileMap(format, callback)
	// When called with a single function argument, that argument is treated as
	// the callback and the font format defaults to 'ttf'. The subsequent
	// `format = format || 'ttf';` also ensures that callers who explicitly pass
	// a falsy format (e.g. null/undefined) still get 'ttf' as the default.
	if (typeof format === 'function') {
		callback = format;
		format = DEFAULT_FORMAT; // default format when only callback is supplied
	}
	format = format || DEFAULT_FORMAT;
	
	// If no callback provided, return a promise
	if (!callback) {
		return this._getFileMapAsync(format);
	}
	
	// Callback-based for backward compatibility
	this._getFileMapAsync(format).then(
		result => callback(null, result),
		err => callback(err, undefined)
	);
};

/**
 * Get file URL map for font variants (Promise-based)
 * @param {FontFormat} [format='ttf'] - Font format
 * @returns {Promise<Record<string, string>>} Map of variant ID to download URL
 */
googleFont.prototype._getFileMapAsync = async function(format) {
	format = format || DEFAULT_FORMAT;
	const options = {
		headers: { 'User-Agent': 'google-font-installer-tin' }
	};

	return new Promise((resolve, reject) => {
		https.get(this.apiUrl, options, (res) => {
			if (res.statusCode !== 200) {
				return reject(new Error('GWFH API returned ' + res.statusCode + ' for ' + this.getFamily()));
			}

			let data = '';
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => {
				try {
					/** @type {GWFHFontResponse} */
					const json = JSON.parse(data);
					/** @type {Record<string, string>} */
					const files = {};
					
					json.variants.forEach((v) => {
						// Map variants to IDs based on requested format
						if (format === 'woff2' && v.woff2) {
							files[v.id] = v.woff2;
						} else if (format === 'ttf' && v.ttf) {
							files[v.id] = v.ttf;
						}
					});
					resolve(files);
				} catch (e) {
					reject(new Error('Failed to parse GWFH JSON response'));
				}
			});
		}).on('error', reject);
	});
};

/**
 * Install font variants to the system font folder
 * @param {string[] | false} [variants] - Variants to install, or false for all
 * @param {FontResultCallback} [callback] - Callback function
 * @returns {void}
 */
googleFont.prototype.install = function(variants, callback) {
	callback = callback || noop;
	
	this.installAsync(variants).then(
		result => callback(null, result),
		err => callback(err, undefined)
	);
};

/**
 * Install font variants to the system font folder (Promise-based)
 * @param {string[] | false} [variants] - Variants to install, or false for all
 * @returns {Promise<FontResult[]>} Results of installed fonts
 */
googleFont.prototype.installAsync = async function(variants) {
	const fileList = await this._getFileMapAsync(DEFAULT_FORMAT);
	const requested = (variants && variants.length) ? variants : Object.keys(fileList);
	const resultList = [];
	
	for (const v of requested) {
		const norm = this._normalizeVariant(v);
		const url = fileList[norm];

		if (url) {
			try {
				const path = await systemFont.install(url, this._fileName + '-' + norm);
				if (path) {
					resultList.push({ family: this.getFamily(), variant: norm, path: path });
				}
			} catch (err) {
				throw err;
			}
		}
	}
	
	return resultList;
};

/**
 * Save font variants to a specified folder
 * @param {string[] | false} [variants] - Variants to download, or false for all
 * @param {string} [destFolder] - Destination folder path
 * @param {FontFormat | FontResultCallback} [format] - Format or callback (legacy)
 * @param {FontResultCallback} [callback] - Callback function
 * @returns {void}
 */
googleFont.prototype.saveAt = function(variants, destFolder, format, callback) {
	// Support both old (variants, destFolder, callback) and new (variants, destFolder, format, callback) signatures
	if (typeof format === 'function') {
		callback = format;
		format = DEFAULT_FORMAT; // default format
	}
	callback = callback || noop;

	this.saveAtAsync(variants, destFolder, format).then(
		result => callback(null, result),
		err => callback(err, undefined)
	);
};

/**
 * Save font variants to a specified folder (Promise-based)
 * @param {string[] | false} [variants] - Variants to download, or false for all
 * @param {string} [destFolder] - Destination folder path
 * @param {FontFormat} [format='ttf'] - Font format
 * @returns {Promise<FontResult[]>} Results of saved fonts
 */
googleFont.prototype.saveAtAsync = async function(variants, destFolder, format) {
	format = format || DEFAULT_FORMAT;
	const fileList = await this._getFileMapAsync(format);
	const requested = (variants && variants.length) ? variants : Object.keys(fileList);
	/** @type {FontResult[]} */
	const resultList = [];
	/** @type {Error[]} */
	const errors = [];

	for (const v of requested) {
		const norm = this._normalizeVariant(v);
		const url = fileList[norm];

		if (url) {
			try {
				const dest = destFolder || process.cwd();
				const path = await systemFont.saveAt(url, dest, this._fileName + '-' + norm);
				if (path) {
					resultList.push({ family: this.getFamily(), variant: norm, path: path });
				}
			} catch (err) {
				// Collect errors so one failing variant does not abort the entire batch
				errors.push(/** @type {Error} */ (err));
			}
		}
	}
	
	// Throw collected errors, attach partial results for caller inspection
	if (errors.length > 0) {
		const err = new AggregateError(errors, `Failed to save ${errors.length} variant(s)`);
		/** @type {any} */ (err).results = resultList;
		throw err;
	}
	
	return resultList;
};

/**
 * Normalize variant string to standard format
 * @param {string} variant - Variant string to normalize
 * @returns {string} Normalized variant ID
 */
googleFont.prototype._normalizeVariant = function(variant) {
	const v = variant.toString().trim().toLowerCase();
	
	// Handle common weight aliases
	if (v === '400' || v === 'normal') return 'regular';
	if (v === '400italic' || v === 'normalitalic') return 'italic';
	
	// Handle weight-only inputs (e.g., '700' -> '700')
	// These are already in the correct format for the API
	return v;
};

/**
 * Get the font category
 * @returns {string | undefined} Font category (e.g., 'serif', 'sans-serif')
 */
googleFont.prototype.getCategory = function() { return this.category; };

/**
 * Get the Google Fonts CSS URL for this font
 * @returns {string} CSS stylesheet URL
 */
googleFont.prototype.getCssUrl = function() {
	return 'https://fonts.googleapis.com/css?family=' + this.getFamily().replace(/\s/g, "+");
};

module.exports = googleFont;