#!/usr/bin/env python

# A piece of music


class Composition:
    '''Composition class'''
    
    def __init__(self, name, composer, duration, mididata):
        '''
        Constructor
        
        Parameters:
            name: Title
            composer: The one who wrote it
            duration: Total time in seconds
            mididata: Binary midi data
        '''
        self.Name = name
        self.Composer = composer
        self.Duration = duration
        self.Mididata = mididata
