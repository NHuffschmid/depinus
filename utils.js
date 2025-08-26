const fs = require('fs');
const ini = require('ini');

function parseConfig(configPath) {
  const data = fs.readFileSync(configPath, 'utf8');
  const config = ini.parse(data);
  return config;
}

module.exports = { parseConfig };
