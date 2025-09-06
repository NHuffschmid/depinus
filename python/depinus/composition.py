# A piece of music

class Composition:
    '''Composition class'''
    
    def __init__(self, name, composer, duration, midi_data):
        '''
        Constructor
        
        Parameters:
            name: Title
            composer: The one who wrote it
            duration: Total time in seconds
            midi_data: Binary midi data
        '''
        self.name = name
        self.composer = composer
        self.duration = duration
        self.midi_data = midi_data
