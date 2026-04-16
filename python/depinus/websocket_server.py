#!/usr/bin/env python

import json
import websockets

from depinus import logger
from websockets.exceptions import WebSocketException, ConnectionClosedOK, ConnectionClosedError


class ControlCommand:
    '''Informs about a received control command'''

    def __init__(self, command):
        self.command = command

class KeyboardCommand:
    '''Informs about a press or release key'''

    def __init__(self, note, velocity):
        self.note = note
        self.velocity = velocity


class WebsocketServer:
    '''Handles the websocket connection(s) with the React frontend'''
    
    def __init__(self, port):
        '''
        Constructor
        Parameters:
            port: Port to run the websocket server on
        '''

        super().__init__()
        self._websockets = set()
        self._control_command_callbacks = set()
        self._keyboard_command_callbacks = set()
        self._connect_notification_callbacks = set()
        self._rpc_methods = {}
        self._port = port


    def register_for_control_commands(self, callback):
        '''Subscribe for control command notifications

            Parameters:
            callback: Callback routine to be invoked
        '''
        logger.debug('Add new subscription for control commands...')
        self._control_command_callbacks.add(callback)


    def register_for_keyboard_commands(self, callback):
        '''Subscribe for keyboard command notifications

            Parameters:
            callback: Callback routine to be invoked
        '''
        logger.debug('Add new subscription for keyboard commands...')
        self._keyboard_command_callbacks.add(callback)


    def register_for_connect_notifications(self, callback):
        '''Subscribe for notifications about new client connections

            Parameters:
            callback: Callback routine to be invoked
        '''
        logger.debug('Add new subscription for client cconnection info...')
        self._connect_notification_callbacks.add(callback)


    def register_for_rpc(self, name, callback):
        '''Subscribe for a given 'remote procedure call

            Parameters:
            name: Name of the RPC
            callback: Callback routine to be invoked
        '''
        logger.debug('Add new subscription for RPC ' + name + '...')
        self._rpc_methods[name] = callback


    async def send_keyboard_message(self, mido_message, play_time=None):

        try:

            for websocket in self._websockets:

                if (mido_message.type.startswith('note_o')):
                    velocity = 0 if (mido_message.type == 'note_off') else mido_message.velocity
                    msg = {
                        'messageType': 'info',
                        'infoType': 'keyboard',
                        'note': mido_message.note,
                        'velocity': velocity
                    }
                    if play_time is not None:
                        msg['playTime'] = play_time
                    ws_message = json.dumps(msg)
                    #logger.debug('JSON Message: ' + ws_message)
                    await websocket.send(ws_message)

                if (mido_message.type == 'control_change'):
                    if (mido_message.control == 123):
                        # all notes off - send special message to release all keys
                        ws_message = json.dumps({'messageType': 'info', 'infoType': 'keyboard', 'note': 0, 'velocity': 0})
                        await websocket.send(ws_message)


        except (ConnectionClosedOK, ConnectionClosedError) as exc:
            logger.debug('ConnectionClosed connection detected!!!')
            pass


    async def send_info_message(self, info, websocket=None):

        ws_message = json.dumps(info)
        if (websocket):
            logger.debug('Sending websocket info message: ' + str(ws_message))
            await websocket.send(ws_message) # send to one specific websocket client
        else:
            logger.debug('Broadcasting websocket info message: ' + str(ws_message))
            websockets.broadcast(self._websockets, ws_message)


    async def run(self):
        '''
        Runs the websocket server
        '''
        try:
            # we reduce the close_timeout from 10 to 2 seconds
            # otherwise sleeping smartphone browsers will block other connected clients too long

            logger.info('Starting websocket server on port %s...' % self._port)
            await websockets.serve(self._websocket_handler, '', int(self._port))

        except (Exception) as exc:
            logger.exception("Websocket server crashed: " + str(exc))


    async def _websocket_handler(self, websocket, path):

        try:

            self._websockets.add(websocket)
            logger.debug('Add websocket client.')
            # notify registered observers
            for callback in self._connect_notification_callbacks:
                await callback(websocket)

            async for command in websocket:
                #logger.info('Websocket command received: ' + command)
                json_message = json.loads(command)

                if (json_message['commandType'] == 'keyboard'):
                    if (json_message['pressed'] == True):
                        event = KeyboardCommand(json_message['note'], 100)
                    else:
                        event = KeyboardCommand(json_message['note'], 0)

                    # notify registered observers
                    for callback in self._keyboard_command_callbacks:
                        await callback(event)

                elif (json_message['commandType'] == 'control'):
                    cmd = ControlCommand(json_message['command'])

                    if (cmd.command == 'play_composition'):
                        cmd.name = json_message['name']
                        cmd.composer = json_message['composer']
                        cmd.duration = json_message['duration']
                        cmd.mididata = bytes(json_message['mididata']['data'])

                    if ('value' in json_message):
                        cmd.value = json_message['value']

                    # notify registered observers
                    for callback in self._control_command_callbacks:
                        await callback(cmd)

                elif (json_message['commandType'] == 'rpc'):
                    err_msg = None
                    result = None
                    if 'method' not in json_message:
                        err_msg = "No method found in RPC request"
                    elif json_message['method'] not in self._rpc_methods:
                        err_msg = f"Unknown method '{json_message['method']}'"
                    else:
                        logger.debug('RPC request received')
                        try:
                            result = await self._rpc_methods[json_message['method']](**json_message.get('params', {}))
                        except Exception as exc:
                            err_msg = f"RPC error: {str(exc)}"
                            logger.exception(err_msg)

                    if (err_msg):
                        logger.error(err_msg)
                        message = {
                            "messageType": "rpc_response",
                            "error": err_msg
                        }
                    else:
                        message = {
                            "messageType": "rpc_response",
                            "result": result
                        }

                    ws_message = json.dumps(message)
                    await websocket.send(ws_message)

                else:
                    raise ValueError('Unsupported command type: ' + json_message['commandType'])
                
            self._websockets.remove(websocket)
            logger.debug('Removed websocket client.')

        except (ConnectionClosedOK, ConnectionClosedError) as exc:
            self._websockets.remove(websocket)
            logger.debug('Removed websocket client due to closed connection.')

        except (Exception) as exc:
            logger.exception("_websocket_handler terminated unexpectedly: " + str(exc))
            self._websockets.remove(websocket)
