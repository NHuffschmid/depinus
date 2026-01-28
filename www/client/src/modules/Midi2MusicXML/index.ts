import { MidiEvent } from './types';

function midiNoteToPitch(midiNote: number) {
    const stepNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    const alterMap = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    const step = stepNames[midiNote % 12];
    const alter = alterMap[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return { step, alter, octave };
}

export function midiEventsToMusicXML(midiEvents: MidiEvent[]): string {
    // Find the first Note-On event
    const firstNote = midiEvents.find(e => e.type === 'noteOn' && typeof e.note === 'number');
    if (!firstNote || typeof firstNote.note !== 'number') {
        // Empty score if no note found
        return `
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
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
        <rest/>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
        `.trim();
    }

    const { step, alter, octave } = midiNoteToPitch(firstNote.note);

    return `
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
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
