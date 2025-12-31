'use strict';

const noop = require('../lib/noop');

describe('noop', () => {
	it('should be a function', () => {
		expect(typeof noop).toBe('function');
	});

	it('should not throw when called without arguments', () => {
		expect(() => noop()).not.toThrow();
	});

	it('should not throw when called with null', () => {
		expect(() => noop(null)).not.toThrow();
	});

	it('should throw when called with an error', () => {
		const testError = new Error('Test error');
		expect(() => noop(testError)).toThrow('Test error');
	});

	it('should throw the exact error passed', () => {
		const testError = new Error('Specific error message');
		expect(() => noop(testError)).toThrow(testError);
	});

	it('should return undefined when no error', () => {
		expect(noop()).toBeUndefined();
		expect(noop(null)).toBeUndefined();
		expect(noop(undefined)).toBeUndefined();
	});
});
