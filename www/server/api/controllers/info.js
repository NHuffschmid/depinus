const utils = require('./helpers/utils');
const os = require("os");

module.exports = {
  info: info
};

function info(req, res) {

  const info = {};

  const config = utils.parseConfig();
  info['version'] = config.Default.version;
  info['edition'] = config.Default.edition;

  info['webSocketUrl'] = utils.getPianoDaemonWebSocketUrl();

  const platformData = {};
  platformData['Hostname'] = os.hostname();
  platformData['Platform'] = os.platform();
  platformData['CPU'] = os.arch();
  platformData['Total Mem'] = Math.floor(os.totalmem() / 1024 / 1024) + ' MB';

  info['platformData'] = platformData;

  res.json(info);
}
