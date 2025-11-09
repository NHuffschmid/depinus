#!/usr/bin/env python

# Piano daemon - Depinus main loop

import asyncio
import mido
import io

from depinus import logger
from depinus.websocket_server import WebsocketServer
from depinus.composition import Composition
from depinus.piano_player import PianoPlayer
from depinus.midi_interface_observer import MidiInterfaceObserver
from depinus.config_utils import read_config, persist_config_setting

class PianoDaemon:
    '''Creates and wires up the main components'''
    
    def __init__(self):
        '''
        Constructor
        '''

        super().__init__()

        # see https://docs.python.org/3.10/library/asyncio-task.html#asyncio.create_task
        self._background_tasks = set() # avoid tasks getting garbage collected

        # Load default settings from config file
        config = read_config()
        settings = config['Settings'] if 'Settings' in config else {}

        port = config['Network']['piano_daemon_websocket_port']
        self._websocket_server = WebsocketServer(port)

        self._piano_player = PianoPlayer()
        self._piano_player.dynamics = int(settings.get('dynamics', 50))
        self._piano_player.tempo = float(settings.get('tempo', 1.0))
        self._piano_player.transposition = int(settings.get('transposition', 0))

        self._midi_interface_observer = MidiInterfaceObserver()
        self._midi_interface_observer.register(self._on_midi_interfaces_changed)
        self._midi_out_ports_available = []
        self._midi_out_ports_selected = None

        self._playlist = None


    async def run(self):

        logger.info('🎹🎹🎹 Starting piano daemon... 🎹🎹🎹')

        try:
            ##########################
            # start components #
            ##########################

            logger.info('Start websocket server...')
            self._background_tasks.add(asyncio.create_task(self._websocket_server.run()))

            logger.info('Start midi interface observer...')
            self._midi_interface_observer.start()

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
            persist_config_setting('Settings', 'tempo', str(cmd.value))
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'tempo' : cmd.value }
            )
        elif (cmd.command == 'dynamics'):
            logger.info('dynamics command received: ' + str(cmd.value))
            self._piano_player.dynamics = cmd.value
            persist_config_setting('Settings', 'dynamics', str(cmd.value))
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'dynamics' : cmd.value }
            )
        elif (cmd.command == 'transposition'):
            logger.info('transposition command received: ' + str(cmd.value))
            self._piano_player.transposition = cmd.value
            persist_config_setting('Settings', 'transposition', str(cmd.value))
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'transposition' : cmd.value }
            )
        elif (cmd.command == 'selectedMidiOutPort'):
            logger.info('selectedMidiOutPort command received: ' + cmd.value)
            self._midi_out_ports_selected = cmd.value
            await self._piano_player.set_midi_out_port(cmd.value)
            persist_config_setting('Midi', 'midi_out_port', cmd.value)
            await self._websocket_server.send_info_message(
                { 'messageType': 'info', 'selectedMidiOutPort' : cmd.value }
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
            await self._piano_player.goto_play_time(cmd.value)

            # update clients
            await self._websocket_server.send_info_message(
                {
                    'messageType': 'info',
                    'isStoppable': self._piano_player.is_stoppable,
                    'isPlayable': self._piano_player.is_playable,
                    'isPauseable': self._piano_player.is_pauseable,
                    'composition': {
                        'name': self._piano_player.current_composition.name, 
                        'composerName': self._piano_player.current_composition.composer, 
                        'duration': self._piano_player.current_composition.duration,
                        'playTime': cmd.value
                    }
                })
        elif (cmd.command == 'playlist'):
            logger.info('Playlist command received: ' + str(cmd.value))
            if (cmd.value.get('id') == 0):
                # new client wants to receive the current playlist info (if any)
                if (self._playlist != None):
                    info_msg = { 'messageType': 'info', 'playlist': self._playlist }
                    logger.info('Sending playlist info to client: ' + str(info_msg))
                    await self._websocket_server.send_info_message(info_msg)
            else:
                # a client is updating the playlist info
                # store and mirrow it to all clients
                if (self._playlist == None):
                    self._playlist = { }
                if ('id' in cmd.value):
                    self._playlist['id'] = cmd.value['id']
                if ('shuffle' in cmd.value):
                    self._playlist['shuffle'] = cmd.value['shuffle']
                if ('repeatMode' in cmd.value):
                    self._playlist['repeatMode'] = cmd.value['repeatMode']
                info_msg = {
                    'messageType': 'info',
                    'playlist': cmd.value
                }
                await self._websocket_server.send_info_message(info_msg)

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
        composition = self._piano_player.current_composition
        if composition:
            info['composition'] = {
                'name': composition.name, 
                'composerName': composition.composer, 
                'duration': composition.duration,
                'playTime': self._piano_player.play_time
            }
            info['isStoppable'] = self._piano_player.is_stoppable
            info['isPlayable'] = self._piano_player.is_playable
            info['isPauseable'] = self._piano_player.is_pauseable
        else:
            info['isStoppable'] = False
            info['isPlayable'] = False
            info['isPauseable'] = False
        info['availableMidiOutPorts'] = self._midi_out_ports_available
        info['selectedMidiOutPort'] = self._midi_out_ports_selected

        await self._websocket_server.send_info_message(info, websocket)


    async def _on_play_composition(self, name, compositionId, composer, duration, mididata, playlistId=None):
        logger.info('Going to play: %s...' % name)
        composition = Composition(name, composer, duration, bytes(mididata))
        await self._piano_player.play(composition)
        info_msg = {
            'messageType': 'info',
            'isStoppable': True,
            'isPlayable': False,
            'isPauseable': True,
            'composition': {
                'name': self._piano_player.current_composition.name,
                'compositionId': compositionId,
                'composerName': self._piano_player.current_composition.composer,
                'duration': self._piano_player.current_composition.duration,
                'playTime': self._piano_player.play_time
            }
        }
        await self._websocket_server.send_info_message(info_msg)


    async def _on_calculate_play_duration(self, mididata):
        midi_stream = io.BytesIO(bytes(mididata))
        duration = int(mido.MidiFile(file=midi_stream).length)
        logger.info('Calculated play duration: %s sec' % str(duration))
        return duration


    async def _on_midi_message(self, mido_message):
        #logger.info('Piano player has transmitted a midi message: ' + str(mido_message))
        await self._websocket_server.send_keyboard_message(mido_message)


    async def _on_play_end(self, cancelled):
        logger.info('Piano player has stopped playing.')
        await self._websocket_server.send_info_message(
            {
                'messageType': 'info',
                'isStoppable': False,
                'isPlayable': True,
                'isPauseable': False,
                'wasCancelled': cancelled,
                'composition': {
                    'name': self._piano_player.current_composition.name, 
                    'composerName': self._piano_player.current_composition.composer, 
                    'duration': self._piano_player.current_composition.duration,
                    'playTime': 0
                }
            })

        # release all keyboard keys if not done already
        await self._websocket_server.send_keyboard_message(
            mido.Message('note_on', note=0, velocity=0)
        )

    async def _on_midi_interfaces_changed(self, interfaces):
        '''Callback for MIDI interface changes.'''

        self._midi_out_ports_available = interfaces
        midi_out_port_config = None
        config = read_config()
        if 'Midi' in config and 'midi_out_port' in config['Midi']:
            midi_out_port_config = config['Midi']['midi_out_port']

        if interfaces:
            if midi_out_port_config and midi_out_port_config in interfaces:
                self._midi_out_ports_selected = midi_out_port_config
            else:
                self._midi_out_ports_selected = interfaces[-1]
        else:
            self._midi_out_ports_selected = None

        await self._websocket_server.send_info_message(
            {
                'messageType': 'info',
                'availableMidiOutPorts': self._midi_out_ports_available,
                'selectedMidiOutPort': self._midi_out_ports_selected
            })

        await self._piano_player.set_midi_out_port(self._midi_out_ports_selected)


if __name__ == '__main__':
    asyncio.run(PianoDaemon().run())
