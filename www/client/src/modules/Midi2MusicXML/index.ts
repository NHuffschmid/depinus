import { Note, Measure, Section, Part, Score } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeTempo } from './analysis/analyzeTempo';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { scoreToXml } from './render/scoreToXml';
import { collectAndSortNotes } from './utils/collectAndSortNotes';
import { analyseKey } from './analysis/analyseKey';

export function midi2MusicXML(
  midi: Midi,
  title?: string,
  composer?: string
): string {

  const scoreTitle = title ?? analyzeTitle(midi);
  const scoreComposer = composer ?? analyzeComposer(midi);
  const copyright = analyzeCopyright(midi);
  const tempo = analyzeTempo(midi);

  // Collect and sort all notes from all tracks
  const notes: Note[] = collectAndSortNotes(midi);

  if (notes.length === 0) return '';

  // Split notes into groups of 4 (4/4 time, 4 quarter notes per measure)
  const measures: Measure[] = [];
  for (let i = 0; i < notes.length; i += 4) {
    const measureNotes = notes.slice(i, i + 4);
    // Fill incomplete measures with rests
    while (measureNotes.length < 4) {
      measureNotes.push({
        step: 'C',
        octave: 4,
        duration: 1,
        type: 'quarter',
        isRest: true,
      });
    }
    const measure: Measure = {
      notes: measureNotes,
      section: {} as Section, // Placeholder, will be set later
    };
    measures.push(measure);
  }

  const section: Section = {
    measures,
    attributes: {
      divisions: 1,
      time: { beats: 4, beatType: 4 },
      clef: { sign: 'G', line: 2 },
    },
    direction: tempo ? { tempo, beatUnit: 'quarter' } : undefined,
    sound: tempo ? { tempo } : undefined,
  };

  measures.forEach(measure => {
    (measure as any).section = section;
  });

  const sectionKey = analyseKey(section);
  console.log('Analyzed section key (fifths):', sectionKey);

  // One part with multiple measures
  const part: Part = {
    id: 'P1',
    sections: [section],
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
