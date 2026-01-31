
// MusicXML Model Types
export type Note = {
    step: string;
    alter?: number;
    octave: number;
    duration: number;
    type: string;
};

export type Measure = {
    notes: Note[];
    attributes?: {
        divisions?: number;
        key?: number;
        time?: { beats: number; beatType: number };
        clef?: { sign: string; line: number };
    };
    sound?: {
        tempo: number;
    };
    direction?: {
        tempo: number;
        beatUnit?: string;
    };
};

export type Part = {
    id: string;
    measures: Measure[];
};

export type Score = {
    title?: string;
    composer?: string;
    copyright?: string;
    parts: Part[];
};

// MusicXML Render Functions
export function noteToXml(note: Note): string {
    return `<note>\n  <pitch>\n    <step>${note.step}</step>\n    ${note.alter !== undefined ? `<alter>${note.alter}</alter>` : ''}\n    <octave>${note.octave}</octave>\n  </pitch>\n  <duration>${note.duration}</duration>\n  <type>${note.type}</type>\n</note>`;
}

export function measureToXml(measure: Measure): string {
    const attr = measure.attributes;
    let attrXml = '';
    if (attr) {
        attrXml = `<attributes>\n`;
        if (attr.divisions) attrXml += `  <divisions>${attr.divisions}</divisions>\n`;
        if (attr.key !== undefined) attrXml += `  <key>\n    <fifths>${attr.key}</fifths>\n  </key>\n`;
        if (attr.time) attrXml += `  <time>\n    <beats>${attr.time.beats}</beats>\n    <beat-type>${attr.time.beatType}</beat-type>\n  </time>\n`;
        if (attr.clef) attrXml += `  <clef>\n    <sign>${attr.clef.sign}</sign>\n    <line>${attr.clef.line}</line>\n  </clef>\n`;
        attrXml += `</attributes>\n`;
    }
    let directionXml = '';
    if (measure.direction) {
        directionXml = `<direction placement=\"above\">\n  <direction-type>\n    <metronome>\n      <beat-unit>${measure.direction.beatUnit || 'quarter'}</beat-unit>\n      <per-minute>${measure.direction.tempo}</per-minute>\n    </metronome>\n  </direction-type>\n  <sound tempo=\"${measure.direction.tempo}\"/>\n</direction>\n`;
    }
    const soundXml = measure.sound && !measure.direction ? `<sound tempo=\"${measure.sound.tempo}\"/>\n` : '';
    return `<measure>\n${attrXml}${directionXml}${soundXml}${measure.notes.map(noteToXml).join('\n')}\n</measure>`;
}

export function partToXml(part: Part): string {
    return `<part id="${part.id}">\n${part.measures.map(measureToXml).join('\n')}\n</part>`;
}

export function scoreToXml(score: Score): string {
    const identification = (score.composer || score.copyright)
        ? `<identification>\n${score.composer ? `<creator type=\"composer\">${score.composer}</creator>\n` : ''}${score.copyright ? `<rights>${score.copyright}</rights>\n` : ''}</identification>\n`
        : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<score-partwise version="3.1">\n  <work>\n    <work-title>${score.title || ''}</work-title>\n  </work>\n  ${identification}  <part-list>\n    ${score.parts.map(p => `<score-part id=\"${p.id}\"><part-name>Part</part-name></score-part>`).join('\n    ')}\n  </part-list>\n  ${score.parts.map(partToXml).join('\n  ')}\n</score-partwise>`;
}
