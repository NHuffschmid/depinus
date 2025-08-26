// This script creates a versioned ZIP package of the contents of the dist directory.

const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const { parseConfig } = require('../utils');

process.env.NODE_OPTIONS = "--max-old-space-size=4096"

const configPath = path.join(__dirname, '../depinus.conf');
const config = parseConfig(configPath);
const version = config.Default.version;

const packageDir = path.join(__dirname, '../package');
const sourceDir = path.join(packageDir, determinePackageFolder(packageDir));
const outputFileName = determineReleasePackageName(packageDir, version) + '.zip';
const outputZip = path.join(packageDir, outputFileName);

function createZip(source, destination) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(destination);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`ZIP file created: ${destination} (${archive.pointer()} total bytes)`);
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(source, false);
        archive.finalize();
    });
}

function determinePackageFolder(packageDir) {
    const entries = fs.readdirSync(packageDir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            // first (and hopefully only) directory in the dist dir
            return entry.name;
        }
    }
    throw new Error(`No package found in ${packageDir}`);
}

function determineReleasePackageName(packageDir, version) {
    const packageFolder = determinePackageFolder(packageDir);
    // insert version into package folder name
    return packageFolder.slice(0, 8) + version + packageFolder.slice(7);
}

(async () => {
    try {
        console.log(`Creating ZIP package from: ${sourceDir}`);
        await createZip(sourceDir, outputZip);
        console.log('Release package successfully created!');
    } catch (error) {
        console.error('Failed to create release package:', error);
        process.exit(1);
    }
})();
