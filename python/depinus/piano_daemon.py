#!/usr/bin/env python

# Piano daemon - Depinus main loop

import asyncio
import mido
import io
import requests

from depinus import logger
from depinus.websocket_server import WebsocketServer
from depinus.composition import Composition
from depinus.piano_player import PianoPlayer
from depinus.piano_recorder import PianoRecorder
from depinus.midi_interface_observer import MidiInterfaceObserver
from depinus.config_utils import read_config, persist_config_setting
from datetime import datetime

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

        network = config['Network'] if 'Network' in config else {}
        port = int(network.get('piano_daemon_websocket_port', 8765))
        self._websocket_server = WebsocketServer(port)

        usb_reset_daemon_port = int(network.get('usb_reset_daemon_port', 1732))

        self._piano_player = PianoPlayer()
        self._piano_player.dynamics = int(settings.get('dynamics', 50))
        self._piano_player.tempo = float(settings.get('tempo', 1.0))
        self._piano_player.transposition = int(settings.get('transposition', 0))

        self._piano_recorder = PianoRecorder(usb_reset_daemon_port)
        self._piano_recorder.dynamics = int(settings.get('dynamics', 50))
        self._piano_recorder.tempo = float(settings.get('tempo', 1.0))
        self._piano_recorder.transposition = int(settings.get('transposition', 0))

        self._midi_interface_observer = MidiInterfaceObserver()
        self._midi_interface_observer.register(self._on_midi_interfaces_changed)
        self._midi_out_ports_available = []
        self._midi_out_ports_selected = None
        self._midi_in_ports_available = []
        self._midi_in_ports_selected = None

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
            self._websocket_server.register_for_rpc("GetCurrentMidiData", self._on_get_current_midi_data)

            self._piano_player.register_for_midi_messages(self._on_midi_message)
            self._piano_player.register_for_play_end(self._on_play_end)

            self._piano_recorder.register_for_recording_end(self._on_recording_end)
            self._piano_recorder.register_for_waiting_state(self._on_recording_waiting_state)
            self._piano_recorder.register_for_midi_messages(self._on_recording_midi_message)

            logger.info('Entering main loop...')
            self._mainloop = asyncio.Future()
            await self._mainloop

            logger.info('🎹🎹🎹 Piano daemon ended. 🎹🎹🎹')

        except Exception:
            logger.exception("Piano daemon aborted unexpectedly.")


    async def _on_control_command(self, cmd):
        if (cmd.command == 'play'):
            logger.info('play command received.')
            if self._piano_recorder.is_recording and self._piano_recorder.is_paused:
                self._piano_recorder.resume_recording()
                await self._websocket_server.send_info_message(
                    {
                        'messageType': 'info',
                        'isStoppable': True, 
                        'isPlayable': False, 
                        'isPauseable': True, 
                        'isRecordable': False, 
                        'isRecording': True 
                    }
                )
            else:
                await self._piano_player.play()
                await self._websocket_server.send_info_message(
                    { 
                        'messageType': 'info', 
                        'isStoppable' : True, 
                        'isPlayable' : False, 
                        'isPauseable' : True, 
                        'isRecordable': False, 
                        'isRecording': False 
                    }
                )
        elif (cmd.command == 'pause'):
            logger.info('pause command received.')
            if self._piano_recorder.is_recording:
                # Pause recording
                self._piano_recorder.pause_recording()
                await self._websocket_server.send_info_message(
                    { 
                        'messageType': 'info', 
                        'isStoppable' : True, 
                        'isPlayable' : True, 
                        'isPauseable' : not self._piano_recorder.is_paused, 
                        'isRecordable': False, 
                        'isRecording': True 
                    }
                )
            else:
                # Pause playback
                self._piano_player.pause()
                await self._websocket_server.send_info_message(
                    { 
                        'messageType': 'info', 
                        'isStoppable' : True, 
                        'isPlayable' : True, 
                        'isPauseable' : False, 
                        'isRecordable': False, 
                        'isRecording': False 
                    }
                )
        elif (cmd.command == 'stop'):
            logger.info('stop command received.')
            if self._piano_recorder.is_recording:
                # Stop recording and save
                await self._piano_recorder.stop_recording()
                await self._websocket_server.send_info_message(
                    { 
                        'messageType': 'info', 
                        'isStoppable' : False, 
                        'isPlayable' : (self._piano_player.current_composition is not None), 
                        'isPauseable' : False, 
                        'isRecordable': bool(self._midi_in_ports_available),
                        'isRecording': False 
                    }
                )
            else:
                # Stop playback
                await self._piano_player.stop()
                await self._websocket_server.send_info_message(
                    { 
                        'messageType': 'info', 
                        'isStoppable' : False, 
                        'isPlayable' : True, 
                        'isPauseable' : False, 
                        'isRecordable': bool(self._midi_in_ports_available),
                        'isRecording': False 
                    }
                )
                self._playlist = None
        elif (cmd.command == 'tempo'):
            logger.info('tempo command received: ' + str(cmd.value))
            self._piano_player.tempo = cmd.value
            self._piano_recorder.tempo = cmd.value
            persist_config_setting('Settings', 'tempo', str(cmd.value))
            await self._websocket_server.send_info_message(
                { 
                    'messageType': 'info', 
                    'tempo' : cmd.value 
                }
            )
        elif (cmd.command == 'dynamics'):
            logger.info('dynamics command received: ' + str(cmd.value))
            self._piano_player.dynamics = cmd.value
            self._piano_recorder.dynamics = cmd.value
            persist_config_setting('Settings', 'dynamics', str(cmd.value))
            await self._websocket_server.send_info_message(
                { 
                    'messageType': 'info', 
                    'dynamics' : cmd.value 
                }
            )
        elif (cmd.command == 'transposition'):
            logger.info('transposition command received: ' + str(cmd.value))
            self._piano_player.transposition = cmd.value
            self._piano_recorder.transposition = cmd.value
            persist_config_setting('Settings', 'transposition', str(cmd.value))
            await self._websocket_server.send_info_message(
                { 
                    'messageType': 'info', 
                    'transposition' : cmd.value 
                }
            )
            # release all keyboard keys
            await self._websocket_server.send_keyboard_message(
                mido.Message('note_on', note=0, velocity=0)
            )
        elif (cmd.command == 'selectedMidiOutPort'):
            logger.info('selectedMidiOutPort command received: ' + cmd.value)
            self._midi_out_ports_selected = cmd.value
            await self._piano_player.set_midi_out_port(cmd.value)
            persist_config_setting('Midi', 'midi_out_port', cmd.value)
            await self._websocket_server.send_info_message(
                { 
                    'messageType': 'info', 
                    'selectedMidiOutPort' : cmd.value 
                }
            )
        elif (cmd.command == 'selectedMidiInPort'):
            logger.info('selectedMidiInPort command received: ' + cmd.value)
            self._midi_in_ports_selected = cmd.value
            await self._piano_recorder.set_midi_in_port(cmd.value)
            persist_config_setting('Midi', 'midi_in_port', cmd.value)
            await self._websocket_server.send_info_message(
                { 
                    'messageType': 'info', 
                    'selectedMidiInPort' : cmd.value 
                }
            )
        elif (cmd.command == 'record'):
            logger.info('record command received.')
            await self._piano_recorder.start_recording()
            await self._websocket_server.send_info_message(
                {
                    'messageType': 'info',
                    'isStoppable' : True,
                    'isPlayable' : False, 
                    'isPauseable' : True,
                    'isRecordable': False,
                    'isRecording': True,
                    'composition': {
                        'name': 'Live Recording', 
                        'composerName': 'Depinus', 
                        'duration': 0,
                        'playTime': 0
                    }
                }
            )
        elif (cmd.command == 'gotoPlayTime'):
            logger.info('gotoPlayTime (%s sec) command received.' % str(cmd.value))

            if (not self._piano_player.is_stoppable):
                logger.warning('Cannot goto play time while player is not active')
                return

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
                    'isPauseable': False,
                    'isWaiting': True
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
                    'isWaiting': False,
                    'composition': {
                        'name': self._piano_player.current_composition.name, 
                        'composerName': self._piano_player.current_composition.composer, 
                        'duration': self._piano_player.current_composition.duration,
                        'playTime': cmd.value
                    }
                })
        elif (cmd.command == 'playlist'):
            logger.debug('Playlist command received: ' + str(cmd.value))
            if (cmd.value.get('id') == 0):
                # new client wants to receive the current playlist info (if any)
                if (self._playlist != None):
                    info_msg = { 
                        'messageType': 'info', 
                        'playlist': self._playlist 
                    }
                    logger.info('Sending playlist info to client: ' + str(info_msg))
                    await self._websocket_server.send_info_message(info_msg)
            else:
                # a client is updating the playlist info
                # store and mirrow it to all clients
                if (self._playlist is None):
                    self._playlist = { }
                if ('id' in cmd.value):
                    self._playlist['id'] = cmd.value['id']
                if ('shuffle' in cmd.value):
                    self._playlist['shuffle'] = cmd.value['shuffle']
                if ('repeatMode' in cmd.value):
                    self._playlist['repeatMode'] = cmd.value['repeatMode']
                if ('forwardable' in cmd.value):
                    self._playlist['forwardable'] = cmd.value['forwardable']
                if ('backwardable' in cmd.value):
                    self._playlist['backwardable'] = cmd.value['backwardable']
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
        
        info['isRecordable'] = bool(self._midi_in_ports_available) and \
                                not self._piano_player.is_stoppable and \
                                not self._piano_recorder.is_recording
        
        info['availableMidiOutPorts'] = self._midi_out_ports_available
        info['selectedMidiOutPort'] = self._midi_out_ports_selected
        info['availableMidiInPorts'] = self._midi_in_ports_available
        info['selectedMidiInPort'] = self._midi_in_ports_selected

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
            'isRecordable': False,
            'composition': {
                'name': self._piano_player.current_composition.name,
                'compositionId': compositionId,
                'composerName': self._piano_player.current_composition.composer,
                'duration': self._piano_player.current_composition.duration,
                'playTime': self._piano_player.play_time
            }
        }
        await self._websocket_server.send_info_message(info_msg)
        if (self._playlist is not None):
            self._playlist['compositionId'] = compositionId


    def _extract_midi_events_from_composition(self, composition):
        """Extract all MIDI events from composition for score rendering."""
        midi_file = mido.MidiFile(file=io.BytesIO(composition.midi_data))
        events = []
        for msg in midi_file:
            events.append(msg.dict())
        return events


    async def _on_calculate_play_duration(self, mididata):
        midi_stream = io.BytesIO(bytes(mididata))
        duration = int(mido.MidiFile(file=midi_stream).length)
        logger.info('Calculated play duration: %s sec' % str(duration))
        return duration


    async def _on_get_current_midi_data(self):
        """RPC to get MIDI data of currently playing composition."""
        if self._piano_player.current_composition is None:
            return None
        
        midi_events = self._extract_midi_events_from_composition(self._piano_player.current_composition)
        return {
            'midiEvents': midi_events,
            'compositionName': self._piano_player.current_composition.name
        }


    async def _on_midi_message(self, mido_message):
        #logger.info('Piano player has transmitted a midi message: ' + str(mido_message))
        await self._websocket_server.send_keyboard_message(mido_message)


    async def _on_recording_waiting_state(self, is_waiting):
        '''Callback when recording preparation state changes.'''
        await self._websocket_server.send_info_message({
            'messageType': 'info',
            'isWaiting': is_waiting
        })

    async def _on_recording_midi_message(self, mido_message):
        '''Callback for MIDI messages during recording - send to ScoreView.'''
        await self._websocket_server.send_info_message({
            'messageType': 'info',
            'midiEvent': mido_message.dict()
        })

    async def _on_recording_end(self, midi_data):
        '''Callback when recording ends - save the recording to database via REST API.'''
        if midi_data is None:
            # Nothing was recorded
            await self._websocket_server.send_info_message({
                'messageType': 'info',
                'isStoppable': False,
                'isPlayable': False,
                'isPauseable': False,
                'isRecordable': bool(self._midi_in_ports_available),
                'isRecording': False,
                'composition': {
                    'name': '',
                    'composerName': '',
                    'duration': 0,
                    'playTime': 0
                }
            })
            return
        
        logger.info('Recording ended.')
        
        # Generate composition and composer name
        composer_name = 'Depinus'
        composition_name = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        try:
            # Get backend URL from config
            config = read_config()
            backend_port = config['Network']['backend_rest_api_port']
            backend_url = f'http://localhost:{backend_port}'
            
            # Check if "Depinus" composer exists, otherwise create it
            def get_composers():
                response = requests.get(f'{backend_url}/archive/composers', timeout=5)
                return response.json()
            
            composers = await asyncio.to_thread(get_composers)
            depinus_composer = next((c for c in composers if c['surname'] == composer_name), None)
            
            if depinus_composer:
                composer_id = depinus_composer['id']
            else:
                def create_composer():
                    files = {
                        'surname': (None, composer_name),
                        'firstname': (None, '')
                    }
                    response = requests.post(f'{backend_url}/archive/composer', files=files, timeout=5)
                    return response
                
                response = await asyncio.to_thread(create_composer)
                if response.status_code == 200:
                    composer_response = response.json()
                    composer_id = composer_response['id']
                else:
                    logger.error(f'Failed to create composer: {response.status_code}')
                    return
            
            def upload_composition():
                files = {
                    'midifile': (f'recording_{composition_name}.mid', io.BytesIO(midi_data), 'audio/midi'),
                    'name': (None, composition_name),
                    'composerId': (None, str(composer_id))
                }
                
                response = requests.post(
                    f'{backend_url}/archive/composition',
                    files=files,
                    timeout=15
                )
                return response
            
            try:
                # Run blocking requests call in thread pool
                response = await asyncio.to_thread(upload_composition)
                
                if response.status_code == 200:
                    logger.info(f'Recording saved: {composer_name}: {composition_name}')
                    
                    # Calculate duration from MIDI data
                    midi_stream = io.BytesIO(midi_data)
                    duration = int(mido.MidiFile(file=midi_stream).length)
                    
                    # Create Composition object and set it as current composition
                    # (without playing it, so user can press play if they want)
                    composition = Composition(composition_name, composer_name, duration, midi_data)
                    self._piano_player.current_composition = composition
                    
                    # Notify all clients about the new composition
                    await self._websocket_server.send_info_message({
                        'messageType': 'info',
                        'isStoppable': False,
                        'isPlayable': True,
                        'isPauseable': False,
                        'isRecordable': True,
                        'isRecording': False,
                        'composition': {
                            'name': composition.name,
                            'composerName': composition.composer,
                            'duration': composition.duration,
                            'playTime': 0
                        },
                        'recordingSaved': True  # Signal to trigger archive refresh
                    })
                else:
                    logger.warning(f'Upload returned status {response.status_code}')
                    
            except Exception as e:
                logger.error(f'Upload error: {e}')
            
        except Exception as e:
            logger.error(f'Failed to save recording: {e}')


    async def _on_play_end(self, cancelled):
        logger.info('Piano player has stopped playing.')
        await self._websocket_server.send_info_message(
            {
                'messageType': 'info',
                'isStoppable': False,
                'isPlayable': True,
                'isPauseable': False,
                'isRecordable': bool(self._midi_in_ports_available),
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

    async def _on_midi_interfaces_changed(self, midi_ports):
        '''Callback for MIDI interface changes.'''

        outputs = midi_ports.get('outputs', [])
        inputs = midi_ports.get('inputs', [])
        self._midi_out_ports_available = outputs
        self._midi_in_ports_available = inputs

        midi_out_port_config = None
        config = read_config()
        if 'Midi' in config and 'midi_out_port' in config['Midi']:
            midi_out_port_config = config['Midi']['midi_out_port']
        if outputs:
            if midi_out_port_config and midi_out_port_config in outputs:
                self._midi_out_ports_selected = midi_out_port_config
            else:
                self._midi_out_ports_selected = outputs[-1]
        else:
            self._midi_out_ports_selected = None

        midi_in_port_config = None
        if 'Midi' in config and 'midi_in_port' in config['Midi']:
            midi_in_port_config = config['Midi']['midi_in_port']
        if inputs:
            if midi_in_port_config and midi_in_port_config in inputs:
                self._midi_in_ports_selected = midi_in_port_config
            else:
                self._midi_in_ports_selected = inputs[-1]
        else:
            self._midi_in_ports_selected = None

        await self._websocket_server.send_info_message(
            {
                'messageType': 'info',
                'availableMidiOutPorts': self._midi_out_ports_available,
                'selectedMidiOutPort': self._midi_out_ports_selected,
                'availableMidiInPorts': self._midi_in_ports_available,
                'selectedMidiInPort': self._midi_in_ports_selected,
                'isRecordable': bool(self._midi_in_ports_available)
            })

        await self._piano_player.set_midi_out_port(self._midi_out_ports_selected)
        await self._piano_recorder.set_midi_in_port(self._midi_in_ports_selected)


if __name__ == '__main__':
    asyncio.run(PianoDaemon().run())
