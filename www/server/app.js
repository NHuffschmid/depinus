const SwaggerExpress = require('swagger-express-mw');
const app = require('express')();
const logger = require("./api/controllers/helpers/logger")(__filename);
const utils = require('./api/controllers/helpers/utils');
const swaggerUi = require('swagger-ui-express');
const fs = require("fs");
const path = require('path');
const YAML = require('yaml');
const swaggerYamlPath = path.join(__dirname, '/api/swagger/swagger.yaml');
const file = fs.readFileSync(swaggerYamlPath, 'utf8');
const swaggerDocument = YAML.parse(file);
const shutdownController = require('./api/controllers/shutdown');

const appContext = {
  app,
  shutdown: () => {
    shutdown(shutdownListener = true);
  }
};

process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';
const swaggerConfig = {
  appRoot: __dirname
};

logger.info('🖧🖧🖧 Starting Depinus Backend Server 🖧🖧🖧');

// create websocket server for main app
const ini = utils.parseConfig();

SwaggerExpress.create(swaggerConfig, function (err, swaggerExpress) {
  if (err) {
    logger.error(err);
    throw err;
  }

  try {
    app.use((req, res, next) => {
      logger.info('Request received: ' + req.url);
      next();
    });

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    app.post('/shutdown', (req, res) => {
      shutdownController.shutdown(appContext, req, res);
    });

    // install middleware
    swaggerExpress.register(app);

    const restApiPort = ini.Network.backend_rest_api_port;
    logger.info('Listening for REST API requests on port ' + restApiPort);
    app.server = app.listen(restApiPort);
    global.appServer = app.server;
  }
  catch (err) {
    logger.error(`Error during middleware initialization: ${err.message}`);
  }
});

let exitCallback = null;

function shutdown(shutdownListener = false) {
  logger.info('Backend shutdown initiated...');

  if (shutdownListener) {
    exitCallback();
  }

  setTimeout(function () {
    logger.info('🖧🖧🖧 Depinus Backend Server ended. 🖧🖧🖧');
  }, 1000);
}

function onExit(callback) {
  exitCallback = callback;
}

module.exports = {
  app,
  shutdown,
  onExit
};
