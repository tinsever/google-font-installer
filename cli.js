#!/usr/bin/env node

"use strict";

const program = require("commander");
const pc = require("picocolors");
const ncp = require("copy-paste-win32fix");
const GoogleFontList = require("./lib/google-font-list");
const pjson = require("./package.json");

const fontList = new GoogleFontList();

program.option("--refresh-cache", "Refresh the cached Google font list");

const splitFamilies = (familyArgs) =>
  familyArgs
    .join(" ")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const getFontByNameAsync = (term) =>
  new Promise((resolve, reject) => {
    fontList.getFontByName(term, (err, filtered) => {
      if (err) return reject(err);
      resolve(filtered);
    });
  });

/**
 * Helper to wrap fontList initialization in a Promise
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
      let allResults = [];

      for (const term of families) {
        try {
          const filteredList = await getFontByNameAsync(term);
          if (filteredList.data.length !== 1) {
            handleMatchError("Download", term, null);
            continue;
          }
          const font = filteredList.getFirst();
          const result = await font.saveAtAsync(variants, options.dest, format);
          allResults = allResults.concat(result);
        } catch (err) {
          handleMatchError("Download", term, err);
        }
      }

      if (allResults.length > 0) {
        printResult(null, allResults);
      }
    } catch (err) {
      console.error(pc.red(err.toString()));
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
      let allResults = [];

      for (const term of families) {
        try {
          const filteredList = await getFontByNameAsync(term);
          if (filteredList.data.length !== 1) {
            handleMatchError("Installation", term, null);
            continue;
          }
          const font = filteredList.getFirst();
          const result = await font.installAsync(variants);
          allResults = allResults.concat(result);
        } catch (err) {
          handleMatchError("Installation", term, err);
        }
      }

      if (allResults.length > 0) {
        printResult(null, allResults);
      }
    } catch (err) {
      console.error(pc.red(err.toString()));
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

    fontList.getFontByName(term, (err, filteredList) => {
      if (err || filteredList.data.length !== 1) {
        handleMatchError("Copy", term, err);
        return;
      }
      const font = filteredList.getFirst();
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