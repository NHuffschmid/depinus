const fs = require('fs');
const path = require('path');

// Source and destination paths
const sourceDir = path.join('..', 'www', 'client', 'src', 'components', 'react-piano-keyboard', 'src');
const destDir = path.join('src', 'components', 'react-piano-keyboard');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy all files from source to destination
function copyFiles(src, dest) {
  const items = fs.readdirSync(src);
  
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyFiles(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  });
}

console.log('Copying react-piano-keyboard components...');
copyFiles(sourceDir, destDir);
console.log('Components copied successfully!');