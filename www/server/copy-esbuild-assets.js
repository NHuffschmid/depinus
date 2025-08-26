const fs = require('fs');
const path = require('path');

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

const folders = [
  { source: 'api/controllers', target: 'dist/api/controllers' },
  { source: 'api/swagger', target: 'dist/api/swagger' },
  { source: 'node_modules/swagger-node-runner/fittings', target: 'dist/fittings' },
  { source: 'node_modules/bagpipes/lib/fittings', target: 'dist/fittings' },
  { source: 'node_modules/bagpipes/lib/fittingTypes', target: 'dist/fittingTypes' },
  { source: 'node_modules/swagger-node-runner/lib', target: 'dist/lib' }  
];

for (const folder of folders) {
  const sourceDir = path.resolve(__dirname, folder.source);
  const targetDir = path.resolve(__dirname, folder.target);
  fs.mkdirSync(targetDir, { recursive: true });
  copyRecursive(sourceDir, targetDir);
  console.log(`${folder.source} successfully copied to ${targetDir}.`);
} 
