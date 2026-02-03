import { Note, Measure, Section, System, Voice, Score } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeTempo } from './analysis/analyzeTempo';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { analyseKey } from './analysis/analyseKey';
import { scoreToXml } from './render/scoreToXml';
import { collectAndSortNotes } from './utils/collectAndSortNotes';

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
  const trebleMeasures: Measure[] = [];
  for (let i = 0; i < notes.length; i += 4) {
    const measureNotes = notes.slice(i, i + 4);
    while (measureNotes.length < 4) {
      measureNotes.push({
        step: 'C',
        octave: 4,
        duration: 1,
        type: 'quarter',
        isRest: true,
      });
    }
    trebleMeasures.push({ notes: measureNotes });
  }

  // Bass measures: same number, all rests
  const bassMeasures: Measure[] = trebleMeasures.map(measure => ({
    notes: measure.notes.map(n => ({
      step: 'C',
      octave: 2,
      duration: n.duration,
      type: n.type,
      isRest: true,
    }))
  }));

  // section for both voices
  const trebleSection: Section = {
    measures: trebleMeasures,
    attributes: {
      divisions: 1,
      time: { beats: 4, beatType: 4 },
      key: undefined,
      clef: { sign: 'G', line: 2 },
    },
    direction: tempo ? { tempo, beatUnit: 'quarter' } : undefined,
    sound: tempo ? { tempo } : undefined,
  };
  const bassSection: Section = {
    measures: bassMeasures,
    attributes: {
      divisions: 1,
      time: { beats: 4, beatType: 4 },
      key: undefined,
      clef: { sign: 'F', line: 4 }, // Bassschlüssel
    },
    direction: tempo ? { tempo, beatUnit: 'quarter' } : undefined,
    sound: tempo ? { tempo } : undefined,
  };

  // Key detection (updates trebleSection.attributes.key)
  const sectionKey = analyseKey(trebleSection);
  if (!trebleSection.attributes) trebleSection.attributes = {};
  trebleSection.attributes.key = sectionKey;
  if (!bassSection.attributes) bassSection.attributes = {};
  bassSection.attributes.key = sectionKey;
  console.log('Analyzed section key (fifths):', sectionKey);

  const trebleVoice: Voice = {
    clef: 'treble',
    sections: [trebleSection],
  };
  const bassVoice: Voice = {
    clef: 'bass',
    sections: [bassSection],
  };
  const system: System = {
    voices: [trebleVoice, bassVoice],
  };

  const score: Score = {
    title: scoreTitle,
    composer: scoreComposer,
    copyright,
    system,
  };

  // Render as MusicXML
  return scoreToXml(score);
}
