import { Note, Measure, Part, Score, scoreToXml } from './types';
import { Midi } from '@tonejs/midi';

function midiNoteToPitch(midiNote: number) {
  const stepNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alterMap = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const step = stepNames[midiNote % 12];
  const alter = alterMap[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return { step, alter, octave };
}

export function midiToMusicXML(
  midi: Midi,
  compositionName?: string,
  composerName?: string
): string {
  // Extract copyright from header.meta
  let copyright: string | undefined = undefined;
  if (Array.isArray(midi.header.meta)) {
    const copyrightMeta = midi.header.meta.find(e => e.type === 'copyright' && typeof e.text === 'string');
    if (copyrightMeta) {
      copyright = copyrightMeta.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }

  // Extract tempo (first tempo event)
  let tempo: number | undefined = undefined;
  if (midi.header.tempos && midi.header.tempos.length > 0) {
    tempo = Math.round(midi.header.tempos[0].bpm);
  }

  // Collect all notes from all tracks
  const notes: Note[] = [];
  midi.tracks.forEach(track => {
    track.notes.forEach(note => {
      const { step, alter, octave } = midiNoteToPitch(note.midi);
      notes.push({
        step,
        alter,
        octave,
        duration: 1,
        type: 'quarter',
      });
    });
  });

  if (notes.length === 0) return '';

  // Split notes into groups of 4 (4/4 time, 4 quarter notes per measure)
  const measures: Measure[] = [];
  for (let i = 0; i < notes.length; i += 4) {
    const measureNotes = notes.slice(i, i + 4);
    measures.push({
      notes: measureNotes,
      attributes: i === 0 ? {
        divisions: 1,
        key: 4,
        time: { beats: 4, beatType: 4 },
        clef: { sign: 'G', line: 2 },
      } : undefined,
      direction: i === 0 && tempo ? { tempo, beatUnit: 'quarter' } : undefined,
      sound: i === 0 && tempo ? { tempo } : undefined,
    });
  }

  // One part with multiple measures
  const part: Part = {
    id: 'P1',
    measures,
  };

  // Assemble score
  const score: Score = {
    title: compositionName,
    composer: composerName,
    copyright,
    parts: [part],
  };

  // Render as MusicXML
  return scoreToXml(score);
}
