#!/usr/bin/env node
// @ts-check

"use strict";

/**
 * @typedef {import('./lib/types').GoogleFontListInstance} GoogleFontListInstance
 * @typedef {import('./lib/types').GoogleFontInstance} GoogleFontInstance
 * @typedef {import('./lib/types').FontResult} FontResult
 */

const { Command } = require("commander");
const pc = require("picocolors");
const ncp = require("copy-paste-win32fix");
const GoogleFontList = require("./lib/google-font-list");
const pjson = require("./package.json");

/** @type {any} */
const fontList = new GoogleFontList();
const program = new Command();

program.option("--refresh-cache", "Refresh the cached Google font list");

/**
 * Split comma-separated font family arguments into an array
 * @param {string[]} familyArgs - Array of family arguments
 * @returns {string[]} Array of trimmed family names
 */
const splitFamilies = (familyArgs) =>
  familyArgs
    .join(" ")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Promisified wrapper for getFontByName
 * @param {string} term - Font family name to search
 * @returns {Promise<any>} Filtered font list
 */
const getFontByNameAsync = (term) =>
  new Promise((resolve, reject) => {
    fontList.getFontByName(term, (/** @type {Error | null} */ err, /** @type {any} */ filtered) => {
      if (err) return reject(err);
      resolve(filtered);
    });
  });

/**
 * Helper to wrap fontList initialization in a Promise
 * @param {boolean} [refreshCache=false] - Whether to force refresh the cache
 * @returns {Promise<void>}
 */
const ensureFontsLoaded = async (refreshCache = false) => {
  if (refreshCache) {
    fontList.loaded = false;
    console.log(pc.bold(pc.blue("\nRefreshing Google Font List cache...\n")));
  }
  if (fontList.loaded) return;
  try {
    await fontList.load(refreshCache);
  } catch (err) {
    console.error(pc.bold(pc.red("Error loading font list!")));
    console.error(pc.red(err.toString()));
    process.exit(1);
  }
};

program.version(pjson.version);

program
  .command("search [family...]")
  .description("Search for a font family")
  .action(async (family) => {
    const refresh = program.opts().refreshCache;
    await ensureFontsLoaded(refresh);
    const term = family ? family.join(" ") : "";
    fontList.searchFontByName(term, printFontList);
  });

program
  .command("download <family...>")
  .description("Download a font family")
  .option("-d, --dest <folder>", "Specify destination folder")
  .option("-v, --variants <variants>", "Variants separated by comma")
  .option("--ttf", "Download TTF format (default)")
  .option("--woff2", "Download WOFF2 format")
  .action(async (family, options) => {
    const refresh = program.opts().refreshCache;
    const variants = options.variants ? options.variants.split(",") : false;
    const format = options.woff2 ? "woff2" : "ttf";
    const families = splitFamilies(family);

    try {
      await ensureFontsLoaded(refresh);
      /** @type {FontResult[]} */
      let allResults = [];
      let successCount = 0;
      let failCount = 0;

      for (const term of families) {
        try {
          const filteredList = await getFontByNameAsync(term);
          if (filteredList.data.length !== 1) {
            handleMatchError("Download", term, null);
            failCount++;
            continue;
          }
          const font = filteredList.getFirst();
          if (font) {
            const result = await font.saveAtAsync(variants, options.dest, format);
            allResults = allResults.concat(result);
            successCount++;
          }
        } catch (err) {
          handleMatchError("Download", term, /** @type {Error} */ (err));
          failCount++;
        }
      }

      if (allResults.length > 0) {
        printResult(null, allResults);
      }

      // If all operations failed, exit with error
      if (failCount > 0 && successCount === 0) {
        console.error(pc.red(pc.bold(`\nAll ${failCount} font download(s) failed.`)));
        process.exit(1);
      }

      // Report partial failures
      if (failCount > 0 && successCount > 0) {
        console.log(pc.yellow(`\n${successCount} font(s) downloaded successfully, ${failCount} failed.`));
      }
    } catch (err) {
      console.error(pc.red(/** @type {Error} */ (err).toString()));
      process.exit(1);
    }
  });

program
  .command("install <family...>")
  .description("Install a font family to the system")
  .option("-v, --variants <variants>", "Variants separated by comma")
  .action(async (family, options) => {
    const refresh = program.opts().refreshCache;
    const variants = options.variants ? options.variants.split(",") : false;
    const families = splitFamilies(family);

    try {
      await ensureFontsLoaded(refresh);
      /** @type {FontResult[]} */
      let allResults = [];
      let successCount = 0;
      let failCount = 0;

      for (const term of families) {
        try {
          const filteredList = await getFontByNameAsync(term);
          if (filteredList.data.length !== 1) {
            handleMatchError("Installation", term, null);
            failCount++;
            continue;
          }
          const font = filteredList.getFirst();
          if (font) {
            const result = await font.installAsync(variants);
            allResults = allResults.concat(result);
            successCount++;
          }
        } catch (err) {
          handleMatchError("Installation", term, /** @type {Error} */ (err));
          failCount++;
        }
      }

      if (allResults.length > 0) {
        printResult(null, allResults);
      }

      // If all operations failed, exit with error
      if (failCount > 0 && successCount === 0) {
        console.error(pc.red(pc.bold(`\nAll ${failCount} font installation(s) failed.`)));
        process.exit(1);
      }

      // Report partial failures
      if (failCount > 0 && successCount > 0) {
        console.log(pc.yellow(`\n${successCount} font(s) installed successfully, ${failCount} failed.`));
      }
    } catch (err) {
      console.error(pc.red(/** @type {Error} */ (err).toString()));
      process.exit(1);
    }
  });

program
  .command("copy <family...>")
  .description("Copy Google Fonts stylesheet link to clipboard")
  .option("-v, --variants <variants>", "Variants separated by comma")
  .action(async (family, options) => {
    const refresh = program.opts().refreshCache;
    await ensureFontsLoaded(refresh);
    const term = family.join(" ");
    const variants = options.variants ? options.variants.split(",") : false;

    fontList.getFontByName(term, (/** @type {Error | null} */ err, /** @type {any} */ filteredList) => {
      if (err || filteredList.data.length !== 1) {
        handleMatchError("Copy", term, err);
        return;
      }
      const font = filteredList.getFirst();
      if (!font) return;
      const url = variants
        ? `${font.getCssUrl()}:${variants.join(",")}`
        : font.getCssUrl();

      ncp.copy(url, () => {
        console.log(pc.green(`"${term}" CSS URL copied to clipboard.`));
      });
    });
  });

program.parse(process.argv);

// Handle empty commands
if (program.args.length === 0) {
  program.help();
}

/**
 * Output Helpers
 */

/**
 * Handle and display match errors for font operations
 * @param {string} action - Action being performed (e.g., "Download", "Install")
 * @param {string} term - Font family name that failed
 * @param {Error | null} err - Error object or null
 * @returns {void}
 */
function handleMatchError(action, term, err) {
  if (err) {
    console.error(pc.red(err.toString()));
  } else {
    console.log(
      pc.bold(pc.red(`${action} failed: unable to find font family "${term}"`))
    );
    fontList.searchFontByName(term, printFontList);
  }
}

/**
 * Print a list of fonts to the console
 * @param {Error | null} err - Error object or null
 * @param {GoogleFontListInstance} list - Font list to display
 * @param {string} [message="Search results for:"] - Header message
 * @returns {void}
 */
function printFontList(err, list, message = "Search results for:") {
  if (err) return console.error(pc.red(err.toString()));
  if (list.data.length === 0) {
    return console.log(pc.red(`No results found for: ${list._filterTerm}`));
  }

  console.log(pc.green(`${message} "${pc.bold(pc.blue(list._filterTerm))}"\n`));

  list.data.forEach((el) => {
    console.log(pc.bold(pc.blue(` * ${el.family}`)));
    console.log(`    Category: ${el.getCategory()}`);
    console.log(`    Variants: ${el.getVariants().join(", ")}`);
    console.log(`    CSS Url:  ${el.getCssUrl()}\n`);
  });
}

/**
 * Print font operation results to the console
 * @param {Error | null} err - Error object or null
 * @param {FontResult[]} result - Array of font results to display
 * @returns {void}
 */
function printResult(err, result) {
  if (err) return console.error(pc.red(err.toString()));
  console.log("");
  result.forEach((el) => {
    console.log(
      pc.green(
        `${pc.bold(el.family)} variant ${pc.bold(el.variant)} processed: ${pc.underline(el.path)}`
      )
    );
  });
  console.log("");
}