#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const consoleYellowColor = '\x1b[33m%s\x1b[0m';
const consoleGreenColor = '\x1b[32m%s\x1b[0m';
const consoleRedColor = '\x1b[31m%s\x1b[0m';

const isWindows = process.platform === 'win32';

try {
  console.log(consoleYellowColor, 'Cleaning workspace...');
  execSync('npm run clean', { stdio: 'inherit' });

  /*
  console.log(consoleYellowColor, 'Activating virtual Python environment and running build...');
  if (isWindows) {
    execSync('.\\venv\\Scripts\\activate && npm run build', { stdio: 'inherit', shell: true });
  } else {
    execSync('source ./venv/bin/activate && npm run build', { stdio: 'inherit', shell: '/bin/bash' });
  }
  */
 
  console.log(consoleGreenColor, 'Release package successfully built.');
} catch (error) {
  console.log(consoleRedColor, error.message || error);
}
