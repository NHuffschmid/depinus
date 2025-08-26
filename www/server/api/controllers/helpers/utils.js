const fs = require('fs');
const ini = require('ini');
const os = require('os');
const path = require('path');

function isWindows() {
    if (os.platform() === 'win32') {
        return true;
    }
    else {
        return false;
    }
}

function getPianoDaemonWebSocketUrl() {
    const config = parseConfig();
    const webServiceUrl = 'ws://' + os.hostname + ':' + config.Network.piano_daemon_websocket_port;
    return webServiceUrl;
}

function getTempFolder() {
    if (isWindows()) {
        return 'C:/'
    }
    else {
        return '/tmp/'
    }
}

function parseConfig() {
    const configPath = process.env.DEPINUS_HOME + '/depinus.conf';
    //console.log('configPath: ', configPath);
    const data = fs.readFileSync(configPath, 'utf8')
    const config = ini.parse(data);
    return config;
}

module.exports = {
    isWindows: isWindows,
    getPianoDaemonWebSocketUrl: getPianoDaemonWebSocketUrl,
    getTempFolder: getTempFolder,
    parseConfig: parseConfig
};
