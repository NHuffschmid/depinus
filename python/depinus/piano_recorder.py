# Piano recorder

import asyncio
import getpass
import mido
import socket
import time
from datetime import datetime

from depinus import logger

DYNAMICS_DEFAULT = 50

class PianoRecorder:
    '''Records MIDI messages from an input device'''

    def __init__(self):
        '''Constructor'''

        self._recording = False
        self._paused = False
        self._midi_input = None
        self._midi_in_port = None
        self._record_task = None
        self._recorded_messages = []
        self._start_time = None
        self._pause_start_time = None
        self._total_pause_duration = 0
        self._recording_callbacks = set()
        self._tempo = 1.0
        self._transposition = 0
        self._dynamics = DYNAMICS_DEFAULT

    @property
    def transposition(self):
        '''Gets the transposition.'''
        return self._transposition

    @transposition.setter
    def transposition(self, value):
        '''Sets the transposition.'''
        self._transposition = value

    @property
    def tempo(self):
        '''Gets the tempo.'''
        return self._tempo

    @tempo.setter
    def tempo(self, value):
        '''Sets the tempo.'''
        self._tempo = value

    @property
    def dynamics(self):
        '''Gets the dynamics.'''
        return self._dynamics

    @dynamics.setter
    def dynamics(self, value):
        '''Sets the dynamics.'''
        self._dynamics = value

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
            try:
                logger.debug('Closing previous MIDI input port...')
                self._midi_input.close()
                logger.debug('MIDI input port closed.')
            except Exception as e:
                logger.error(f'Failed to close MIDI input port: {e}')
            self._midi_input = None
        # store the port name (will be opened when recording starts)
        self._midi_in_port = value

    def register_for_recording_end(self, callback):
        '''Subscribe for notifications about recording termination

            Parameters:
            callback: Callback routine to be invoked with the recorded MIDI data
        '''
        self._recording_callbacks.add(callback)

    async def start_recording(self):
        '''Starts recording MIDI messages.'''
        if self._recording:
            logger.warning('Already recording')
            return

        if not self._midi_in_port:
            logger.error('No MIDI input port selected for recording')
            return

        logger.info('Start recording MIDI messages')
        self._recording = True
        self._paused = False
        self._recorded_messages = []
        self._start_time = time.time()
        self._pause_start_time = None
        self._total_pause_duration = 0

        # start async recording task
        self._record_task = asyncio.create_task(self._record_midi_input())

    def pause_recording(self):
        '''Pauses the recording.'''
        logger.info('Pause recording')
        self._paused = True
        self._pause_start_time = time.time()

    def resume_recording(self):
        '''Resumes the recording.'''
        logger.info('Resume recording')
        if self._pause_start_time is not None:
            self._total_pause_duration += time.time() - self._pause_start_time
            self._pause_start_time = None
        self._paused = False

    async def stop_recording(self):
        '''Stops recording and returns the recorded MIDI data.'''
        if not self._recording:
            logger.warning('Not recording - cannot stop')
            return None

        logger.info('Stop recording')
        self._recording = False
        self._paused = False

        # stop and wait for recording task to complete
        if self._record_task:
            self._record_task.cancel()
            try:
                await self._record_task
            except asyncio.CancelledError:
                pass # recording task was cancelled as expected
            self._record_task = None

        # close MIDI input port after recording
        if self._midi_input is not None:
            logger.debug('Closing MIDI input port after recording.')
            try:
                self._midi_input.close()
            except Exception as e:
                logger.error(f'Failed to close MIDI input port: {e}')
            self._midi_input = None

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

    async def _record_midi_input(self):
        '''Async task that continuously reads MIDI messages from the input port.'''
        try:
            # Open MIDI input port (without callback - we'll iterate over messages)
            logger.debug('Opening MIDI input port for recording: %s' % self._midi_in_port)
            self._midi_input = mido.open_input(self._midi_in_port)
            logger.debug('MIDI input port opened.')

            # Continuously read messages while recording
            while self._recording:
                # Use iter_pending() to get available messages without blocking
                for message in self._midi_input.iter_pending():
                    if self._recording and not self._paused:
                        # Calculate timestamp relative to recording start
                        current_time = time.time()
                        timestamp = current_time - self._start_time - self._total_pause_duration
                        
                        # Store message with timestamp
                        self._recorded_messages.append({
                            'message': message.copy(),
                            'timestamp': timestamp
                        })
                        logger.debug(f'Recorded MIDI message: {message}')

                # Small delay to prevent busy-waiting
                await asyncio.sleep(0.001)  # 1ms

        except asyncio.CancelledError:
            logger.debug('Recording task cancelled.')
            raise
        except (OSError, IOError) as e:
            logger.error(f"Error reading from MIDI input port '{self._midi_in_port}': {e}")
            self._recording = False
        except Exception as e:
            logger.exception(f"Unexpected error in recording task: {e}")
            self._recording = False

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
            text=f'(C) {current_year} Depinus Live Recording - {username}@{hostname} - {recording_datetime}'))

        # Add tempo (default 500000 microseconds per beat = 120 BPM)
        # TODO: Clarify if we really need this (and if PianoPlayer has to consider it)
        track.append(mido.MetaMessage('set_tempo', tempo=500000))

        # Convert recorded messages to MIDI track
        last_timestamp = 0
        for item in self._recorded_messages:
            message = item['message']
            timestamp = item['timestamp']
            delta_time = int((timestamp - last_timestamp) * 480 * 2 * self._tempo)  # 2 beats per second at 120 BPM
            last_timestamp = timestamp

            if message.type in ('note_on', 'note_off') and hasattr(message, 'note'):
                note = message.note - self._transposition

                if (self._dynamics == 0): # Avoid division by zero
                    if (message.velocity > 0):
                        velocity = 127
                    else:
                        velocity = 0
                else:
                    velocity = int(min(127, message.velocity * DYNAMICS_DEFAULT / self._dynamics))

                msg = message.copy(note=note, velocity=velocity, time=delta_time)
                track.append(msg)
            elif message.type in ('control_change', 'program_change'):
                track.append(message.copy(time=delta_time))

        # Add end of track marker
        track.append(mido.MetaMessage('end_of_track', time=0))

        # Convert to bytes
        from io import BytesIO
        buffer = BytesIO()
        mid.save(file=buffer)
        midi_data = buffer.getvalue()

        return midi_data
