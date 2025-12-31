'use strict'

/**
 * @typedef {import('./types').FontData} FontData
 * @typedef {import('./types').GoogleFontInstance} GoogleFontInstance
 * @typedef {import('./types').FontListCallback} FontListCallback
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Request = require('./request');
var googleFont = require('./google-font');
var Cache = require('./cache');

/** @type {boolean} */
const CACHE_ENABLED = true;

/** @type {string} */
const gwfhFontApiUrl = 'https://gwfh.mranftl.com/api/fonts';

/**
 * Manages a list of Google Fonts with search and filter capabilities
 * @constructor
 * @fires GoogleFontList#success
 * @fires GoogleFontList#error
 */
function GoogleFontList() {
	if (!(this instanceof GoogleFontList))
		return new GoogleFontList();

	EventEmitter.call(this);

	/** @type {GoogleFontInstance[]} */
	this.data = [];
	/** @type {boolean} */
	this._loading = false;
	/** @type {Promise<{fromCache: boolean}> | null} */
	this._loadingPromise = null;
	/** @type {string | undefined} */
	this._filterField = undefined;
	/** @type {string | undefined} */
	this._filterTerm = undefined;
	/** @type {boolean | undefined} */
	this.loaded = undefined;
	this.load(false);
}

util.inherits(GoogleFontList, EventEmitter);

/**
 * Download the font list from GWFH API
 * @returns {Promise<{fromCache: boolean}>} Result indicating source
 */
GoogleFontList.prototype.downloadList = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		var request = new Request(gwfhFontApiUrl);
		// @ts-ignore - Request inherits from PassThrough which has EventEmitter
		request.on('success', /** @param {string} data */ function(data){
			self.parseRawData(data);
			resolve({ fromCache: false });
		})
		// @ts-ignore - Request inherits from PassThrough which has EventEmitter
		request.on('error', /** @param {Error} error */ function(error){
			reject(error);
		})
	});
}

/**
 * Load the font list (from cache or API)
 * @param {boolean} [forceRefresh=false] - Force refresh from API
 * @returns {Promise<{fromCache: boolean}>} Result indicating source
 */
GoogleFontList.prototype.load = function(forceRefresh) {
	var self = this;
	if (self._loadingPromise) return self._loadingPromise;
	self._loading = true;
	self._loadingPromise = (async function(){
		try {
			if (!forceRefresh && CACHE_ENABLED) {
				var cached = await Cache.readCache();
				if (cached && Array.isArray(cached)) {
					self.populate(cached);
					return { fromCache: true };
				}
			}
			console.log('\nDownloading Google Font List...\n');
			return await self.downloadList();
		} finally {
			self._loading = false;
			self._loadingPromise = null;
		}
	})();
	return self._loadingPromise;
};

/**
 * Parse raw JSON data from the API
 * @param {string} rawData - Raw JSON string from API
 * @returns {void}
 * @fires GoogleFontList#error
 * @fires GoogleFontList#success
 */
GoogleFontList.prototype.parseRawData = function(rawData) {
	var self = this;
	/** @type {FontData[] | false} */
	var jsonList = false;
	try {
		jsonList = JSON.parse(rawData);
	} catch (e) {
		/** @type {Error & { isInvalidJson?: boolean }} */
		var error = new Error('Failed to parse GWFH Fonts JSON: ' + /** @type {Error} */ (e).message);
		error.isInvalidJson = true;
		// @ts-ignore - emit inherited from EventEmitter
		self.emit('error', error);
		return;
	}

	if (Array.isArray(jsonList)) {
		if (CACHE_ENABLED) {
			Cache.writeCache(jsonList);
		}
		self.populate(jsonList);
	} else {
		/** @type {Error & { isInvalidJson?: boolean }} */
		var newError = new Error('Invalid GWFH Font Json format');
		newError.isInvalidJson = true;
		// @ts-ignore - emit inherited from EventEmitter
		self.emit('error', newError);
	}
}

/**
 * Populate the list with font data
 * @param {FontData[]} list - Array of font data objects
 * @returns {void}
 * @fires GoogleFontList#success
 */
GoogleFontList.prototype.populate = function(list){
	var self = this;
	list.forEach(function(fontData){
		// @ts-ignore - googleFont implements GoogleFontInstance
		self.data.push(new googleFont(fontData));
	});
	// @ts-ignore - emit inherited from EventEmitter
	self.emit('success', self);
}

/**
 * Create a shallow clone of this font list
 * @returns {GoogleFontList} Cloned font list
 */
GoogleFontList.prototype.clone = function(){
	var newFontList = new GoogleFontList();
	newFontList.data = this.data;
	return newFontList;
}

/**
 * Search for fonts matching a term in a specific field
 * @param {string} term - Search term
 * @param {string} field - Field to search (e.g., 'family', 'category')
 * @param {FontListCallback} callback - Callback with filtered results
 * @returns {void}
 */
GoogleFontList.prototype.searchFont = function(term, field, callback) {
	var self = this;
	var searchTerms = term.trim().length > 0 ? term.toLowerCase().split(' ') : [];
	
	const result = self.data.filter(function(el) {
		var found = searchTerms.length > 0 ? true : false;
		searchTerms.forEach(function(subTerm){
			var val = /** @type {string} */ (el[field]) || '';
			found = found && (val.toLowerCase().indexOf(subTerm) !== -1);
		});
		return found;
	});
	
	var fontList = self.clone();
	fontList.data = result;
	fontList._filterField = field;
	fontList._filterTerm = term;
	callback(null, fontList);
};

/**
 * Search for fonts by family name
 * @param {string} term - Search term
 * @param {FontListCallback} callback - Callback with filtered results
 * @returns {void}
 */
GoogleFontList.prototype.searchFontByName = function(term, callback) {
	this.searchFont(term, 'family', callback);
}

/**
 * Search for fonts by category type
 * @param {string} term - Search term
 * @param {FontListCallback} callback - Callback with filtered results
 * @returns {void}
 */
GoogleFontList.prototype.searchFontByType = function(term, callback) {
	this.searchFont(term, 'category', callback);
}

/**
 * Get fonts matching a term exactly in a specific field
 * @param {string} term - Search term
 * @param {string} field - Field to match (e.g., 'family', 'category')
 * @param {FontListCallback} callback - Callback with filtered results
 * @returns {void}
 */
GoogleFontList.prototype.getFont = function(term, field, callback) {
	var self = this;
	var searchTerms = term.trim().toLowerCase();
	
	const result = self.data.filter(function(el) {
		var val = /** @type {string} */ (el[field]) || '';
		return val.toLowerCase() === searchTerms;
	});
	
	var fontList = self.clone();
	fontList.data = result;
	fontList._filterField = field;
	fontList._filterTerm = term;
	callback(null, fontList);
}

/**
 * Get a font by exact family name match
 * @param {string} term - Font family name
 * @param {FontListCallback} callback - Callback with filtered results
 * @returns {void}
 */
GoogleFontList.prototype.getFontByName = function(term, callback) {
	this.getFont(term, 'family', callback);
}

/**
 * Get fonts by exact category match
 * @param {string} term - Category name
 * @param {FontListCallback} callback - Callback with filtered results
 * @returns {void}
 */
GoogleFontList.prototype.getFontByType = function(term, callback) {
	this.getFont(term, 'category', callback);
}

/**
 * Get the first font in the list
 * @returns {GoogleFontInstance | false} First font or false if empty
 */
GoogleFontList.prototype.getFirst = function () {
	return this.data.length > 0 ? this.data[0] : false;
};

/**
 * Check if the list contains exactly one font
 * @returns {boolean} True if list has exactly one font
 */
GoogleFontList.prototype.isSingle = function(){
	return this.data.length === 1;
}

/**
 * Iterate over each font in the list
 * @param {(font: GoogleFontInstance, index: number) => void} fn - Iterator function
 * @param {() => void} [callback] - Optional completion callback
 * @returns {void}
 */
GoogleFontList.prototype.forEachFont = function(fn, callback) {
	var self = this;
	this.data.forEach(function(el, index){
		fn.call(self, el, index);
	});
	if (callback) callback();
}

module.exports = GoogleFontList;