Google Font CLI
=============

[![NPM](https://nodei.co/npm/google-font-cli.png)](https://npmjs.org/package/google-font-cli)

> This tool uses [google-webfonts-helper](https://gwfh.mranftl.com/) to access Google Fonts without requiring an API key.

![how gfcli works](https://raw.githubusercontent.com/tinsever/google-font-cli/master/gfcli.gif)

Google Font CLI is a NodeJS module/CLI that lets you Search, Download and Install fonts offered by Google Fonts.

You can use it in two ways:
- install the module system wide and use the Command Line Interface (CLI)
- require the module in your project and use the APIs

### Table of content
- [Install](#install)
	- [npm](#npm)
	- [homebrew](#homebrew-using-tap)
- [CLI](#cli)
	- [Search a font](#search-a-font)
	- [Download a font](#download-a-font)
	- [Install a font](#install-a-font)
	- [Copy font CSS URL](#copy-font-css-url)
	- [Examples](#cli-examples)
- [APIs](#apis)
	- [GoogleFontList](#googlefontlist)
		- [Events](#google-font-list-events)
		- [Public Properties](#google-font-list-properties)
		- [Public Methods](#google-font-list-methods)
	- [GoogleFont](#googlefont)
		- [Public Properties](#google-font-properties)
		- [Public Methods](#google-font-methods)
	- [Examples](#api-examples)


<br>

## Font installation footnote
In Linux and OSX, the font will be installed in the user's font directory (~/.fonts for Linux, ~/Library/Fonts for OSX).
In Windows, due to the fact that font installation require some register modifications, I prefered to create a little WScript (a windows script that use ActiveX windows interface) and spawn a `cscript` process to install the font in a _'windows native way'_.

# Installation
You can install gfcli using...
## npm
or anything that can access npm such as bun!
```bash
$ npm install -g google-font-cli
````

## homebrew using tap
```bash
$ brew tap tinsever/google-font-cli
$ brew install gfcli
```


# CLI

From your terminal emulator, you can use the command `gfcli`

### Search a font

```
$ gfcli search [family_name]
```
The search is really permissive, so you can specify only few characters and view all the font families that contains these characters. Words order is also not important.
For instance, search for _Source Sans_ or _Sans Source_ will produce the same result.

### Download a font

```
$ gfcli download [family_name] [-d|--dest destination_folder] [-v|--variants comma_separeted_variants] [--ttf|--woff2]
```

If **family_name** will match more than one family, nothing will be downloaded: a list of alternatives will help you better specify the font family name.

Download command accepts these options:
- `-d` or `--dest` let you specify the folder where to download the fonts. If this option is omitted the fonts will be download in the folder in which the command was called (or in the home directory if this folder is not writable by the user)
- `-v` or `--variants` let you specify which variants of the font will be downloaded. You have to write each variant separated by the other with a comma. For example `$ gfcli download Source Sans Pro -v 300,400`. If omitted, all variants will be downloaded.
- `--ttf` downloads the font in TTF format (default)
- `--woff2` downloads the font in WOFF2 format (optimized for web use)

### Install a font
```
$ gfcli install [family_name] [-v|--variants comma_separeted_variants]
```

If **family_name** will match more than one family, nothing will be installed: a list of alternatives will help you better specify the font family name.

Install command accepts only one option:
- `-v` or `--variants` let you specify which variants of the font will be installed. You have to write each variant separated by the other with a comma. For example `$ gfcli install Source Sans Pro -v 300,400`. If omitted, all variants will be downloaded.

### Copy font CSS url
```
$ gfcli copy [family_name] [-v|--variants comma_separeted_variants]
```

If **family_name** will match more than one family, nothing will be copied: a list of alternatives will help you better specify the font family name.

<a id="cli-examples"></a>
### Examples

**Search the _source_ keyword**
```
$ gfcli search source

Search results for: "source"

 * Source Code Pro
    Category: monospace
    Variants: 200, 300, regular, 500, 600, 700, 900
    CSS Url: https://fonts.googleapis.com/css?family=Source+Code+Pro
 * Source Sans Pro
    Category: sans-serif
    Variants: 200, 200italic, 300, 300italic, regular, italic, 600, 600italic, 700, 700italic, 900, 900italic
    CSS Url: https://fonts.googleapis.com/css?family=Source+Sans+Pro
 * Source Serif Pro
    Category: serif
    Variants: regular, 600, 700
    CSS Url: https://fonts.googleapis.com/css?family=Source+Serif+Pro
```

**Download Source Sans Pro 600 and 700italic**
```
$ gfcli download source sans pro -v 600,700italic

Source Sans Pro variant 600 downloaded in /home/user/someFolder/SourceSansPro-600.ttf
Source Sans Pro variant 700italic downloaded in /home/user/someFolder/SourceSansPro-700italic.ttf
```

**Download Inter in WOFF2 format**
```
$ gfcli download inter --woff2

Inter variant regular downloaded in /home/user/someFolder/Inter-regular.woff2
Inter variant 100 downloaded in /home/user/someFolder/Inter-100.woff2
Inter variant 200 downloaded in /home/user/someFolder/Inter-200.woff2
...
```

**Install Lato 100**
```
$ gfcli install lato -v 100

Lato variant 100 downloaded in /home/user/.fonts/Lato-100.ttf

```

**Copy font url for Work Sans variants 200, normal and 600**
```
$ gfcli copy work sans -v 200,400,600

"work sans" font url has been copied to your clipboard.

```
(*https://fonts.googleapis.com/css?family=Work+Sans:200,400,600* will be available in your clipboard)

# APIs

First of all you have to install the module in you NodeJS project:
```
$ npm install google-font-cli --save
```
And then you can require it in your code:
```js
var GoogleFontList = require('google-font-cli');
```

### GoogleFontList

**GoogleFontList** is a class that downloads the font list from google-webfonts-helper.
```js
var GoogleFontList = require('google-font-cli');
var fontList = new GoogleFontList();
```
<a id="google-font-list-events"></a>

#### Events
###### `'success'`
Emitted when the Font List is downloaded from Google and the data are converted, stored and processed. Callback contains only one argument for convenience: the object itself
###### `'error'`
Emitter if something go wrong in downloading, coverting or processing data. The Callback argument is the error object.

<a id="google-font-list-properties"></a>
#### Public properties
###### `data` [Array]
Array of GoogleFont instances, a class that extends the data provided by google-webfonts-helper. Empty until 'success' event.

<a id="google-font-list-methods"></a>
#### Public methods

###### `setApiKey('API_KEY')`
- _API_KEY_ [String]
- Returns [String|Boolean] If apiKey is a valid string, return the apiKey trimmed, else returns false.

Used to set the apiKey to download data from Google Web Font APIs.
downloadList()`
Download the list from google-webfonts-helpernternally, but public for convenience if someone prefers to use the object without downloading the list (ex. cached data).

###### `populate(jsonData)`
- _jsonData_ [Array] An array of Object rappresenting the font like Google does.

Populate the object `data` property with an array of GoogleFontfrom google-webfonts-helper.

Populate the object `data` property with an array of GoogleFont instances, based on the data provided by google-webfonts-helper
- Returns [GoogleFontList] A new in from google-webfonts-helperstance of GoogleFontList

Return a new instance of the object, with the same `data` and `apiKey` properties.

###### `searchFont(term, field, callback)`
- term [String] The string to search for.
- field [String] The property of the GoogleFont instance to test.
- callback(err, fontList) [Function] Mandatory callback with optional error obj and a new instance of GoogleFontList with the searched subset of Fonts

Function with callback used to search a font inside the object `data` property: it's case insensitive, words order insensitive and test if the field CONTAIN that words (ex. `source sans`, `source Sans` and `sans source` will produce the same result).

###### `searchFontByName(term, callback)`
- term [String] The string to search for.
- callback(err, fontList) [Function] Mandatory callback with optional error obj and a new instance of GoogleFontList with the searched subset of Fonts

Same as searchFont, but specific for the Family property. (the font name)

###### `searchFontByType(term, callback)`
- term [String] The string to search for.
- callback(err, fontList) [Function] Mandatory callback with optional error obj and a new instance of GoogleFontList with the searched subset of Fonts

Same as searchFont, but specific for the Category property. (for instance serif, sans-serif, display, etc)

###### `getFont(term, field, callback)`
- term [String] The string to search for.
- field [String] The property of the GoogleFont instance to test.
- callback(err, fontList) [Function] Mandatory callback with optional error obj and a new instance of GoogleFontList with the searched subset of Fonts

Function with callback used to get a specific font where a field and the term exactly match (case insensitive)

###### `getFontByName(term, callback)`
- term [String] The string to search for.
- callback(err, fontList) [Function] Mandatory callback with optional error obj and a new instance of GoogleFontList with the searched subset of Fonts

Same as getFont, but specific for the Family property. (the font name)

###### `getFontByType(term, callback)`
- term [String] The string to search for.
- callback(err, fontList) [Function] Mandatory callback with optional error obj and a new instance of GoogleFontList with the searched subset of Fonts

Same as getFont, but specific for the Category property. (for instance serif, sans-serif, display, etc)

###### `getFirst()`
- Returns [GoogleFont|Boolean] If not empty, return the first GoogleFont instance inside
GoogleFontList `data` property, else return false.

###### `isSingle()`
- Returns [Boolean] Returns true if the is only one GoogleFont in GoogleFontList `data` property, else return false.

###### `forEachFont(fn, callback)`
- fn(el, index) [Function] The function to execute for each element of the list, with element and index as parameters.
- callback(err) [Function] Optional callback that will be executed after the end of the loop

Execture fn foreach GoogleFOnt in GoogleFontList `data` property. It's async.


### GoogleFont
Class that extends data structure provided by Google APIs.

It's instanced by the populate method of GoogleFontList, called internally by the constructor or by parseRawData method.

**Every object inside the `data` property of [GoogleFontList](#googlefontlist) is an instance of this class.**

<a id="google-font-properties"></a>
#### Public properties

###### `family` `category` `version` `lastModified` [String]
Inherits by Google Font API structure, respectively the font name, the font type (serif, sans-serif, etc), the version and the string rappresenting the last modification data.
###### `subsets` [Array]
Inherits by google-webfonts-helper data structure, respectively the font name, the font type (serif, sans-serif, etc), the version and the string rappresenting the last modification data.
###### `subsets` [Array]
Inherits by google-webfonts-helper data structure, a list of the available subsest for that font.
###### `variants` [Array]
Inherits by google-webfonts-helper data structure, a list of all available variants (weights) for that font.
###### `files` [Object]
Inherits by google-webfonts-helper dataing the ready-to-use imports for the web about that specific font.

<a id="google-font-methods"></a>
#### Public methods

###### `getFamily()` `getCategory()` `getVariants()` `getSubsets()` `getVersion()` `getLastMod()` `getFileList()` `getCssUrl()`
Method to access to the public properties: it's a better idea use them insteed the properties for a future-proof reason. Maybe someday google will decide to changhe his properties names.
All returns the type of the property, except `GetLastMod()` that return a new Date instance.
ad of the properties for a future-proof reason. Maybe someday the data structure will change
##### `hasVariant(variant)`
- variant [String] The name of a variant (300, 500, etc);
- Returns [Boolean] true if the font has that variant, else returns false.

##### `getFiles(variants)`
- variants [String|Array] A string of the variant or an array with multiple variants.
- Returns [Boolean] Returns an object with key the requested variant and value the respetive file (or false if the is no file for that variant).

##### `saveAt(variants, destFolder, callback)`
- variants [String|Array] A string of the variant or an array with multiple variants.
- destFolder [String] A valid path of the destination folder for the file download.
- callback(err, result) [Function] Optional callback with eventually an error obj and and the result Array of Objects.
    - result [Array] An Array containing one object for each downloaded file, with the following properties:
        - _family_: the downloaded font family
        - _variant_: the downloaded variant
        - _path_: the path of the downloaded file

Download specified variants of the font in the destination folder directory.

##### `download(variants, callback)`
- variants [String|Array] A string of the variant or an array with multiple variants.
- callback(err, result) [Function] Optional callback with eventually an error obj and and the result Array of Objects.
    - result [Array] An Array containing one object for each downloaded file, with the following properties:
        - _family_: the downloaded font family
        - _variant_: the downloaded variant
        - _path_: the path of the downloaded file

Download specified variants of the font in the current directory (where the script is called).

##### `install(variants, callback)`
- variants [String|Array] A string of the variant or an array with multiple variants.
- callback(err, result) [Function] Optional callback with eventually an error obj and and the result Array of Objects.
    - result [Array] An Array containing one object for each installed file, with the following properties:
        - _family_: the installed font family
        - _variant_: the installed variant
        - _path_: the path of the installed file

Install specified variants of the font. The destination folder depends on the platform used:
- Linux: _~/.fonts/_
- OSX: _~/Library/Fonts/_
- Windows: The file is not copied into c:\Windows\Fonts, but is used a WScript that install the font invoking the font install windows function.

<a id="api-examples"></a>
### Examples
```js
var GoogleFontlist = require('google-font-cli');

fontList.on('success', function(){
	this.searchFontByName('Source Sans Pro', function(err, filteredList) {
		if (err)
			throw err;
		filteredList.getFirst().download(['300', '400'], function(err, result){
			if (err)
				throw err;
			result.forEach(function(el, index){
				console.log('Variant %s of %s downloaded in %s', el.variant, el.family, el.path);
			})
		});
	})
})

fontList.on('error', function(err){
	throw err;
})
```