import { MidiEvent } from './types';

function midiNoteToPitch(midiNote: number) {
    const stepNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    const alterMap = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    const step = stepNames[midiNote % 12];
    const alter = alterMap[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return { step, alter, octave };
}

export function midiEventsToMusicXML(midiEvents: MidiEvent[], compositionName?: string, composerName?: string): string {
    // Find the first Note-On event
    const firstNote = midiEvents.find(e => e.type === 'note_on' && typeof e.note === 'number');
    if (!firstNote || typeof firstNote.note !== 'number') {
        // No note found: return empty string
        return '';
    }

    const { step, alter, octave } = midiNoteToPitch(firstNote.note);
    const safeTitle = compositionName ? compositionName.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const safeComposer = composerName ? composerName.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    return `
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<score-partwise version="3.1">
  <work>
    <work-title>${safeTitle}</work-title>
  </work>
  ${safeComposer ? `<identification><creator type=\"composer\">${safeComposer}</creator></identification>` : ''}
  <part-list>
    <score-part id="P1">
      <part-name>Startnote:</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>${step}</step>
          ${alter ? `<alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
    `.trim();
}
