'use strict'

/**
 * @typedef {import('./types').MimeTypeResult} MimeTypeResult
 * @typedef {import('http').IncomingMessage} IncomingMessage
 */

var https = require('https');
var http = require('http');
var url = require('url');
var StreamPass = require('stream').PassThrough;
var util = require('util');
var fileType = require('file-type');

/**
 * Handle API requests (extends EventEmitter via PassThrough)
 * @constructor
 * @param {string} uri - URL to fetch
 * @fires Request#success
 * @fires Request#error
 */
function Request(uri) {
	if (!(this instanceof Request))
		return new Request(uri);

	StreamPass.call(this);
	/** @type {number} */
	this.redirect = 3; // Allow up to 3 redirects
	/** @type {boolean} */
	this._firstBytes = false;
	/** @type {MimeTypeResult | undefined} */
	this._mimeType = undefined;
	/** @type {import('http').ClientRequest | undefined} */
	this.req = undefined;
	/** @type {boolean | MimeTypeResult} */
	this.mimeType = false;
	this.init(uri);
}

util.inherits(Request, StreamPass);

/**
 * Initialize the HTTP(S) request
 * @param {string} uri - URL to fetch
 * @returns {void}
 */
Request.prototype.init = function(uri) {
	var self = this;

	self.mimeType = false;
	try {
		var parsedUri = new URL(uri);
		if (parsedUri.protocol && parsedUri.hostname !== '') {
			var lib = this._getProperLibrary(parsedUri);
			
			var req = this.req = lib.get(uri, function(res) {
				self.handleResponse(res, uri);
			})

			req.setTimeout(10000, function(){ // Increased to 10s for reliability
				// @ts-ignore - emit inherited from PassThrough
				self.emit('error', new Error('Request timeout.'));
				req.destroy();
			})

			req.on('error', function(e){
				var errorMessage = util.format('Connection to %s failed: %s', parsedUri.hostname, e.message);
				// @ts-ignore - emit inherited from PassThrough
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

/**
 * Get the appropriate HTTP library based on protocol
 * @param {URL} uri - Parsed URL object
 * @returns {typeof http | typeof https} HTTP or HTTPS module
 */
Request.prototype._getProperLibrary = function(uri){
	return uri.protocol === 'https:' ? https : http;
}

/**
 * Handle the HTTP response
 * @param {IncomingMessage} res - HTTP response object
 * @param {string} originalUri - Original request URL (for redirect resolution)
 * @returns {void}
 */
Request.prototype.handleResponse = function(res, originalUri) {
	var self = this;

	if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
		if (res.headers.location && self.redirect > 0) {
			self.redirect -= 1;
			var nextUrl = new URL(res.headers.location, originalUri).toString();
			return self.init(nextUrl);
		}
	}

	if (res.statusCode === 200) {
		/** @type {Buffer[]} */
		var chunks = [];
		res.on('data', function(chunk) {
			// @ts-ignore - write inherited from PassThrough
			self.write(chunk);
			chunks.push(chunk);
		})
		res.on('end', async function(){
			var fullBuffer = Buffer.concat(chunks);
			var message = fullBuffer.toString('utf8');
			
			try {
				self._mimeType = await fileType.fromBuffer(fullBuffer);
			} catch(e) {}

			// @ts-ignore - emit inherited from PassThrough
			self.emit('success', message);
			// @ts-ignore - end inherited from PassThrough
			self.end();
		})
	} else {
		var error = new Error('Bad response: ' + res.statusCode);
		/** @type {Error & { statusCode?: number }} */
		(error).statusCode = res.statusCode;
		self.handleError(error);
	}
}

/**
 * Handle and emit an error, then end the stream
 * @param {Error} error - Error to emit
 * @returns {void}
 */
Request.prototype.handleError = function(error){
	// @ts-ignore - emit inherited from PassThrough
	this.emit('error', error);
	// @ts-ignore - end inherited from PassThrough
	this.end();
}

/**
 * Get the detected MIME type of the response
 * @returns {MimeTypeResult | undefined} MIME type info or undefined
 */
Request.prototype.getMimeType = function(){
	return this._mimeType;
}

module.exports = Request;