# Piano player

import asyncio
import mido
import os
import time

from depinus import logger
from pathlib import Path

MIDI_FILE_PATH = str(Path.home() / 'composition.mid')
DYNAMICS_DEFAULT = 50


class PianoPlayer:
    '''The one who does all the work'''

    def __init__(self):
        '''Constructor'''

        self._play_task = None
        self._current_composition = None
        self._midi_output = None
        self._play_time = 0
        self._pausing = False
        self._transposition_pending = False
        self._positioning_pending = False
        self._midi_messages_callbacks = set()
        self._play_end_callbacks = set()

    @property
    def current_composition(self):
        '''Gets the current composition.'''
        return self._current_composition

    @property
    def play_time(self):
        '''Gets the number of seconds the current composition is already played.'''
        return self._play_time

    @property
    def is_stoppable(self):
        '''True if the piano player can receive a stop command.'''
        return self._play_task is not None and not self._play_task.done()

    @property
    def is_playable(self):
        '''True if the piano player can start playing.'''
        return self._pausing or (self._play_task is not None and self._play_task.done())

    @property
    def is_pauseable(self):
        '''True if the piano player can make a pause.'''
        return (not self._pausing) and (self._play_task is not None and not self._play_task.done())

    @property
    def transposition(self):
        '''Gets the transposition.'''
        return self._transposition

    @transposition.setter
    def transposition(self, value):
        '''Sets the transposition.'''
        self._transposition = value
        self._transposition_pending = True

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

    async def set_midi_out_port(self, value):
        '''Sets the MIDI out port.'''
        logger.info('Set MIDI out port: %s' % value)
        if (self._midi_output is not None):
            self._midi_output.close()
        if value:
            try:
                self._midi_output = mido.open_output(value)
            except (OSError, IOError) as e:
                logger.error(f"Failed to open MIDI output port '{value}': {e}")
                await self.stop()
                self._midi_output = None

    def register_for_midi_messages(self, callback):
        '''Subscribe for notifications about played midi messages

            Parameters:
            callback: Callback routine to be invoked
        '''
        self._midi_messages_callbacks.add(callback)

    def register_for_play_end(self, callback):
        '''Subscribe for notifications about play termination

            Parameters:
            callback: Callback routine to be invoked
        '''
        self._play_end_callbacks.add(callback)

    def play_midi_message(self, message):
        '''Plays a single midi message.

        Parameters:
            message: The midi message to play
        '''
        if (self._midi_output is None):
            # player is not playing => open a new midi output port
            with mido.open_output(self._midi_out_port) as midi_output:
                midi_output.send(message)
        else:
            # player is playing => add midi message to the current output port
            self._midi_output.send(message)

    async def play(self, composition=None):
        '''
        Starts playing a composition.

        Parameters:
            composition: The piece of music to play (or the current one if not provided)
        '''

        if ((composition == None) and self._pausing):
            self._pausing = False  # continue playing
            logger.info('Resume playing')
        else:
            if (self._play_task is not None) and (not self._play_task.done()):
                # stop playing the current composition
                await self.stop()

            if (composition is not None):
                self._current_composition = composition

            if (self._current_composition is None):
                raise ValueError('No composition available to play')

            logger.info('Playing composition from composer %s with title: %s' %
                          (self._current_composition.composer, self._current_composition.name))
            self._play_task = asyncio.create_task(
                self._play_mididata(self._current_composition.midi_data))

    async def goto_play_time(self, position):
        '''
        Sets a specific playtime.

        Parameters:
            position: The current position in the current composition
        '''

        if (self._current_composition == None):
            raise ValueError('No composition available for positioning')

        self._positioning_pending = True

        if (self._play_task != None) and (not self._play_task.done()):
            await self.stop()
        else:
            self.pause()

        self._play_task = asyncio.create_task(
            self._play_mididata(self._current_composition.midi_data, position))

        # wait until new position is found
        while (self._positioning_pending):
            await asyncio.sleep(0.5)

    async def stop(self):
        '''Stops playing.'''
        if (self._play_task):
            self._play_task.cancel()
            try:
                await self._play_task
            except asyncio.CancelledError:
                pass

    def pause(self):
        '''Pauses playing.'''
        self._pausing = True

    async def play_startup_jingle(self):
        '''Plays a startup jingle.'''

        logger.info('Playing startup jingle...')
        startup_jingle_path = Path(os.environ['DEPINUS_APP_PATH']) / 'startup_jingle.mid'

        with open(startup_jingle_path, 'rb') as jingle_file:
            midi_data = jingle_file.read()
        await self._play_mididata(midi_data)
            
    async def _play_mididata(self, midi_data, position=0):

        # create midifile from mididata
        with open(MIDI_FILE_PATH, 'wb') as midi_file:
            midi_file.write(midi_data)

        try:

            mido_file = mido.MidiFile(MIDI_FILE_PATH)

            if (position == 0):
                # log some meta information
                for i, track in enumerate(mido_file.tracks):
                    logger.debug("Track %d: %s" % (i, track.name))
                    for msg in track:
                        if (msg.is_meta):
                            if (msg.type == 'copyright'):
                                logger.info('Copyright: %s' % msg.text)
                            elif (msg.type == 'text'):
                                logger.debug(msg.text.strip())

            # play it

            self._play_time = 0
            last_tempo = self.tempo
            midi_time_base = 0  # MIDI time at the start of the current tempo period
            start_timestamp = time.perf_counter()
            real_time_base = start_timestamp  # base time for current tempo period

            for message in mido_file:

                if (message.time > 0):
                    if (self._play_time == 0):
                        # let's re-init at first received time value
                        # otherwise, we would eventually wait too long for the first note at the beginning
                        start_timestamp = time.perf_counter()
                        real_time_base = start_timestamp  # base time for current tempo period
                    self._play_time += message.time
                    if (not self._positioning_pending):
                        if self.tempo != last_tempo:
                            # tempo has changed => adjust time bases
                            current_time = time.perf_counter()
                            real_time_base = current_time
                            midi_time_base = self._play_time - message.time
                            last_tempo = self.tempo
                        
                        midi_time_since_base = self._play_time - midi_time_base
                        expected_time = real_time_base + (midi_time_since_base / self.tempo)
                        current_time = time.perf_counter()
                        
                        sleep_duration = max(0, expected_time - current_time)
                        await asyncio.sleep(sleep_duration)

                if (self._positioning_pending and (self._play_time > position)):
                    self._positioning_pending = False
                    real_time_base = time.perf_counter()
                    midi_time_base = self._play_time
                    last_tempo = self.tempo

                if (self._transposition_pending):
                    self._midi_output.reset()  # reset active keys
                    self._transposition_pending = False

                #logger.debug('Midifile message:  %s' % str(message))

                was_paused = self._pausing
                while ((self._pausing == True) and not self._positioning_pending):
                    await asyncio.sleep(0.5)
                
                # After resume from pause, reset time base
                if was_paused and not self._pausing and not self._positioning_pending:
                    real_time_base = time.perf_counter()
                    midi_time_base = self._play_time

                if (not self._positioning_pending):
                    # some message types (like program_change) seem to block the send command
                    # mido's play() function seem to filter them out, but is buggy in other terms:
                    # https://github.com/mido/mido/issues/458
                    if (message.type.startswith('note_o')):
                        if (self._transposition != 0):
                            message.note = message.note + self._transposition

                        if (message.velocity > 0):
                            # handle dynamics
                            if (self.dynamics > DYNAMICS_DEFAULT):
                                message.velocity = int(
                                    (message.velocity * (100 - self.dynamics) / DYNAMICS_DEFAULT + (self.dynamics - DYNAMICS_DEFAULT) * 2.54))
                            else:
                                message.velocity = int(
                                    message.velocity * self.dynamics / DYNAMICS_DEFAULT)

                        if (self._midi_output is not None):
                            self._midi_output.send(message)
                            for callback in self._midi_messages_callbacks:
                                await callback(message)
                    else:
                        if (message.type == 'control_change'):
                            if ((message.control == 64) or # sustain pedal
                                (message.control == 66) or # sostenuto pedal
                                (message.control == 67)):  # soft pedal
                                # pass pedal messages to the output
                                if (self._midi_output is not None):
                                    self._midi_output.send(message)
                                    for callback in self._midi_messages_callbacks:
                                        await callback(message)

            logger.info('End of midifile reached.')

            self._play_time = 0

            if (self._current_composition != None): # happens in case of startup jingle
                for callback in self._play_end_callbacks:
                    await callback(False)

        except asyncio.CancelledError:

            #logger.info('CancelledError received.')
            if (not self._positioning_pending):
                self._pausing = False
                self._play_time = 0

                for callback in self._play_end_callbacks:
                    await callback(True)

            self._midi_output.reset()
            raise

        except BaseException:
            logger.exception('BaseException received.')
            self._midi_output.reset()
            raise
