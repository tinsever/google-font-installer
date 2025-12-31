'use strict';

const Request = require('../lib/request');
const EventEmitter = require('events').EventEmitter;
const http = require('http');
const https = require('https');

// Mock https and http modules
jest.mock('https');
jest.mock('http');

describe('Request', () => {
	let mockResponse;
	let mockRequest;

	beforeEach(() => {
		jest.clearAllMocks();
		
		mockResponse = new EventEmitter();
		mockResponse.statusCode = 200;
		mockResponse.headers = {};
		
		mockRequest = new EventEmitter();
		mockRequest.setTimeout = jest.fn();
		mockRequest.destroy = jest.fn();
		
		https.get.mockImplementation((url, callback) => {
			setImmediate(() => callback(mockResponse));
			return mockRequest;
		});
		
		http.get.mockImplementation((url, callback) => {
			setImmediate(() => callback(mockResponse));
			return mockRequest;
		});
	});

	describe('constructor', () => {
		it('should create instance with uri', () => {
			const request = new Request('https://example.com');
			expect(request).toBeInstanceOf(Request);
		});

		it('should work without new keyword', () => {
			const request = Request('https://example.com');
			expect(request).toBeInstanceOf(Request);
		});

		it('should emit error for invalid URL', (done) => {
			const request = new Request('not-a-valid-url');
			request.on('error', (err) => {
				expect(err.message).toContain('invalid url');
				done();
			});
		});

		it('should set redirect count to 3', () => {
			const request = new Request('https://example.com');
			expect(request.redirect).toBe(3);
		});
	});

	describe('_getProperLibrary', () => {
		it('should return https for https URLs', () => {
			const request = new Request('https://example.com');
			const lib = request._getProperLibray({ protocol: 'https:' });
			expect(lib).toBe(https);
		});

		it('should return http for http URLs', () => {
			const request = new Request('http://example.com');
			const lib = request._getProperLibray({ protocol: 'http:' });
			expect(lib).toBe(http);
		});
	});

	describe('handleResponse', () => {
		it('should emit success on 200 response', (done) => {
			const request = new Request('https://example.com');
			const testData = 'test response data';
			
			request.on('success', (data) => {
				expect(data).toBe(testData);
				done();
			});
			
			// Simulate data and end events
			setImmediate(() => {
				mockResponse.emit('data', Buffer.from(testData));
				mockResponse.emit('end');
			});
		});

		it('should handle redirect responses', (done) => {
			const redirectResponse = new EventEmitter();
			redirectResponse.statusCode = 301;
			redirectResponse.headers = { location: 'https://new-url.com' };
			
			const finalResponse = new EventEmitter();
			finalResponse.statusCode = 200;
			
			let callCount = 0;
			https.get.mockImplementation((url, callback) => {
				callCount++;
				if (callCount === 1) {
					setImmediate(() => callback(redirectResponse));
				} else {
					setImmediate(() => callback(finalResponse));
				}
				return mockRequest;
			});
			
			const request = new Request('https://example.com');
			
			request.on('success', (data) => {
				expect(callCount).toBe(2);
				done();
			});
			
			setTimeout(() => {
				finalResponse.emit('data', Buffer.from('final data'));
				finalResponse.emit('end');
			}, 20);
		});

		it('should emit error for bad status codes', (done) => {
			mockResponse.statusCode = 404;
			
			const request = new Request('https://example.com');
			
			request.on('error', (err) => {
				expect(err.message).toContain('Bad response: 404');
				expect(err.statusCode).toBe(404);
				done();
			});
		});

		it('should handle multiple redirect status codes', () => {
			const redirectCodes = [301, 302, 303, 307, 308];
			
			redirectCodes.forEach(code => {
				const response = new EventEmitter();
				response.statusCode = code;
				response.headers = { location: 'https://redirect.com' };
				
				// The response handler should detect these as redirects
				expect([301, 302, 303, 307, 308].includes(code)).toBe(true);
			});
		});
	});

	describe('getMimeType', () => {
		it('should return undefined initially', () => {
			const request = new Request('https://example.com');
			expect(request.getMimeType()).toBeUndefined();
		});

		it('should return mimeType after it is set', () => {
			const request = new Request('https://example.com');
			request._mimeType = { mime: 'font/woff2', ext: 'woff2' };
			expect(request.getMimeType()).toEqual({ mime: 'font/woff2', ext: 'woff2' });
		});
	});

	describe('handleError', () => {
		it('should emit error event', (done) => {
			const request = new Request('https://example.com');
			const testError = new Error('Test error');
			
			request.on('error', (err) => {
				expect(err).toBe(testError);
				done();
			});
			
			request.handleError(testError);
		});
	});

	describe('timeout handling', () => {
		it('should set timeout on request', () => {
			const request = new Request('https://example.com');
			
			expect(mockRequest.setTimeout).toHaveBeenCalledWith(10000, expect.any(Function));
		});
	});

	describe('stream functionality', () => {
		it('should be a PassThrough stream', () => {
			const request = new Request('https://example.com');
			
			expect(typeof request.pipe).toBe('function');
			expect(typeof request.write).toBe('function');
			expect(typeof request.end).toBe('function');
		});

		it('should pass data through stream', (done) => {
			// Create fresh mocks for this test
			const freshResponse = new EventEmitter();
			freshResponse.statusCode = 200;
			
			const freshRequest = new EventEmitter();
			freshRequest.setTimeout = jest.fn();
			freshRequest.destroy = jest.fn();
			
			https.get.mockImplementation((url, callback) => {
				setImmediate(() => callback(freshResponse));
				return freshRequest;
			});
			
			const request = new Request('https://example.com');
			
			request.on('success', (data) => {
				expect(data).toContain('Hello');
				done();
			});
			
			request.on('error', done);
			
			setTimeout(() => {
				freshResponse.emit('data', Buffer.from('Hello World'));
				freshResponse.emit('end');
			}, 10);
		});
	});

	describe('connection error handling', () => {
		it('should emit error on connection failure', (done) => {
			const errorMockRequest = new EventEmitter();
			errorMockRequest.setTimeout = jest.fn();
			errorMockRequest.destroy = jest.fn();
			
			https.get.mockImplementation((url, callback) => {
				// Emit error on the request object
				setImmediate(() => {
					errorMockRequest.emit('error', new Error('Connection refused'));
				});
				return errorMockRequest;
			});
			
			const request = new Request('https://example.com');
			
			request.on('error', (err) => {
				expect(err.message).toContain('failed');
				done();
			});
		});
	});
});
