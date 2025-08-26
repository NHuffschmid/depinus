// RPC client for the Depinus websocket interface

const WebSocket = require('ws');
const utils = require('./utils');
const logger = require("./logger")(__filename);

class RpcClient {
    static call(method, params = {}) {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(utils.getPianoDaemonWebSocketUrl());
            socket.onopen = () => {
                const request = JSON.stringify({ commandType: 'rpc', method, params });
                socket.send(request);
            };
            socket.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.messageType === 'rtc_response') {
                    if (response.error) {
                        logger.error(`RPC error: ${response.error}`);
                        reject(response.error);
                    } else {
                        resolve(response.result);
                    }
                    socket.close();
                }
            };
            socket.onerror = (err) => {
                reject(err);
                socket.close();
            };
        });
    }
}

module.exports = RpcClient;
