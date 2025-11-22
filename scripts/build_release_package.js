#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const scriptDir = __dirname;
const projectDir = path.resolve(scriptDir, '..');

function runBuildSteps() {
  console.log(`Running clean in ${projectDir} ...`);
  execSync('npm run clean', { stdio: 'inherit', cwd: projectDir });

  // more to come
}

runBuildSteps();
