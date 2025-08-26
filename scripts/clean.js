const fs = require('fs');
const path = require('path');

const deleteFolderRecursive = (folderPath) => {
    try {
        if (fs.existsSync(folderPath)) {
            console.log(`Deleting folder '${folderPath}'...`);
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log('Folder successfully deleted.');
        }
        else {
            console.log(`Folder '${folderPath}' does not exist.`);
        }
    } catch (err) {
        console.error(`Error while deleting folder ${folderPath}: ${err.message}`);
    }
};

const nodeModulesPathDepinus = path.join(__dirname, '../node_modules');
const nodeModulesPathServer = path.join(__dirname, '../www/server/node_modules');
const nodeModulesPathClient = path.join(__dirname, '../www/client/node_modules');
const nodeModulesPathKeyboard = path.join(__dirname, '../www/client/src/components/react-piano-keyboard/node_modules');
const distPathDepinus = path.join(__dirname, '../dist');
const distPathServer = path.join(__dirname, '../www/server/dist');
const distPathClient = path.join(__dirname, '../www/client/dist');
const pythonDistPath = path.join(__dirname, '../python/depinus/dist');
const pythonBuildPath = path.join(__dirname, '../python/depinus/build');
const packagePath = path.join(__dirname, '../package');

deleteFolderRecursive(nodeModulesPathDepinus);
deleteFolderRecursive(nodeModulesPathServer);
deleteFolderRecursive(nodeModulesPathClient);
deleteFolderRecursive(nodeModulesPathKeyboard);
deleteFolderRecursive(distPathDepinus);
deleteFolderRecursive(distPathServer);
deleteFolderRecursive(distPathClient);
deleteFolderRecursive(pythonDistPath);
deleteFolderRecursive(pythonBuildPath);
deleteFolderRecursive(packagePath);
