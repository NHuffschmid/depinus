const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const logger = require('./logger');
const WebSocket = require('ws');
const net = require('net');
const minimist = require('minimist');
const { parseConfig } = require('./utils');

logger.info('🎵🎵🎵 Starting Depinus... 🎵🎵🎵');

if (app.isPackaged) {
  logger.debug('We are running in packaged mode');
  process.env.DEPINUS_HOME = path.join(app.getAppPath(), '..');
  process.env.DEPINUS_APP_PATH = app.getAppPath();
  process.env.DEPINUS_PIANO_DAEMON_PATH = path.join(app.getAppPath(), '..');
}
else {
  logger.debug('We are running in development mode');
  process.env.DEPINUS_HOME = __dirname;
  process.env.DEPINUS_APP_PATH = __dirname;
  process.env.DEPINUS_PIANO_DAEMON_PATH = path.join(__dirname, '.');
}

let backendServer;
let mainWindow;
let splashScreen;
let pianoDaemonWebsocket;

const config = parseConfig(process.env.DEPINUS_HOME + '/depinus.conf');

// parse arguments
const sliceCount = app.isPackaged ? 1 : 2;
const args = minimist(process.argv.slice(sliceCount), {
  boolean: ['headless', 'help'],
  alias: { h: 'help', p: 'port' },
  default: { port: config.Network.frontend_server_port }
});
if (args.help) {
  console.log(`Usage: ${path.basename(process.argv[0])} [Options]
Options:
  --headless          Starts the program in headless mode
  --help              Displays this help text
  -p, --port          Specifies the HTTP port to use (default: ${config.Network.frontend_server_port})`);
  process.exit(0);
}
const headless = args.headless;
if (headless) {
  logger.info('Started in headless mode');
  app.commandLine.appendSwitch('headless');
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('no-sandbox');
}
else {
  logger.info('Started in graphic display mode');
}

const frontend_server_port = args.port;

const waitForWebServer = (url, interval, maxRetries) => {
  let retries = 0;
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retries++;
          if (retries >= maxRetries) {
            reject(new Error('Server start timed out.'));
            return;
          } else {
            setTimeout(check, interval);
          }
        }
      }).on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Server start timed out.'));
          return;
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
};

const waitForWebsocketServer = (port, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkServer = () => {
      const client = net.createConnection(port, 'localhost');

      client.on('connect', () => {
        client.end();
        resolve(); // Server is available
      });

      client.on('error', (err) => {
        client.destroy();

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout: Websocket server on port ${port} is not available.`));
        } else {
          setTimeout(checkServer, 500);
        }
      });
    };
    checkServer();
  });
}

const startPianoDaemon = () => {
  return new Promise(async (resolve, reject) => {

    show_userinfo('Starting the piano daemon...');
    logger.info('Starting the piano daemon...');

    let pianoDaemonExecutable;
    if (os.platform() === 'win32') {
      pianoDaemonExecutable = 'piano_daemon.exe';
    }
    else if (os.platform() === 'linux') {
      pianoDaemonExecutable = 'piano_daemon';
    }
    else {
      reject(new Error('Unsupported platform: ' + os.platform()));
      return;
    }

    const pianoDaemonPath = path.join(process.env.DEPINUS_PIANO_DAEMON_PATH, pianoDaemonExecutable);
    if (fs.existsSync(pianoDaemonPath)) {
      logger.info(`Starting piano daemon ${pianoDaemonPath}...`);
      pianoDaemon = spawn(pianoDaemonPath, { shell: true });
    }
    else {
      logger.warn(`No piano daemon executable found at ${pianoDaemonPath}. For test purposes it has to be started manually!`);
    }

    resolve();
  });
};

const startBackend = () => {
  return new Promise(async (resolve, reject) => {
    const backendServerBundle = path.join(__dirname, 'www/server/dist/server.js');
    logger.info('Starting the backend server...');
    show_userinfo('Starting the backend server...');

    backendServer = require(backendServerBundle);
    backendServer.onExit(shutdown);

    try {
      const restApiPort = config.Network.backend_rest_api_port;
      await waitForWebServer(`http://localhost:${restApiPort}/api-docs/`, 1000, 30);

      logger.info('Backend server is listening.');

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const configureFrontend = () => {
  return new Promise((resolve, reject) => {
    const configPath = path.join(__dirname, 'www/client/dist/config.js');
    const backendUrl = 'http://' + os.hostname() + ':' + config.Network.backend_rest_api_port;

    logger.info(`Configuring the frontend for backend url ${backendUrl} in ${configPath}...`);
    show_userinfo('Configuring the frontend...');

    const configContent = `window._env_ = { VITE_BACKEND_URL: "${backendUrl}" };`;
    fs.writeFileSync(configPath, configContent);

    // wait until piano daemon and backend server are ready
    // TODO: maybe use a more elegant solution
    setTimeout(() => {
      resolve();
    }, 2000);
  });
};

const startFrontend = () => {
  return new Promise((resolve, reject) => {
    const buildDir = path.join(__dirname, 'node_modules/client/build');
    logger.info('Starting the frontend server...');
    logger.debug(`Serving files from: ${buildDir}`);

    try {
      const server = http.createServer((req, res) => {
        const filePath = path.join(__dirname, 'www/client/dist', req.url === '/' ? 'index.html' : req.url);
        const extname = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.wav': 'audio/wav',
          '.mp4': 'video/mp4',
          '.woff': 'application/font-woff',
          '.ttf': 'application/font-ttf',
          '.eot': 'application/vnd.ms-fontobject',
          '.otf': 'application/font-otf',
          '.wasm': 'application/wasm',
        }[extname] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
          if (err) {
            if (err.code === 'ENOENT') {
              fs.readFile(path.join(buildDir, '404.html'), (error, page404) => {
                if (error) {
                  res.writeHead(500);
                  res.end('500 - Internal Server Error');
                } else {
                  res.writeHead(404, { 'Content-Type': 'text/html' });
                  res.end(page404, 'utf-8');
                }
              });
            } else {
              res.writeHead(500);
              res.end(`500 - Internal Server Error: ${err.code}`);
            }
          } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
          }
        });
      });

      server.listen(frontend_server_port, () => {
        logger.info(`Frontend server is running on port ${frontend_server_port}`);
        resolve(server);
      });

      server.on('error', (error) => {
        logger.error('Error while starting frontend server:', error);
        reject(error);
      });
    } catch (error) {
      logger.error('Error while starting frontend server:', error);
      reject(error);
    }
  });
};

function show_userinfo(info) {
  if (headless) {
    logger.info(`Headless mode: ${info}`);
  }
  else {
    splashScreen.webContents.send('update-status', info);
  }
}

function update_progress(progress) {
  if (!headless && splashScreen && !splashScreen.isDestroyed()) {
    logger.info(`Updating progress to ${progress}%`);
    splashScreen.webContents.send('update-progress', progress);
  }
}

function shutdown(shutdownBackendServer = false) {

  logger.info('Shutdown piano daemon...');
  pianoDaemonWebsocket.send(JSON.stringify({ commandType: 'control', command: 'shutdown' }));

  if (shutdownBackendServer) {
    logger.info('Shutdown backend server...');
    backendServer.shutdown();
  }

  setTimeout(function () {
    logger.info('🎵🎵🎵 Depinus terminated. 🎵🎵🎵');
    app.quit();
  }, 1000);
}

app.on('ready', async () => {

  if (!headless) {

    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: __dirname + '/www/client/dist/favicon.ico',
      webPreferences: {
        nodeIntegration: true
      },
      show: false,
    });

    mainWindow.once('ready-to-show', () => {
      splashScreen.destroy();
      mainWindow.show();
    });

    splashScreen = new BrowserWindow({
      width: 600,
      height: 500,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    splashScreen.loadFile('splash.html');
    
    // Wait for splash screen to be ready before sending updates
    ipcMain.once('splash-ready', () => {
      logger.info('Splash screen ready, starting app initialization...');
      
      // Send logo and title after renderer is ready
      const logoPath = path.join(process.env.DEPINUS_APP_PATH, '..', 'www/client/public/images/depinus-logo.png');
      try {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const logoDataUrl = `data:image/png;base64,${logoBase64}`;
        splashScreen.webContents.send('update-logo', logoDataUrl);
      } catch (error) {
        logger.error('Could not load logo:', error);
        logger.error('Tried path:', logoPath);
      }
      const title = 'Depinus - Opus ' + config.Default.version + ' - ' + config.Default.edition;
      splashScreen.webContents.send('update-title', title);
      
      // Initialize progress
      update_progress(0);
      
      // Start the actual startup process
      startApplicationSequence();
    });
  }  function startApplicationSequence() {
    startPianoDaemon()
      .then(async () => {

        update_progress(10);

        const pianoDaemonWebsocketPort = config.Network.piano_daemon_websocket_port;
        await waitForWebsocketServer(pianoDaemonWebsocketPort);
        logger.info(`Register on piano daemon websocket on port ${pianoDaemonWebsocketPort}`);
        pianoDaemonWebsocket = new WebSocket(`ws://localhost:${pianoDaemonWebsocketPort}`);

        startBackend()
          .then(async () => {

            update_progress(30);

            configureFrontend()
              .then(() => {

                update_progress(80);

                // Small delay to make 80% visible before starting frontend
                setTimeout(() => {
                  startFrontend()
                    .then(() => {
                    // Step 4 completed: Frontend started (100%)
                    logger.info('Frontend started, updating progress to 100%');
                    update_progress(100);

                    if (!headless) {

                      //mainWindow.webContents.openDevTools();
                      const url = `http://localhost:${frontend_server_port}`;

                      logger.info(`Loading URL ${url}...`);
                      splashScreen.webContents.send('update-status', `Loading URL ${url}...`);
                      mainWindow.loadURL(url);

                      // remove standard menu
                      Menu.setApplicationMenu(null);
                    }

                    logger.info('Play startup jingle...');
                    pianoDaemonWebsocket.send(JSON.stringify({ commandType: 'control', command: 'play_startup_jingle' }));
                  })
                  .catch((error) => {
                    show_userinfo(`ERROR: Cannot start the frontend server on port ${frontend_server_port}.`);
                    logger.error('Error while starting frontend server: ' + error);
                    setTimeout(() => {
                      shutdown();
                    }, 3000);
                  });
                }, 1000); 
              })
              .catch((error) => {
                show_userinfo(`ERROR: Cannot build the frontend server.`);
                logger.error('Error while building frontend server: ' + error);
                setTimeout(() => {
                  shutdown();
                }, 3000);
              });
          })
          .catch((error) => {
            show_userinfo(`ERROR: Cannot start the backend server.`);
            logger.error('Error while starting backend server: ' + error);
            setTimeout(() => {
              shutdown();
            }, 3000);
          });
      })
      .catch((error) => {
        show_userinfo(`ERROR: Cannot start the piano daemon.`);
        logger.error('Error while starting piano daemon: ' + error);
        setTimeout(() => {
          shutdown();
        }, 3000);
        setTimeout(() => {
          shutdown();
        }, 3000);
      });
  }  // End of startApplicationSequence function
});

app.on('window-all-closed', () => {
  logger.debug('window-all-closed event received.');
  shutdown(shutdownBackendServer = true);
});
