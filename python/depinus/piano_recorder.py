# Piano recorder

import asyncio
import getpass
import mido
import socket
import threading
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
        self._record_thread = None
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

        # Ensure any previous task is properly cleaned up
        if self._record_task is not None and not self._record_task.done():
            logger.warning('Previous recording task still running - cancelling it first')
            self._record_task.cancel()
            try:
                await self._record_task
            except asyncio.CancelledError:
                pass
            self._record_task = None

        # Close any open MIDI input port from previous session
        if self._midi_input is not None:
            logger.debug('Closing leftover MIDI input port')
            try:
                self._midi_input.close()
            except Exception as e:
                logger.error(f'Failed to close leftover MIDI input: {e}')
            self._midi_input = None

        logger.info('Start recording MIDI messages')
        self._recording = True
        self._paused = False
        self._recorded_messages = []
        self._start_time = time.time()
        self._pause_start_time = None
        self._total_pause_duration = 0

        # Start async recording task
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
                pass
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

    def _record_thread_func(self):
        '''Thread function that blocks on MIDI receive for instant message capture.'''
        logger.info(f'=== RECORD THREAD STARTED for port: {self._midi_in_port} ===')
        logger.info(f'Recording flag state: {self._recording}')
        msg_count = 0
        
        try:
            while self._recording:
                try:
                    # Blocking receive - will throw exception when port closes
                    message = self._midi_input.receive(block=True)
                    
                    if self._recording and not self._paused:
                        # Calculate timestamp immediately upon message arrival
                        current_time = time.time()
                        timestamp = current_time - self._start_time - self._total_pause_duration
                        
                        # Store message with precise timestamp
                        self._recorded_messages.append({
                            'message': message.copy(),
                            'timestamp': timestamp
                        })
                        msg_count += 1
                        if msg_count <= 100 or msg_count % 10 == 0:
                            if hasattr(message, 'velocity'):
                                logger.info(f'Recorded msg #{msg_count}: {message.type} note={message.note} vel={message.velocity} at {timestamp:.3f}s')
                            else:
                                logger.info(f'Recorded msg #{msg_count}: {message.type} at {timestamp:.3f}s')
                except (OSError, IOError) as e:
                    # Port closed - normal shutdown
                    if self._recording:
                        logger.error(f"MIDI port error in thread: {e}")
                    break
        
        except Exception as e:
            logger.exception(f"Error in recording thread: {e}")
        finally:
            logger.info(f'=== RECORD THREAD ENDED. Total messages: {msg_count} ===')

    async def _record_midi_input(self):
        '''Async task that manages the recording thread.'''
        logger.info(f'=== RECORD TASK STARTED for port: {self._midi_in_port} ===')
        
        try:
            # Open MIDI input port for recording  
            logger.info(f'Opening MIDI input port: {self._midi_in_port}')
            self._midi_input = mido.open_input(self._midi_in_port)
            logger.info('MIDI input port successfully opened')

            # Port reset to fix boot-time initialization issues
            logger.info('Performing port reset (close/reopen)')
            self._midi_input.close()
            await asyncio.sleep(0.2)  # 200ms delay for driver cleanup
            self._midi_input = mido.open_input(self._midi_in_port)
            logger.info('Port successfully reset and reopened')
            
            # Stabilization delay after port open
            await asyncio.sleep(0.2)
            
            # Flush any pending messages
            flush_count = sum(1 for _ in self._midi_input.iter_pending())
            logger.info(f'Initial flush: {flush_count} messages discarded')
            
            # Reset start time to NOW for accurate timestamps
            self._start_time = time.time()
            self._total_pause_duration = 0
            logger.info(f'Recording initialized. Start time: {self._start_time}')

            # Start blocking receive thread for instant message capture
            self._record_thread = threading.Thread(target=self._record_thread_func, daemon=True)
            self._record_thread.start()
            logger.info('Recording thread started')
            
            # Wait for thread to finish or recording to stop
            while self._recording and self._record_thread.is_alive():
                await asyncio.sleep(0.1)
            
            # If still recording, wait a bit for thread to finish
            if self._record_thread.is_alive():
                await asyncio.to_thread(self._record_thread.join, timeout=2.0)

        except asyncio.CancelledError:
            logger.info('Recording task cancelled by user')
            raise
        except (OSError, IOError) as e:
            logger.error(f"MIDI I/O error during recording: {e}")
            self._recording = False
        except Exception as e:
            logger.exception(f"Unexpected error in recording task: {e}")
            self._recording = False
        finally:
            logger.info('=== RECORD TASK ENDED ===')

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
