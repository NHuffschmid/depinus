# Piano recorder

import getpass
import mido
import socket
import time
from datetime import datetime

from depinus import logger


class PianoRecorder:
    '''Records MIDI messages from an input device'''

    def __init__(self):
        '''Constructor'''

        self._recording = False
        self._paused = False
        self._midi_input = None
        self._recorded_messages = []
        self._start_time = None
        self._pause_start_time = None
        self._total_pause_duration = 0
        self._recording_callbacks = set()

    @property
    def is_recording(self):
        '''True if currently recording.'''
        return self._recording

    @property
    def is_paused(self):
        '''True if recording is paused.'''
        return self._paused

    async def set_midi_in_port(self, value):
        '''Sets the MIDI input port.'''
        logger.info('Set MIDI input port for recording: %s' % value)
        if self._midi_input is not None:
            self._midi_input.close()
        if value:
            try:
                self._midi_input = mido.open_input(value, callback=self._on_midi_input_message)
            except (OSError, IOError) as e:
                logger.error(f"Failed to open MIDI input port '{value}': {e}")
                self._midi_input = None

    def register_for_recording_end(self, callback):
        '''Subscribe for notifications about recording termination

            Parameters:
            callback: Callback routine to be invoked with the recorded MIDI data
        '''
        self._recording_callbacks.add(callback)

    def start_recording(self):
        '''Starts recording MIDI messages.'''
        if self._recording:
            logger.warning('Already recording')
            return

        logger.info('Start recording MIDI messages')
        self._recording = True
        self._paused = False
        self._recorded_messages = []
        self._start_time = time.time()
        self._pause_start_time = None
        self._total_pause_duration = 0

    def pause_recording(self):
        '''Pauses the recording.'''
        if not self._recording:
            logger.warning('Not recording - cannot pause')
            return

        if self._paused:
            logger.info('Resume recording')
            if self._pause_start_time is not None:
                self._total_pause_duration += time.time() - self._pause_start_time
                self._pause_start_time = None
            self._paused = False
        else:
            logger.info('Pause recording')
            self._paused = True
            self._pause_start_time = time.time()

    async def stop_recording(self):
        '''Stops recording and returns the recorded MIDI data.'''
        if not self._recording:
            logger.warning('Not recording - cannot stop')
            return None

        logger.info('Stop recording')
        self._recording = False
        self._paused = False

        # Create MIDI file from recorded messages
        midi_data = self._create_midi_file()

        # Notify callbacks
        for callback in self._recording_callbacks:
            await callback(midi_data)

        # Reset state
        self._recorded_messages = []
        self._start_time = None
        self._pause_start_time = None
        self._total_pause_duration = 0

        return midi_data

    def _on_midi_input_message(self, message):
        '''Callback for incoming MIDI messages.'''
        if self._recording and not self._paused:
            # Calculate timestamp relative to recording start
            current_time = time.time()
            timestamp = current_time - self._start_time - self._total_pause_duration
            
            # Store message with timestamp
            self._recorded_messages.append({
                'message': message.copy(),
                'timestamp': timestamp
            })

    def _create_midi_file(self):
        '''Creates a MIDI file from the recorded messages.'''
        if not self._recorded_messages:
            logger.info('No MIDI messages recorded')
            return None

        # Create a new MIDI file
        mid = mido.MidiFile()
        track = mido.MidiTrack()
        track.name = 'Depinus track'
        mid.tracks.append(track)

        # Add copyright message
        current_year = datetime.now().year
        username = getpass.getuser()
        hostname = socket.gethostname()
        recording_datetime = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        track.append(mido.MetaMessage('copyright',
            text=f'© {current_year} Depinus Live Recording - {username}@{hostname} - {recording_datetime}'))

        # Add tempo (default 500000 microseconds per beat = 120 BPM)
        # TODO: Clarify if we really need this (and if PianoPlayer has to consider it)
        track.append(mido.MetaMessage('set_tempo', tempo=500000))

        # Convert recorded messages to MIDI track
        last_timestamp = 0
        for item in self._recorded_messages:
            message = item['message']
            timestamp = item['timestamp']
            
            # Calculate delta time in ticks (assuming 480 ticks per beat)
            delta_time = int((timestamp - last_timestamp) * 480 * 2)  # 2 beats per second at 120 BPM
            last_timestamp = timestamp

            # Create message with delta time
            if message.type in ('note_on', 'note_off', 'control_change', 'program_change'):
                track.append(message.copy(time=delta_time))

        # Add end of track marker
        track.append(mido.MetaMessage('end_of_track', time=0))

        # Convert to bytes
        from io import BytesIO
        buffer = BytesIO()
        mid.save(file=buffer)
        midi_data = buffer.getvalue()

        return midi_data
