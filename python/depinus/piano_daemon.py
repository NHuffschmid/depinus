#!/usr/bin/env python

# Piano daemon - Depinus main loop

import asyncio
import mido
import io

from depinus import logger
from depinus.websocket_server import WebsocketServer
from depinus.composition import Composition
from depinus.piano_player import PianoPlayer

class PianoDaemon:
    '''Creates and wires up the main components'''
    
    def __init__(self):
        '''
        Constructor
        '''

        super().__init__()

        # see https://docs.python.org/3.10/library/asyncio-task.html#asyncio.create_task
        self._background_tasks = set() # avoid tasks getting garbage collected

        self._websocket_server = WebsocketServer()
        self._piano_player = PianoPlayer()

        outputNames = mido.get_output_names()
        self._midiOutPort = outputNames[len(outputNames) - 1] # use external USB midi device


    async def run(self):

        logger.info('🎹🎹🎹 Starting piano daemon... 🎹🎹🎹')

        try:
            ##########################
            # start components #
            ##########################

            logger.info('Start websocket server...')
            self._background_tasks.add(asyncio.create_task(self._websocket_server.run()))

            ######################
            # wire up components #
            ######################

            self._websocket_server.register_for_control_commands(self._on_control_command)
            self._websocket_server.register_for_keyboard_commands(self._on_keyboard_command)
            self._websocket_server.register_for_connect_notifications(self._on_connect_notification)
            self._websocket_server.register_for_rpc("PlayComposition", self._on_play_composition)
            self._websocket_server.register_for_rpc("CalculatePlayDuration", self._on_calculate_play_duration)

            self._piano_player.register_for_midi_messages(self._on_midi_message)
            self._piano_player.register_for_play_end(self._on_play_end)

            logger.info('Entering main loop...')
            self._mainloop = asyncio.Future()
            await self._mainloop

            logger.info('🎹🎹🎹 Piano daemon ended. 🎹🎹🎹')

        except Exception:
            logger.exception("Piano daemon aborted unexpectedly.")


    async def _on_control_command(self, cmd):
        if (cmd.command == 'play'):
            logger.info('play command received.')
            await self._piano_player.play()
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'isStoppable' : True, 'isPlayable' : False, 'isPauseable' : True }
            )
        elif (cmd.command == 'pause'):
            logger.info('pause command received.')
            self._piano_player.pause()
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'isStoppable' : True, 'isPlayable' : True, 'isPauseable' : False }
            )
        elif (cmd.command == 'stop'):
            logger.info('stop command received.')
            await self._piano_player.stop()
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'isStoppable' : False, 'isPlayable' : True, 'isPauseable' : False }
            )
        elif (cmd.command == 'tempo'):
            logger.info('tempo command received: ' + str(cmd.value))
            self._piano_player.tempo = cmd.value
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'tempo' : cmd.value }
            )
        elif (cmd.command == 'dynamics'):
            logger.info('dynamics command received: ' + str(cmd.value))
            self._piano_player.dynamics = cmd.value
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'dynamics' : cmd.value }
            )
        elif (cmd.command == 'transposition'):
            logger.info('transposition command received: ' + str(cmd.value))
            self._piano_player.transposition = cmd.value
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'transposition' : cmd.value }
            )
        elif (cmd.command == 'gotoPlayTime'):
            logger.info('gotoPlayTime (%s sec) command received.' % str(cmd.value))

            # release all keyboard keys
            await self._websocket_server.send_keyboard_message(
                mido.Message('note_on', note=0, velocity=0)
            )

            # disable all dashboard buttons during search time
            await self._websocket_server.send_info_message(
                {
                    'messageType': 'info',
                    'isStoppable': False,
                    'isPlayable': False,
                    'isPauseable': False
                })
            
            # find position in midi file
            await self._piano_player.gotoPlayTime(cmd.value)

            # update clients
            await self._websocket_server.send_info_message(
                {
                    'messageType': 'info',
                    'isStoppable': self._piano_player.isStoppable,
                    'isPlayable': self._piano_player.isPlayable,
                    'isPauseable': self._piano_player.isPauseable,
                    'composition': {
                        'name': self._piano_player.currentComposition.Name, 
                        'composerName': self._piano_player.currentComposition.Composer, 
                        'duration': self._piano_player.currentComposition.Duration,
                        'playTime': cmd.value
                    }
                })
        elif (cmd.command == 'shutdown'):
            logger.info('shutdown command received.')
            await self._piano_player.stop()
            self._mainloop.set_result('Done')
        elif (cmd.command == 'play_startup_jingle'):
            logger.info('play_startup_jingle command received.')
            await self._piano_player.play_startup_jingle()
        else:
            raise ValueError('Unsupported command: ' + cmd.command)


    async def _on_keyboard_command(self, cmd):
        # logger.info('Keyboard command received')
        message = mido.Message('note_on', note=cmd.note, velocity=cmd.velocity)
        self._piano_player.play_midi_message(message)

        # awaiting websocket.send() results in a blocking midi server loop
        #  in case that mobile Android device fall asleep and break the websocket connection
        # we work around this by creating independent tasks
        # (not sure if garbage collection is an issue here)
        # asyncio.create_task(await self._websocket_server.send_keyboard_message(message))
        await self._websocket_server.send_keyboard_message(message)


    async def _on_connect_notification(self, websocket):
        #logger.info('New websocket client has connected.')
        info = {
            'messageType': 'info',
            'tempo': self._piano_player.tempo,
            'dynamics': self._piano_player.dynamics,
            'transposition': self._piano_player.transposition
        }
        composition = self._piano_player.currentComposition
        if (composition):
            info['composition'] = {
                'name': composition.Name, 
                'composerName': composition.Composer, 
                'duration': composition.Duration,
                'playTime': self._piano_player.playTime
            }
            info['isStoppable'] = self._piano_player.isStoppable
            info['isPlayable'] = self._piano_player.isPlayable
            info['isPauseable'] = self._piano_player.isPauseable
        else:
            info['isStoppable'] = False
            info['isPlayable'] = False
            info['isPauseable'] = False

        await self._websocket_server.send_info_message(info, websocket)


    async def _on_play_composition(self, name, composer, duration, mididata):
        logger.info('Going to play: %s...' % name)
        #composition = Composition(name, composer, duration, mididata)
        composition = Composition(name, composer, duration, bytes(mididata))
        await self._piano_player.play(composition)
        await self._websocket_server.send_info_message(
            {
                'messageType': 'info',
                'isStoppable': True,
                'isPlayable': False,
                'isPauseable': True,
                'composition': {
                    'name': self._piano_player.currentComposition.Name, 
                    'composerName': self._piano_player.currentComposition.Composer, 
                    'duration': self._piano_player.currentComposition.Duration,
                    'playTime': self._piano_player.playTime
                }
            })


    async def _on_calculate_play_duration(self, mididata):
        midi_stream = io.BytesIO(bytes(mididata))
        duration = int(mido.MidiFile(file=midi_stream).length)
        logger.info('Calculated play duration: %s sec' % str(duration))
        return duration


    async def _on_midi_message(self, mido_message):
        #logger.info('Piano player has transmitted a midi message: ' + str(mido_message))
        await self._websocket_server.send_keyboard_message(mido_message)


    async def _on_play_end(self):
        logger.info('Piano player has stopped playing.')
        await self._websocket_server.send_info_message(
            {
                'messageType': 'info',
                'isStoppable': False,
                'isPlayable': True,
                'isPauseable': False,
                'composition': {
                    'name': self._piano_player.currentComposition.Name, 
                    'composerName': self._piano_player.currentComposition.Composer, 
                    'duration': self._piano_player.currentComposition.Duration,
                    'playTime': 0
                }
            })

        # release all keyboard keys if not done already
        await self._websocket_server.send_keyboard_message(
            mido.Message('note_on', note=0, velocity=0)
        )


if __name__ == '__main__':
    asyncio.run(PianoDaemon().run())
