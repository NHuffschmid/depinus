const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, 'public');
const targetDir = path.resolve(__dirname, 'dist');
const additionalFiles = [];

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

copyRecursive(sourceDir, targetDir);

for (const file of additionalFiles) {
  const filename = path.basename(file);
  fs.copyFileSync(file, path.join(targetDir, filename));
}

console.log(`Static files successfully copied to ${targetDir} folder.`);
