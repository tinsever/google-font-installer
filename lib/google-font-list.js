'use strict'

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Request = require('./request');
var googleFont = require('./google-font');
var Cache = require('./cache');

const CACHE_ENABLED = true;

const gwfhFontApiUrl = 'https://gwfh.mranftl.com/api/fonts';

function GoogleFontList() {
	if (!(this instanceof GoogleFontList))
		return new GoogleFontList();

	EventEmitter.call(this);

	this.data = [];
	this._loading = false;
	this._loadingPromise = null;
	this.load(false);
}

util.inherits(GoogleFontList, EventEmitter);

GoogleFontList.prototype.downloadList = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		var request = new Request(gwfhFontApiUrl);
		request.on('success', function(data){
			self.parseRawData(data);
			resolve({ fromCache: false });
		})
		request.on('error', function(error){
			reject(error);
		})
	});
}

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

GoogleFontList.prototype.parseRawData = function(rawData) {
	var self = this;
	var jsonList = false;
	try {
		jsonList = JSON.parse(rawData);
	} catch (e) {
		var error = new Error('Failed to parse GWFH Fonts JSON: ' + e.message)
		error.isInvalidJson = true;
		self.emit('error', error);
		return;
	}

	if (Array.isArray(jsonList)) {
		if (CACHE_ENABLED) {
			Cache.writeCache(jsonList);
		}
		self.populate(jsonList);
	} else {
		var newError = new Error('Invalid GWFH Font Json format');
		newError.isInvalidJson = true;
		self.emit('error', newError);
	}
}

GoogleFontList.prototype.populate = function(list){
	var self = this;
	list.forEach(function(fontData){
		self.data.push(new googleFont(fontData));
	});
	self.emit('success', self);
}

GoogleFontList.prototype.clone = function(){
	var newFontList = new GoogleFontList();
	newFontList.data = this.data;
	return newFontList;
}

GoogleFontList.prototype.searchFont = function(term, field, callback) {
	var self = this;
	var searchTerms = term.trim().length > 0 ? term.toLowerCase().split(' ') : [];
	var result = self.data.filter(function(el){
		var found = searchTerms.length > 0 ? true : false;
		searchTerms.forEach(function(subTerm){
			var val = el[field] || '';
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

GoogleFontList.prototype.searchFontByName = function(term, callback) {
	this.searchFont(term, 'family', callback);
}

GoogleFontList.prototype.searchFontByType = function(term, callback) {
	this.searchFont(term, 'category', callback);
}

GoogleFontList.prototype.getFont = function(term, field, callback) {
	var self = this;
	var searchTerms = term.trim().toLowerCase();
	var result = self.data.filter(function(el){
		var val = el[field] || '';
		return val.toLowerCase() === searchTerms;
	});
	var fontList = self.clone();
	fontList.data = result;
	fontList._filterField = field;
	fontList._filterTerm = term;
	callback(null, fontList);
}

GoogleFontList.prototype.getFontByName = function(term, callback) {
	this.getFont(term, 'family', callback);
}

GoogleFontList.prototype.getFontByType = function(term, callback) {
	this.getFont(term, 'category', callback);
}

GoogleFontList.prototype.getFirst = function () {
	return this.data.length > 0 ? this.data[0] : false;
};

GoogleFontList.prototype.isSingle = function(){
	return this.data.length === 1;
}

GoogleFontList.prototype.forEachFont = function(fn, callback) {
	var self = this;
	this.data.forEach(function(el, index){
		fn.call(self, el, index);
	});
	if (callback) callback();
}

module.exports = GoogleFontList;