#!/usr/bin/env python

# Piano player

import asyncio
import configparser
import mido
import os

from depinus import logger
from pathlib import Path

MIDI_FILE_PATH = str(Path.home() / 'composition.mid')
DYNAMICS_DEFAULT = 50


class PianoPlayer:
    '''The one who does all the work'''

    def __init__(self):
        '''Constructor'''

        super().__init__()

        # Load default settings from config file
        configFile = os.environ.get('DEPINUS_HOME', os.getcwd()) + '/depinus.conf'
        self._configFile = configFile
        self._config = configparser.ConfigParser()
        self._config.read(configFile)
        settings = self._config['Settings'] if 'Settings' in self._config else {}

        self.dynamics = int(settings.get('dynamics', 50))
        self.tempo = float(settings.get('tempo', 1.0))
        self._transposition = int(settings.get('transposition', 0))

        self._playtask = None
        self._currentComposition = None
        self._playTime = 0
        self._pausing = False
        self._transpositionPending = False
        self._positioningPending = False
        self._midi_messages_callbacks = set()
        self._play_end_callbacks = set()
        self._midiOutput = None
        outputNames = mido.get_output_names()
        self._midiOutPort = outputNames[len(outputNames) - 1] # use external USB midi device

    @property
    def currentComposition(self):
        '''Gets the current composition.'''
        return self._currentComposition
    
    @property
    def playTime(self):
        '''Gets the number of seconds the current composition is already played.'''
        return self._playTime
    
    @property
    def isStoppable(self):
        '''True if the piano player can receive a stop command.'''
        return not self._playtask.done()
    
    @property
    def isPlayable(self):
        '''True if the piano player can start playing.'''
        return self._pausing or self._playtask.done()
    
    @property
    def isPauseable(self):
        '''True if the piano player can make a pause.'''
        return (not self._pausing) and (not self._playtask.done())
    
    @property
    def transposition(self):
        '''Gets the transposition.'''
        return self._transposition

    @transposition.setter
    def transposition(self, value):
        '''Sets the transposition and persists to config.'''
        self._transposition = value
        self._transpositionPending = True
        self._persist_config('transposition', str(value))

    @property
    def tempo(self):
        '''Gets the tempo.'''
        return self._tempo

    @tempo.setter
    def tempo(self, value):
        '''Sets the tempo and persists to config.'''
        self._tempo = value
        self._persist_config('tempo', str(value))

    @property
    def dynamics(self):
        '''Gets the dynamics.'''
        return self._dynamics

    @dynamics.setter
    def dynamics(self, value):
        '''Sets the dynamics and persists to config.'''
        self._dynamics = value
        self._persist_config('dynamics', str(value))

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
        if (self._midiOutput is None or self._midiOutput.closed):
            # player is not playing => open a new midi output port
            with mido.open_output(self._midiOutPort) as midiOutput:
                midiOutput.send(message)
        else:
            # player is playing => add midi message to the current output port
            self._midiOutput.send(message)

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
            if (self._playtask != None) and (not self._playtask.done()):
                # stop playing the current composition
                await self.stop()

            if (composition != None):
                self._currentComposition = composition

            if (self._currentComposition == None):
                raise ValueError('No composition available to play')

            logger.info('Playing composition from composer %s with title: %s' %
                          (self._currentComposition.Composer, self._currentComposition.Name))
            self._playtask = asyncio.create_task(
                self._play_mididata(self._currentComposition.Mididata))

    async def gotoPlayTime(self, position):
        '''
        Sets a specific playtime.

        Parameters:
            position: The current position in the current composition
        '''

        if (self._currentComposition == None):
            raise ValueError('No composition available for positioning')

        self._positioningPending = True

        if (self._playtask != None) and (not self._playtask.done()):
            await self.stop()
        else:
            self.pause()

        self._playtask = asyncio.create_task(
            self._play_mididata(self._currentComposition.Mididata, position))

        # wait until new position is found
        while (self._positioningPending):
            await asyncio.sleep(0.5)

    async def stop(self):
        '''Stops playing.'''
        if (self._playtask):
            self._playtask.cancel()
            try:
                await self._playtask
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
            mididata = jingle_file.read()
        await self._play_mididata(mididata)
            
    async def _play_mididata(self, mididata, position=0):

        # create midifile from mididata
        with open(MIDI_FILE_PATH, 'wb') as midifile:
            midifile.write(mididata)

        self._midiOutput = mido.open_output(self._midiOutPort)

        try:

            midofile = mido.MidiFile(MIDI_FILE_PATH)

            if (position == 0):
                # log some meta information
                for i, track in enumerate(midofile.tracks):
                    logger.debug("Track %d: %s" % (i, track.name))
                    for msg in track:
                        if (msg.is_meta):
                            if (msg.type == 'copyright'):
                                logger.info('Copyright: %s' % msg.text)
                            elif (msg.type == 'text'):
                                logger.info(msg.text.strip())

            # play it

            self._playTime = 0

            for message in midofile:

                if (message.time > 0):
                    self._playTime += message.time
                    if (not self._positioningPending):
                        await asyncio.sleep(message.time / self.tempo)

                if (self._positioningPending and (self._playTime > position)):
                    self._positioningPending = False

                if (self._transpositionPending):
                    self._midiOutput.reset()  # reset active keys
                    self._transpositionPending = False

                logger.debug('Midifile message:  %s' % str(message))

                while ((self._pausing == True) and not self._positioningPending):
                    await asyncio.sleep(0.5)

                if (not self._positioningPending):
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

                        self._midiOutput.send(message)
                        for callback in self._midi_messages_callbacks:
                            await callback(message)

            logger.info('End of midifile reached.')

            self._playTime = 0

            if (self._currentComposition != None): # happens in case of startup jingle
                for callback in self._play_end_callbacks:
                    await callback()

        except asyncio.CancelledError:

            #logger.info('CancelledError received.')
            if (not self._positioningPending):
                self._pausing = False
                self._playTime = 0

                for callback in self._play_end_callbacks:
                    await callback()

            self._midiOutput.reset()
            raise

        except BaseException:
            logger.exception('BaseException received.')
            self._midiOutput.reset()
            raise
    
        finally:
            if (self._midiOutput is not None):
                self._midiOutput.close()
                self._midiOutput = None    


    def _persist_config(self, key, value):
        '''Persist a setting to depinus.conf.'''
        if 'Settings' not in self._config:
            self._config['Settings'] = {}
        self._config['Settings'][key] = value
        with open(self._configFile, 'w') as configfile:
            self._config.write(configfile)
