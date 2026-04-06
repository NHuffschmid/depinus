// This script is executed after the Electron app has been packaged.
// - move the DEPINUS license file from the app directory to the root directory
// - update copyright owner
// - rename windows package folder to use "windows" instead of "win32"

const fs = require('fs');
const path = require('path');
const logger = require('../logger');
const { execFileSync } = require('child_process');

function determinePackageFolder(packageDir) {
    // TODO: same code exists in release.js, refactor to a common module
    const entries = fs.readdirSync(packageDir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            // first (and hopefully only) directory in the package dir
            return entry.name;
        }
    }
    throw new Error(`No package found in ${packageDir}`);
}

const packageFolder = determinePackageFolder(path.join(__dirname, '../package'));
const rootDir = path.join(__dirname, `../package/${packageFolder}`);
const resourcesDir = path.join(rootDir, 'resources');
const appDir = path.join(resourcesDir, 'app');

const existingLicenseFile = path.join(rootDir, 'LICENSE');
const renamedLicenseFile = path.join(rootDir, 'LICENSE.electron.txt');
if (fs.existsSync(existingLicenseFile)) {
    fs.renameSync(existingLicenseFile, renamedLicenseFile);
    logger.info(`Existing LICENSE file renamed to ${renamedLicenseFile}`);
}

const licenseFile = 'LICENSE_DEPINUS.md';
const origLicenseFile = path.join(appDir, licenseFile);
const newLicenseFile = path.join(rootDir, licenseFile);
if (fs.existsSync(origLicenseFile)) {
    fs.renameSync(origLicenseFile, newLicenseFile);
    logger.info(`DEPINUS license file moved to ${newLicenseFile}`);
} else {
    logger.warn(`DEPINUS license file not found at ${origLicenseFile}`);
}

const depinusExecutable = path.join(rootDir, 'depinus');
if (fs.existsSync(depinusExecutable)) {
    logger.info(`Make ${depinusExecutable} executable...`);
    fs.chmodSync(depinusExecutable, 0o755);
}

const autostartScript = path.join(resourcesDir, 'autostart');
if (fs.existsSync(autostartScript)) {
    logger.info(`Make ${autostartScript} executable...`);
    fs.chmodSync(autostartScript, 0o755);
}

const midiUsbResetScript = path.join(resourcesDir, 'midi_usb_reset');
if (fs.existsSync(midiUsbResetScript)) {
    logger.info(`Make ${midiUsbResetScript} executable...`);
    fs.chmodSync(midiUsbResetScript, 0o755);
}

const midiUsbResetDaemonScript = path.join(resourcesDir, 'midi_usb_reset_daemon.sh');
if (fs.existsSync(midiUsbResetDaemonScript)) {
    logger.info(`Make ${midiUsbResetDaemonScript} executable...`);
    fs.chmodSync(midiUsbResetDaemonScript, 0o755);
}

const depinusExe = path.join(rootDir, 'depinus.exe');
if (process.platform === 'win32' && fs.existsSync(depinusExe)) {
    try {
        const rceditPath = path.join(__dirname, '../node_modules/rcedit/bin/rcedit.exe');
        const owner = 'Norbert Huffschmid';
        logger.info(`Setting copyright owner on ${depinusExe} using rcedit...`);
        execFileSync(rceditPath, [depinusExe, '--set-version-string', 'LegalCopyright', owner], { stdio: 'inherit' });
    } catch (err) {
        logger.warn('rcedit failed: ' + err.message);
    }
}

if (process.platform === 'win32') {
    const packageDir = path.join(__dirname, '../package');
    const entries = fs.readdirSync(packageDir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory() && entry.name.endsWith('-win32-x64')) {
            const oldPath = path.join(packageDir, entry.name);
            const newName = entry.name.replace('-win32-x64', '-windows-x64');
            const newPath = path.join(packageDir, newName);
            if (!fs.existsSync(newPath)) {
                fs.renameSync(oldPath, newPath);
                logger.info(`Renamed package folder to ${newName}`);
            } else {
                logger.warn(`Target folder ${newName} already exists, skipping rename.`);
            }
        }
    }
}
