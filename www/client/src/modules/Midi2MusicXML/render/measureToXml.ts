import { Measure } from '../types';
import { noteToXml } from './noteToXml';

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
