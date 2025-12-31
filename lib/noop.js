/**
 * Default callback that throws if an error is passed.
 * Used as a fallback when no callback is provided.
 * @param {Error | null} [err] - Error to throw, or null/undefined to do nothing
 * @returns {void}
 */
module.exports = function(err){
	if (err)
		throw err;
}
