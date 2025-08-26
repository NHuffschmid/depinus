const logger = require("./helpers/logger")(__filename);

function shutdown(appContext, req, res) {
  res.json(); // send 200 response before network is shutdown
  appContext.shutdown();
}

module.exports = { shutdown };
