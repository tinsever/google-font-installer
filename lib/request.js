'use strict'

var https = require('https');
var http = require('http');
var url = require('url');
var StreamPass = require('stream').PassThrough;
var util = require('util');

/**
 * Handle API requests (extends EventEmitter via PassThrough)
 *
 * @param {String} uri url to fetch
 */
function Request(uri) {
	if (!(this instanceof Request))
		return new Request(uri);

	StreamPass.call(this);
	this.redirect = 3; // Allow up to 3 redirects
	this._fisrtBytes = false;
	this.init(uri);
}

util.inherits(Request, StreamPass);

Request.prototype.init = function(uri) {
	var self = this;

	self.mimeType = false;
	try {
		var parsedUri = new URL(uri);
		if (parsedUri.protocol && parsedUri.hostname !== '') {
			var lib = this._getProperLibray(parsedUri);
			
			var req = this.req = lib.get(uri, function(res) {
				self.handleResponse(res, uri);
			})

			req.setTimeout(10000, function(){ // Increased to 10s for reliability
				self.emit('error', new Error('Request timeout.'));
				req.destroy();
			})

			req.on('error', function(e){
				var errorMessage = util.format('Connection to %s failed: %s', parsedUri.hostname, e.message);
				self.emit('error', new Error(errorMessage));
			})

		} else {
			throw new Error('Invalid URL');
		}
	} catch (e) {
		setImmediate(function(){
			self.handleError(new Error(uri + ' is an invalid url.'));
		})
	}
}

Request.prototype._getProperLibray = function(uri){
	return uri.protocol === 'https:' ? https : http;
}

Request.prototype.handleResponse = function(res, originalUri) {
	var self = this;

	if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
		if (res.headers.location && self.redirect > 0) {
			self.redirect -= 1;
			var nextUrl = new URL(res.headers.location, originalUri).toString();
			return self.init(nextUrl);
		}
	}

	if (res.statusCode === 200) {
		var chunks = [];
		res.on('data', function(chunk) {
			self.write(chunk);
			chunks.push(chunk);
		})
		res.on('end', async function(){
			var fullBuffer = Buffer.concat(chunks);
			var message = fullBuffer.toString('utf8');
			
			try {
				const { fileTypeFromBuffer } = await import('file-type');
				self._mimeType = await fileTypeFromBuffer(fullBuffer);
			} catch(e) {}

			self.emit('success', message);
			self.end();
		})
	} else {
		var error = new Error('Bad response: ' + res.statusCode);
		error.statusCode = res.statusCode;
		self.handleError(error);
	}
}

Request.prototype.handleError = function(error){
	this.emit('error', error);
	this.end();
}

Request.prototype.getMimeType = function(){
	return this._mimeType;
}

module.exports = Request;