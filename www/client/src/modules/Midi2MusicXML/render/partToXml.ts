import { Part } from '../types';
import { measureToXml } from './measureToXml';

export function partToXml(part: Part): string {
    return `<part id="${part.id}">\n${part.measures.map(measureToXml).join('\n')}\n</part>`;
}
