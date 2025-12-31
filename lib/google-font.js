'use strict'

var util = require('util');
var pascalCase = require('pascal-case');
var systemFont = require('./system-font');
var noop = require('./noop');
var https = require('https');

function googleFont(fontData) {
	if (!(this instanceof googleFont))
		return new googleFont(fontData);

	Object.assign(this, fontData);
	this.family = fontData.familyName || fontData.family || '';
	this._fileName = pascalCase(this.getFamily());
    
	this.apiUrl = 'https://gwfh.mranftl.com/api/fonts/' + this.getFamily().toLowerCase().replace(/\s/g, '-');
}

googleFont.prototype.getFamily = function() {
	return this.family;
};

googleFont.prototype.getVariants = function() {
	if (this.variants && typeof this.variants === 'object' && !Array.isArray(this.variants)) {
		return Object.keys(this.variants);
	}
	return this.variants || [];
};

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
		format = 'ttf'; // default format when only callback is supplied
	}
	format = format || 'ttf';
	
	// If no callback provided, return a promise
	if (!callback) {
		return this._getFileMapAsync(format);
	}
	
	// Callback-based for backward compatibility
	this._getFileMapAsync(format).then(
		result => callback(null, result),
		err => callback(err)
	);
};

googleFont.prototype._getFileMapAsync = async function(format) {
	format = format || 'ttf';
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
					const json = JSON.parse(data);
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

googleFont.prototype.install = function(variants, callback) {
	callback = callback || noop;
	
	this.installAsync(variants).then(
		result => callback(null, result),
		err => callback(err)
	);
};

googleFont.prototype.installAsync = async function(variants) {
	const fileList = await this._getFileMapAsync('ttf');
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

googleFont.prototype.saveAt = function(variants, destFolder, format, callback) {
	// Support both old (variants, destFolder, callback) and new (variants, destFolder, format, callback) signatures
	if (typeof format === 'function') {
		callback = format;
		format = 'ttf'; // default format
	}
	callback = callback || noop;

	this.saveAtAsync(variants, destFolder, format).then(
		result => callback(null, result),
		err => callback(err)
	);
};

googleFont.prototype.saveAtAsync = async function(variants, destFolder, format) {
	format = format || 'ttf';
	const fileList = await this._getFileMapAsync(format);
	const requested = (variants && variants.length) ? variants : Object.keys(fileList);
	const resultList = [];

	for (const v of requested) {
		const norm = this._normalizeVariant(v);
		const url = fileList[norm];

		if (url) {
			try {
				const path = await systemFont.saveAt(url, destFolder, this._fileName + '-' + norm);
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

googleFont.prototype._normalizeVariant = function(variant) {
	var v = variant.toString().trim().toLowerCase();
	if (v === '400') return 'regular';
	if (v === '400italic') return 'italic';
	return v;
};

googleFont.prototype.getCategory = function() { return this.category; };
googleFont.prototype.getCssUrl = function() {
	return 'https://fonts.googleapis.com/css?family=' + this.getFamily().replace(/\s/g, "+");
};

module.exports = googleFont;