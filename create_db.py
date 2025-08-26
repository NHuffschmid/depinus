#!/usr/bin/env python

# This script creates the SQLite database from scratch
# Usage: sudo ./create_db.py [-f] 

import math
import mido
import os
import pathlib
import shutil
import sqlite3
import subprocess
import sys

from depinus.midi.calculate_duration import calculate_duration

DB_LOCATION = '/var/depinus.db'
DIR = os.path.dirname(sys.argv[0])
CWD = os.getcwd()
MIDI_TEMP_FILE = '/tmp/composition.mid'

if pathlib.Path(DB_LOCATION).is_file():
    print('Database already exists!')
    if ((len(sys.argv) > 1) and (sys.argv[1] == '-f')):
        print('Force removal of old database.')
        os.remove(DB_LOCATION)
    else:
        sys.exit(1)

os.chdir(DIR + '/midi_archive')

print('Creating SQLite database in %s...' % DB_LOCATION)

'''
   The readfile command requires a loadable extension in python
   Therefore we invoke SQLITE in a subprocess
'''
subprocess.run(['sqlite3', DB_LOCATION], stdin=open('../create_db.sql'))

print('Calculate duration of compositions...')

connection = sqlite3.connect(DB_LOCATION)
cursor = connection.cursor()
sql = """SELECT id, name, midifile FROM composition"""
cursor.execute(sql)
compositions = cursor.fetchall()
for composition in compositions:
    with open(MIDI_TEMP_FILE, 'wb') as midifile:
        midifile.write(composition[2])
    duration = calculate_duration(MIDI_TEMP_FILE)
    print('%s: %d seconds' % (composition[1], duration))
    sql='UPDATE composition SET duration = ? WHERE id = ?'
    cursor.execute(sql,(duration, composition[0]))
    
connection.commit()
cursor.close()

os.remove(MIDI_TEMP_FILE)

shutil.copy(DB_LOCATION, '..')

print('Database created.')

os.chdir(CWD) # restore current working directory
