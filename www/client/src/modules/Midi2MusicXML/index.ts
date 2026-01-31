import { Note, Measure, Part, Score } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeTempo } from './analysis/analyzeTempo';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { scoreToXml } from './render/scoreToXml';
import { midiNoteToPitch } from './utils/midiNoteToPitch';

export function midi2MusicXML(
  midi: Midi,
  title?: string,
  composer?: string
): string {
  
  const scoreTitle = title ?? analyzeTitle(midi);
  const scoreComposer = composer ?? analyzeComposer(midi);
  const copyright = analyzeCopyright(midi);
  const tempo = analyzeTempo(midi);

  // TODO: analyzeNotes, analyzeKey, analyzeTime, analyzeRests ...
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
    title: scoreTitle,
    composer: scoreComposer,
    copyright,
    parts: [part],
  };

  // Render as MusicXML
  return scoreToXml(score);
}
