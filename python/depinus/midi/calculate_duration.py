#!/usr/bin/env python

# This script calculates the play duration of a midi file in seconds

import math
import mido
import sys

def calculate_duration(midifile):
    return math.ceil(mido.MidiFile(midifile).length)

if __name__ == "__main__":

    try:
        if (len(sys.argv) != 2):
            raise ValueError("Usage: %s midifile" % sys.argv[0])
        
        print(str(calculate_duration(sys.argv[1])))

    except Exception as exc:
        sys.exit(exc)
