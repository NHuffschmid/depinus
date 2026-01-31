import { Score } from '../types';
import { partToXml } from './partToXml';

export function scoreToXml(score: Score): string {
    const identification = (score.composer || score.copyright)
        ? `<identification>\n${score.composer ? `<creator type=\"composer\">${score.composer}</creator>\n` : ''}${score.copyright ? `<rights>${score.copyright}</rights>\n` : ''}</identification>\n`
        : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<score-partwise version="3.1">\n  <work>\n    <work-title>${score.title || ''}</work-title>\n  </work>\n  ${identification}  <part-list>\n    ${score.parts.map(p => `<score-part id=\"${p.id}\"><part-name>Part</part-name></score-part>`).join('\n    ')}\n  </part-list>\n  ${score.parts.map(partToXml).join('\n  ')}\n</score-partwise>`;
}
