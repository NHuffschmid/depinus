const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pianoDaemonSourceDir = path.resolve(__dirname, 'python/depinus/dist');
const clientSourceDir = path.resolve(__dirname, 'www/client/dist');
const serverSourceDir = path.resolve(__dirname, 'www/server/dist');
const pianoDaemonTargetDir = path.resolve(__dirname, 'dist');
const clientTargetDir = path.resolve(__dirname, 'dist/www/client/dist');
const serverTargetDir = path.resolve(__dirname, 'dist/www/server/dist');
const targetDir = path.resolve(__dirname, 'dist');

const additionalFiles = [
  path.resolve(__dirname, 'LICENSE'),
  path.resolve(__dirname, 'LICENSE_DEPINUS.md'),
  path.resolve(__dirname, 'LICENSE_BASIC_PITCH.md'),
  path.resolve(__dirname, 'depinus.conf'),
  path.resolve(__dirname, 'depinus.db'),
  path.resolve(__dirname, 'startup_jingle.mid'),
  path.resolve(__dirname, 'splash.html')
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function readVersionFromConf(confPath) {
  if (!fs.existsSync(confPath)) return null;
  const content = fs.readFileSync(confPath, 'utf8');
  const match = content.match(/^version\s*=\s*([\w\.-]+)/m);
  return match ? match[1] : null;
}

fs.mkdirSync(pianoDaemonTargetDir, { recursive: true });
fs.mkdirSync(clientTargetDir, { recursive: true });
fs.mkdirSync(serverTargetDir, { recursive: true });

copyRecursive(pianoDaemonSourceDir, pianoDaemonTargetDir);
copyRecursive(clientSourceDir, clientTargetDir);
copyRecursive(serverSourceDir, serverTargetDir);

for (const file of additionalFiles) {
  const filename = path.basename(file);
  fs.copyFileSync(file, path.join(targetDir, filename));
}

console.log(`Static files successfully copied to ${targetDir} folder.`);

const rootPkgPath = path.resolve(__dirname, 'package.json');
const distPkgPath = path.join(targetDir, 'package.json');
const confPath = path.resolve(__dirname, 'depinus.conf');

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const confVersion = readVersionFromConf(confPath);
const minimalPkg = {
  name: rootPkg.name,
  version: confVersion || rootPkg.version,
  description: rootPkg.description,
  main: rootPkg.main ? path.basename(rootPkg.main) : 'main.js',
  author: rootPkg.author,
  dependencies: rootPkg.dependencies || {}
};
fs.writeFileSync(distPkgPath, JSON.stringify(minimalPkg, null, 2), 'utf8');
console.log(`Minimal package.json written to ${distPkgPath}`);

execSync('npm install --production', { cwd: targetDir, stdio: 'inherit' });
console.log(`Installed production dependencies in ${targetDir}.`);
