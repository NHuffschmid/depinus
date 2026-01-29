import { MidiEvent, Note, Measure, Part, Score, scoreToXml } from './types';

function midiNoteToPitch(midiNote: number) {
  const stepNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alterMap = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const step = stepNames[midiNote % 12];
  const alter = alterMap[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return { step, alter, octave };
}

export function midiEventsToMusicXML(
  midiEvents: MidiEvent[],
  compositionName?: string,
  composerName?: string
): string {
  // Copyright extrahieren
  const copyrightEvent = midiEvents.find(e => e.type === 'copyright' && typeof e.text === 'string');
  const copyright = copyrightEvent && typeof copyrightEvent.text === 'string'
    ? copyrightEvent.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : undefined;

  // Alle Note-On Events mit velocity > 0
  const noteOnEvents = midiEvents.filter(e => e.type === 'note_on' && typeof e.note === 'number' && (e.velocity ?? 0) > 0);

  // Noten erzeugen (alle als Viertelnote, divisions=1)
  const notes: Note[] = noteOnEvents.map(e => {
    const { step, alter, octave } = midiNoteToPitch(e.note!);
    return {
      step,
      alter,
      octave,
      duration: 1,
      type: 'quarter',
    };
  });

  if (notes.length === 0) return '';


  // Noten in 4er-Gruppen aufteilen (4/4-Takt, 4 Viertelnoten pro Measure)
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
    });
  }

  // Ein Part mit mehreren Measures
  const part: Part = {
    id: 'P1',
    measures,
  };

  // Score zusammenbauen
  const score: Score = {
    title: compositionName,
    composer: composerName,
    copyright,
    parts: [part],
  };

  // Als MusicXML rendern
  return scoreToXml(score);
}
