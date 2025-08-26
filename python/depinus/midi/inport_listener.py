#!/usr/bin/env python

# IN port listener
#
# This program listens for incoming notes from a keyboard or other midi device

import mido

from depinus.logger import Logger

if __name__ == '__main__':

    print("Program started.")
    log = Logger('InPortListener')
    log.info('Starting endless loop to receive midi events...')

    inport=mido.open_input()
    outport=mido.open_output("Depinus")

    while (True):

        message = inport.receive()
        print("Message received: Note: %3d; Velocity: %5d" % (message.note, message.velocity))
        log.debug(str(message))
        outport.send(message)
