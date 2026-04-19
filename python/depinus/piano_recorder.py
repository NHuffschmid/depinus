# Piano recorder

import asyncio
import base64
import getpass
import mido
import platform
import socket
import time
from datetime import datetime

from depinus import logger

DYNAMICS_DEFAULT = 50


class PianoRecorder:
    '''Records MIDI messages from an input device'''

    def __init__(self, usb_reset_daemon_port=1732):
        '''Constructor
        
        Parameters:
            usb_reset_daemon_port: Port for USB reset daemon communication (default: 1732)
        '''

        self._recording = False
        self._paused = False
        self._midi_input = None
        self._midi_in_port = None
        self._monitor_task = None
        self._recorded_messages = []
        self._start_time = None
        self._pause_start_time = None
        self._total_pause_duration = 0
        self._recording_callbacks = set()
        self._waiting_callbacks = set()
        self._midi_message_callbacks = set()
        self._live_midi_callbacks = set()
        self._tempo = 1.0
        self._transposition = 0
        self._dynamics = DYNAMICS_DEFAULT
        self._usb_reset_daemon_port = usb_reset_daemon_port

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
        logger.info('Set MIDI input port: %s' % value)
        # Cancel monitor task before closing port
        if self._monitor_task is not None and not self._monitor_task.done():
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None
        # Close previous port
        if self._midi_input is not None:
            try:
                logger.debug('Closing previous MIDI input port...')
                self._midi_input.close()
                logger.debug('MIDI input port closed.')
            except Exception as e:
                logger.error(f'Failed to close MIDI input port: {e}')
            self._midi_input = None
        self._midi_in_port = value
        # Open port immediately and start monitor task for continuous keyboard input
        if value:
            try:
                logger.debug('Opening MIDI input port: %s' % value)
                self._midi_input = mido.open_input(value)
                logger.debug('MIDI input port opened.')
                self._monitor_task = asyncio.create_task(self._monitor_midi_input())
            except (OSError, IOError) as e:
                logger.error(f"Failed to open MIDI input port '{value}': {e}")
                self._midi_input = None

    def register_for_recording_end(self, callback):
        '''Subscribe for notifications about recording termination

            Parameters:
            callback: Callback routine to be invoked with the recorded MIDI data
        '''
        self._recording_callbacks.add(callback)

    def register_for_waiting_state(self, callback):
        '''Subscribe for notifications about waiting state changes

            Parameters:
            callback: Async callback routine to be invoked with is_waiting (bool)
        '''
        self._waiting_callbacks.add(callback)

    def register_for_midi_messages(self, callback):
        '''Subscribe for notifications about MIDI messages during recording

            Parameters:
            callback: Async callback routine to be invoked with each MIDI message
        '''
        self._midi_message_callbacks.add(callback)

    def register_for_live_midi_messages(self, callback):
        '''Subscribe for all MIDI input messages (note_on/note_off) regardless of recording state.
        Used for keyboard visualization.

            Parameters:
            callback: Async callback routine to be invoked with each mido.Message
        '''
        self._live_midi_callbacks.add(callback)

    def _trigger_usb_reset(self):
        '''Triggers the USB MIDI reset daemon (Linux only, silently ignored on Windows).'''
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1.0)
            sock.connect(('127.0.0.1', self._usb_reset_daemon_port))
            sock.sendall(b'RESET\n')
            sock.shutdown(socket.SHUT_WR)  # Signal end of send, allow server to read
            sock.close()
            logger.info('USB MIDI reset triggered successfully')
        except (ConnectionRefusedError, TimeoutError, OSError):
            # Daemon not running (Windows or disabled on Linux) - this is OK
            logger.debug('USB reset daemon not available (expected on Windows or when disabled)')
        except Exception as e:
            logger.error(f'Error triggering USB reset: {e}')

    async def _wait_for_usb_reset_complete(self, saved_port_name):
        '''Waits for USB reset to complete by monitoring port disappearance and reappearance.
        
        Parameters:
            saved_port_name: The MIDI port name before reset
            
        Returns:
            True if reset completed successfully or no reset needed, False on error
        '''
        # Skip USB reset on Windows - not needed there
        if platform.system() == 'Windows':
            logger.debug('Windows detected - skipping USB reset (not required)')
            return True
        
        # Notify about waiting state
        for callback in self._waiting_callbacks:
            await callback(True)
        
        # Trigger USB reset before recording to ensure clean ALSA state
        self._trigger_usb_reset()

        # Wait for USB device to disappear and come back after reset (on Linux)
        # Phase 1: Wait for device to disappear (MidiInterfaceObserver sets port to None)
        logger.info(f'Waiting for USB MIDI device "{saved_port_name}" to disappear after reset...')
        max_wait_disappear = 2  # Maximum 2 seconds to disappear
        wait_increment = 0.1
        waited = 0
        while waited < max_wait_disappear:
            await asyncio.sleep(wait_increment)
            waited += wait_increment
            if self._midi_in_port is None:
                logger.info(f'USB MIDI device disappeared after {waited:.1f}s')
                break
        else:
            # Device didn't disappear - probably no daemon running (Windows)
            # or device enumeration was very fast
            logger.debug(f'USB MIDI device did not disappear (no reset or very fast re-enumeration)')
            # Small delay to ensure any pending reset is complete
            await asyncio.sleep(0.2)
            if self._midi_in_port == saved_port_name:
                logger.info('Port still available, proceeding with recording')
                return True
            else:
                logger.error('MIDI input port changed unexpectedly')
                return False
        
        # Phase 2: Wait for device to come back (only if it disappeared)
        if self._midi_in_port is None:
            logger.info(f'Waiting for USB MIDI device to re-enumerate...')
            max_wait_reappear = 8  # Maximum 8 seconds to reappear
            waited = 0
            while waited < max_wait_reappear:
                await asyncio.sleep(wait_increment)
                waited += wait_increment
                if self._midi_in_port == saved_port_name:
                    logger.info(f'USB MIDI device re-enumerated and port restored after {waited:.1f}s')
                    return True
            
            # Device did not come back in time
            logger.error(f'MIDI input port "{saved_port_name}" did not re-enumerate after {max_wait_reappear}s')
            return False
        
        # Device didn't disappear, no reset needed
        return True

    async def start_recording(self):
        '''Starts recording MIDI messages.'''
        if self._recording:
            logger.warning('Already recording')
            return

        if not self._midi_in_port:
            logger.error('No MIDI input port selected for recording')
            return

        # Save the port name before USB reset (it will be cleared during reset)
        saved_port_name = self._midi_in_port

        # Wait for USB reset to complete
        if not await self._wait_for_usb_reset_complete(saved_port_name):
            # Notify about waiting state ending
            for callback in self._waiting_callbacks:
                await callback(False)
            return

        # Notify about waiting state ending
        for callback in self._waiting_callbacks:
            await callback(False)

        logger.info('Start recording MIDI messages')
        self._recording = True
        self._paused = False
        self._recorded_messages = []
        self._start_time = time.time()
        self._pause_start_time = None
        self._total_pause_duration = 0
        # Monitor task is already running (started in set_midi_in_port)

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
        # Monitor task keeps running for continued keyboard visualization

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

    async def _monitor_midi_input(self):
        '''Persistent async task that continuously reads MIDI messages from the input port.
        Fires live callbacks for keyboard visualization at all times.
        Additionally records messages when recording is active.
        '''
        try:
            while True:
                if self._midi_input is not None:
                    for message in self._midi_input.iter_pending():
                        # Always notify live listeners (keyboard visualization)
                        if message.type in ('note_on', 'note_off'):
                            for callback in self._live_midi_callbacks:
                                await callback(message)

                        # Record message if recording is active and not paused
                        if self._recording and not self._paused:
                            if message.type in ('note_on', 'note_off', 'control_change'):
                                current_time = time.time()
                                timestamp = current_time - self._start_time - self._total_pause_duration
                                self._recorded_messages.append({
                                    'message': message.copy(),
                                    'timestamp': timestamp
                                })
                                logger.debug(f'Recorded MIDI message: {message}')

                                # Notify recording callbacks (raw bytes as base64)
                                raw_bytes = message.bytes() if hasattr(message, 'bytes') else message.bin()
                                base64_bytes = base64.b64encode(bytes(raw_bytes)).decode('ascii')
                                for callback in self._midi_message_callbacks:
                                    await callback(base64_bytes)

                # Small delay to prevent busy-waiting
                await asyncio.sleep(0.001)  # 1ms

        except asyncio.CancelledError:
            logger.debug('Monitor task cancelled.')
            raise
        except (OSError, IOError) as e:
            logger.error(f"Error reading from MIDI input port '{self._midi_in_port}': {e}")
            self._recording = False
        except Exception as e:
            logger.exception(f"Unexpected error in monitor task: {e}")
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
