import { Part } from '../types';
import { sectionToXml } from './sectionToXml';

export function partToXml(part: Part): string {
    return `<part id="${part.id}">\n${part.sections.map(sectionToXml).join('\n')}\n</part>`;
}
