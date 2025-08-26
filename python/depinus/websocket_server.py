#!/usr/bin/env python

import asyncio
import configparser
import json
import os
import pathlib
import sys
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
    
    def __init__(self):
        '''
        Constructor
        '''

        super().__init__()
        self._websockets = set()
        self._control_command_callbacks = set()
        self._keyboard_command_callbacks = set()
        self._connect_notification_callbacks = set()
        self._rpc_methods = {}


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


    async def send_keyboard_message(self, mido_message):

        try:

            for websocket in self._websockets:

                if (mido_message.type.startswith('note_o')):
                    velocity = 0 if (mido_message.type == 'note_off') else mido_message.velocity
                    wsMessage = json.dumps({
                        'messageType': 'keyboard',
                        'note': mido_message.note,
                        'velocity': velocity
                    })
                    logger.debug('JSON Message: ' + wsMessage)
                    asyncio.create_task(websocket.send(wsMessage))

                if (mido_message.type == 'control_change'):
                    if (mido_message.control == 123):
                        # all notes off - send special message to release all keys
                        wsMessage = json.dumps({'messageType': 'keyboard', 'note': 0, 'velocity': 0})
                        await websocket.send(wsMessage)


        except (ConnectionClosedOK, ConnectionClosedError) as exc:
            logger.info('ConnectionClosed connection detected!!!')
            pass


    async def send_info_message(self, info, websocket=None):

        wsMessage = json.dumps(info)
        if (websocket):
            logger.debug('Sending websocket info message: ' + str(wsMessage))
            await websocket.send(wsMessage) # send to one specific websocket client
        else:
            logger.debug('Broadcasting websocket info message: ' + str(wsMessage))
            websockets.broadcast(self._websockets, wsMessage)


    async def run(self):
        '''
        Runs the websocket server
        '''
        try:
            configFile = os.environ['DEPINUS_HOME'] + '/depinus.conf'    
            logger.debug('configFile: ' + configFile)
            config=configparser.ConfigParser()
            config.read(configFile)
            port = config['Network']['piano_daemon_websocket_port']

            # we reduce the close_timeout from 10 to 2 seconds
            # otherwise sleeping smartphone browsers will block other connected clients too long

            logger.info('Starting websocket server on port %s...' % port)
            await websockets.serve(self._websocket_handler, '', int(port))

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
                jsonMessage = json.loads(command)

                if (jsonMessage['commandType'] == 'keyboard'):
                    if (jsonMessage['pressed'] == True):
                        event = KeyboardCommand(jsonMessage['note'], 100)
                    else:
                        event = KeyboardCommand(jsonMessage['note'], 0)

                    # notify registered observers
                    for callback in self._keyboard_command_callbacks:
                        await callback(event)

                elif (jsonMessage['commandType'] == 'control'):
                    cmd = ControlCommand(jsonMessage['command'])

                    if (cmd.command == 'play_composition'):
                        cmd.name = jsonMessage['name']
                        cmd.composer = jsonMessage['composer']
                        cmd.duration = jsonMessage['duration']
                        cmd.mididata = bytes(jsonMessage['mididata']['data'])

                    if ('value' in jsonMessage):
                        cmd.value = jsonMessage['value']

                    # notify registered observers
                    for callback in self._control_command_callbacks:
                        await callback(cmd)

                elif (jsonMessage['commandType'] == 'rpc'):
                    errMsg = None
                    if 'method' not in jsonMessage:
                        errMsg = "No method found in RPC request"
                    elif jsonMessage['method'] not in self._rpc_methods:
                        errMsg = f"Unknown method '{jsonMessage['method']}'"
                    else:
                        logger.debug('RPC request received')
                        result = await self._rpc_methods[jsonMessage['method']](**jsonMessage.get('params', {}))

                    if (errMsg):
                        logger.error(errMsg)
                        message = {
                            "messageType": "rtc_response",
                            "error": errMsg
                        }
                    else:
                        message = {
                            "messageType": "rtc_response",
                            "result": result
                        }

                    wsMessage = json.dumps(message)
                    await websocket.send(wsMessage)

                else:
                    raise ValueError('Unsupported command type: ' + jsonMessage['commandType'])
                
            self._websockets.remove(websocket)
            logger.debug('Removed websocket client.')

        except (ConnectionClosedOK, ConnectionClosedError) as exc:
            self._websockets.remove(websocket)
            logger.debug('Removed websocket client due to closed connection.')

        except (Exception) as exc:
            logger.exception("_websocket_handler terminated unexpectedly: " + str(exc))
            self._websockets.remove(websocket)
