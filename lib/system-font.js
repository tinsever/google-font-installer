'use strict'

var util = require('util');
var path = require('path');
var os = require('os');
var fs = require('fs').promises;
var fsSync = require('fs');
var child_process = require('child_process');
var { exec } = require('child_process');
var Request = require('./request');

const platform = os.platform();
const tmpdir = process.env.TRAVIS ? process.env.TRAVIS_BUILD_DIR : os.tmpdir();
const tmp_folder = path.join(tmpdir, 'google-font-installer');

if (platform === 'win32') {
	var PowerShell = require('node-powershell');
}

function SystemFont() {}

SystemFont.prototype._saveTmp = async function(remoteFile, fileName) {
	if (!remoteFile) {
		throw new Error('Nothing to download');
	}
	
	const folder = await this._checkDestFolder(tmp_folder);
	const remoteExt = path.parse(remoteFile).ext;
	const filePath = path.join(folder, fileName + remoteExt);
	const localFile = fsSync.createWriteStream(filePath);
	const download = new Request(remoteFile);
	
	return new Promise((resolve, reject) => {
		download.on('error', reject)
			.pipe(localFile)
			.on('finish', async () => {
				const mimeType = download.getMimeType();
				const ext = path.parse(filePath).ext.toLowerCase();
				
				// Check if the downloaded file is a valid font based on MIME type or file extension
				const isValidFont = (mimeType && (mimeType.mime === 'application/font-sfnt' || mimeType.mime === 'font/woff2')) || 
								  (ext === '.ttf' || ext === '.woff2');
				
				if (isValidFont) {
					resolve(filePath);
				} else {
					try {
						await fs.unlink(filePath);
					} catch (e) {}
					reject(new Error('Downloaded file is corrupted'));
				}
			})
			.on('error', reject);
	});
};

SystemFont.prototype._move = async function(oldPath, destFolder) {
	const folder = await this._checkDestFolder(destFolder);
	const fileName = path.basename(oldPath).trim() || 'font.ttf';
	const newPath = path.join(folder, fileName);
	
	try {
		await fs.rename(oldPath, newPath);
		return newPath;
	} catch (err) {
		throw new Error('Something went wrong writing the file.');
	}
};

SystemFont.prototype._checkDestFolder = async function(destFolder) {
	if (destFolder === null || destFolder === undefined || !destFolder) {
		destFolder = process.cwd() || os.homedir();
	} else if (typeof destFolder !== 'string') {
		throw new Error('Destination folder for font must be a string');
	}
	const absFolder = path.resolve(destFolder);
	await this._isFolderOk(absFolder);
	return absFolder;
};

SystemFont.prototype._isFolderOk = async function(folder) {
	try {
		await fs.mkdir(folder, { recursive: true });
	} catch (err) {
		if (err.code !== 'EEXIST') {
			throw new Error('Error while creating folder ' + folder + ': ' + err);
		}
	}
};

SystemFont.prototype.saveAt = async function(remoteFile, destFolder, fileName) {
	const tmpPath = await this._saveTmp(remoteFile, fileName);
	return await this._move(tmpPath, destFolder);
};

SystemFont.prototype.saveHere = async function(remoteFile, fileName) {
	return await this.saveAt(remoteFile, false, fileName);
};

SystemFont.prototype.install = async function(remoteFile, fileName) {
	switch (platform) {
		case 'linux':
			const linuxDestFolder = path.join(os.homedir(), '.fonts/');
			return await this.saveAt(remoteFile, linuxDestFolder, fileName);
			
		case 'darwin':
			const darwinDestFolder = path.join(os.homedir(), 'Library', 'Fonts/');
			return await this.saveAt(remoteFile, darwinDestFolder, fileName);
			
		case 'win32':
			const tmpPath = await this._saveTmp(remoteFile, fileName);
			const ver = os.release().split('.');
			let majorVer = 0;

			if (ver.length >= 1) {
				majorVer = parseInt(ver[0], 10);
			}
			
			if (majorVer >= 6) {
				const ps = new PowerShell({
					executionPolicy: 'Bypass',
					noProfile: true
				});

				ps.addCommand('$fonts = (New-Object -ComObject Shell.Application).Namespace(0x14)');
				ps.addCommand(`Get-ChildItem -Path "${tmpPath}" -Recurse -include *.ttf | % { $fonts.CopyHere($_.fullname) }`);
				
				try {
					await ps.invoke();
					ps.dispose();
					return 'Font System Folder with Powershell.';
				} catch (err) {
					ps.dispose();
					throw err;
				}
			} else {
				return new Promise((resolve, reject) => {
					child_process.execFile(
						'cscript.exe',
						[path.join(__dirname, 'windows', 'installFont.js'), tmpPath],
						(err, stdout, stderr) => {
							if (err) reject(err);
							else resolve('Font System Folder with cscript.');
						}
					);
				});
			}
			
		default:
			throw new Error('Platform not supported.');
	}
};

module.exports = new SystemFont();
