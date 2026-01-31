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
  // Extract copyright
  const copyrightEvent = midiEvents.find(e => e.type === 'copyright' && typeof e.text === 'string');
  const copyright = copyrightEvent && typeof copyrightEvent.text === 'string'
    ? copyrightEvent.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : undefined;

  // Read tempo (if present)
  // Accept both microsecondsPerQuarterNote and tempo (both µs/quarter)
  let tempo: number | undefined = undefined;
  const tempoEvent = midiEvents.find(e => e.type === 'set_tempo' && (typeof (e as any).microsecondsPerQuarterNote === 'number' || typeof (e as any).tempo === 'number'));
  let usPerQuarter: number | undefined = undefined;
  if (tempoEvent) {
    if (typeof (tempoEvent as any).microsecondsPerQuarterNote === 'number') {
      usPerQuarter = (tempoEvent as any).microsecondsPerQuarterNote;
    } else if (typeof (tempoEvent as any).tempo === 'number') {
      usPerQuarter = (tempoEvent as any).tempo;
    }
    if (usPerQuarter) {
      tempo = Math.round(60000000 / usPerQuarter);
    }
  }

  // All note-on events with velocity > 0
  const noteOnEvents = midiEvents.filter(e => e.type === 'note_on' && typeof e.note === 'number' && (e.velocity ?? 0) > 0);

  // Create notes (all as quarter notes, divisions=1)
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
