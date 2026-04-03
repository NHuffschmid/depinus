/**
 * PDF export for OSMD score.
 *
 * Accepts the OSMD container element and exports the rendered score as a PDF
 * file. The PDF page size is set dynamically to match the SVG dimensions so
 * that the score is not scaled down.
 *
 * NOTE: Multi-page export via OSMD page groups is prepared but currently
 * disabled because OSMD renders a single continuous SVG in the version in use.
 * Re-enable the page-group logic once OSMD produces per-page SVG elements.
 */
import jsPDF from 'jspdf';
import 'svg2pdf.js';

export async function exportScoreAsPDF(osmdContainer: HTMLDivElement): Promise<void> {
    const svgRoot = osmdContainer.querySelector('svg') as SVGSVGElement | null;
    if (!svgRoot) {
        alert('No SVG found!');
        return;
    }

    // ── Try to find OSMD per-page SVG elements ───────────────────────────────
    // Prefer <svg class="osmd-page"> if available (newer OSMD versions).
    let pageArray: Element[] = Array.from(svgRoot.querySelectorAll('svg.osmd-page'));
    // Fallback to <g id="osmdPage..."> or <g class="osmd-page">
    if (pageArray.length === 0) {
        pageArray = Array.from(svgRoot.querySelectorAll('g[id^="osmdPage"], g.osmd-page'));
    }

    // ── Single-SVG fallback (current OSMD behaviour) ─────────────────────────
    // OSMD currently renders one continuous SVG for the whole score.
    // Use the bounding box of the root SVG as the PDF page size so the score
    // is rendered at full size (not scaled to A4).
    if (pageArray.length === 0) {
        const bbox = svgRoot.getBBox();
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: [bbox.width, bbox.height]
        });
        // @ts-ignore – svg2pdf.js extends jsPDF at runtime
        await pdf.svg(svgRoot, { x: 0, y: 0, width: bbox.width, height: bbox.height });
        pdf.save('score.pdf');
        return;
    }

    // ── Multi-page export ────────────────────────────────────────────────────
    const pageWidth = 595;   // A4 width in pt
    const pageHeight = 842;  // A4 height in pt
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pageWidth, pageHeight] });

    /** Wrap a group element in a new SVG so svg2pdf.js can process it. */
    function createPageSVG(gElem: SVGGElement): SVGSVGElement {
        const svgNS = 'http://www.w3.org/2000/svg';
        const newSvg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
        newSvg.setAttribute('width', pageWidth.toString());
        newSvg.setAttribute('height', pageHeight.toString());
        newSvg.setAttribute('viewBox', `0 0 ${pageWidth} ${pageHeight}`);
        newSvg.appendChild(gElem.cloneNode(true));
        return newSvg;
    }

    for (let i = 0; i < pageArray.length; i++) {
        if (i > 0) pdf.addPage([pageWidth, pageHeight], 'portrait');

        let pageSVG: SVGSVGElement;
        if (pageArray[i] instanceof SVGSVGElement) {
            pageSVG = pageArray[i] as SVGSVGElement;
        } else {
            pageSVG = createPageSVG(pageArray[i] as SVGGElement);
        }

        // @ts-ignore – svg2pdf.js extends jsPDF at runtime
        await pdf.svg(pageSVG, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }

    pdf.save('score.pdf');
}
