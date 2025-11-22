#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const scriptDir = __dirname;
const projectDir = path.resolve(scriptDir, '..');

const consoleColor = '\x1b[33m%s\x1b[0m'; // Yellow color

console.log(consoleColor, `Running clean in ${projectDir} ...`);
execSync('npm run clean', { stdio: 'inherit', cwd: projectDir });

// more to come
