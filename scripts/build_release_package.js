#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const scriptDir = __dirname;
const projectDir = path.resolve(scriptDir, '..');

const consoleYellowColor = '\x1b[33m%s\x1b[0m';
const consoleGreenColor = '\x1b[32m%s\x1b[0m';
const consoleRedColor = '\x1b[31m%s\x1b[0m';

const isWindows = process.platform === 'win32';

try {
  console.log(consoleYellowColor, `Running clean script...`);
  execSync('npm run clean', { stdio: 'inherit', cwd: projectDir });

  console.log(consoleYellowColor, 'Activating virtual Python environment and running build...');
  if (isWindows) {
    execSync('.\\venv\\Scripts\\activate && npm run build', { stdio: 'inherit', cwd: projectDir, shell: true });
  } else {
    execSync('source ./venv/bin/activate && npm run build', { stdio: 'inherit', cwd: projectDir, shell: '/bin/bash' });
  }
} catch (error) {
  console.log(consoleRedColor, error.message || error);
}
