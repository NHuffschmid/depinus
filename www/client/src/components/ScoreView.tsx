import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import 'svg2pdf.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { midiToMusicXML } from '../modules/Midi2MusicXML/index';
import { Midi } from '@tonejs/midi';
import { Base64 } from 'js-base64';

interface ScoreViewProps { }

const ScoreView: React.FC<ScoreViewProps> = () => {
    const osmdContainerRef = useRef<HTMLDivElement>(null);
    const [midi, setMidi] = useState<Midi | null>(null);
    const [liveMidiEvents, setLiveMidiEvents] = useState<Uint8Array[]>([]);
    const [compositionName, setCompositionName] = useState<string>('');
    const [composerName, setComposerName] = useState<string>('');
    const [mode, setMode] = useState<'playback' | 'recording' | null>(null);
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);
    const [currentCompositionId, setCurrentCompositionId] = useState<string | null>(null);

    const osmdRef = useRef<OpenSheetMusicDisplay>();

    function exportScoreAsPDF() {
        if (!osmdContainerRef.current) {
            alert('No OSMD container found!');
            return;
        }
        const svg = osmdContainerRef.current.querySelector('svg');
        if (!svg) {
            alert('No SVG found!');
            return;
        }
        // Read SVG size
        const bbox = svg.getBBox();
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: [bbox.width, bbox.height]
        });
        // svg2pdf.js expects an SVGElement
        // @ts-ignore
        pdf.svg(svg, { x: 0, y: 0, width: bbox.width, height: bbox.height }).then(() => {
            pdf.save('score.pdf');
        });
    }

    // WebSocket Connection
    const webSocket = useDepinusWebSocket({
        name: 'ScoreView',
        onOpen: () => {
            console.log('WebSocket connected');
            setIsWebSocketReady(true);
        },
        onInfoMessage: (message: any) => {
            if (message.isRecording === true) {
                console.log('Recording started - clearing score');
                setMode('recording');
                setMidi(null);
                setCurrentCompositionId(null);
                setLiveMidiEvents([]);
            }
            else if (message.composition && message.composition.compositionId) {
                const newId = message.composition.compositionId;
                if (newId !== currentCompositionId) {
                    console.log('New composition detected:', newId);
                    setCurrentCompositionId(newId);
                    if (webSocket.sendRpcCall) {
                        console.log('Requesting MIDI data via RPC for new composition...');
                        webSocket.sendRpcCall('GetCurrentMidiData', {});
                    }
                }
            }
            // Receive live MIDI event as base64 bytes
            if (message.midiEventBytes) {
                const bytes = Base64.toUint8Array(message.midiEventBytes);
                setLiveMidiEvents(prev => [...prev, bytes]);
            }
        },
        onRtcResponseMessage: async (message: any) => {
            console.log('RPC Response:', message);
            if (message.result && message.result.midiBase64) {
                setMode('playback');
                setCompositionName(message.result.compositionName || '');
                setComposerName(message.result.composerName || '');
                try {
                    // Decode base64
                    const midiBytes = Base64.toUint8Array(message.result.midiBase64);
                    // Parse MIDI
                    const midiObj = new Midi(midiBytes);
                    setMidi(midiObj);
                } catch (e) {
                    console.error('Error parsing MIDI data:', e);
                }
            } else if (message.result === null) {
                console.log('No composition currently playing');
            }
        }
    });

    // Request MIDI data on mount if composition is playing
    useEffect(() => {
        if (isWebSocketReady && webSocket.sendRpcCall) {
            console.log('Requesting current MIDI data via RPC...');
            webSocket.sendRpcCall('GetCurrentMidiData', {});
        }
    }, [isWebSocketReady]);

    // Convert MIDI to MusicXML when MIDI is loaded (Playback)
    useEffect(() => {
        if (!osmdContainerRef.current) return;
        if (!midi) return;
        const xml = midiToMusicXML(midi, compositionName, composerName);
        if (!osmdRef.current) {
            osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current, {
                drawingParameters: "default",
            });
        }
        osmdRef.current.clear();
        osmdRef.current.load(xml).then(() => osmdRef.current!.render());
    }, [midi, compositionName, composerName]);

    // Live recording: display live received MIDI events as score
    useEffect(() => {
        if (!osmdContainerRef.current) return;
        if (mode !== 'recording') return;
        if (liveMidiEvents.length === 0) {
            // Clear score
            if (osmdRef.current) osmdRef.current.clear();
            return;
        }
        try {
            // Extract only note-on events (simplified assumption: 3 bytes per event)
            const midiEvents: { note: number; velocity: number }[] = [];
            liveMidiEvents.forEach(bytes => {
                // Very simple heuristic: status byte 0x90 = note-on, 0x80 = note-off
                if (bytes.length >= 3 && (bytes[0] & 0xf0) === 0x90 && bytes[2] > 0) {
                    midiEvents.push({
                        note: bytes[1],
                        velocity: bytes[2]
                    });
                }
            });
            // Generate MusicXML (minimal, for live events)
            const notes: any[] = midiEvents.map(e => {
                // Use the same midiNoteToPitch logic as in midiToMusicXML
                const stepNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
                const alterMap = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
                const midiNote = e.note;
                const step = stepNames[midiNote % 12];
                const alter = alterMap[midiNote % 12];
                const octave = Math.floor(midiNote / 12) - 1;
                return {
                    step,
                    alter,
                    octave,
                    duration: 1,
                    type: 'quarter',
                };
            });
            const measures: any[] = [];
            for (let i = 0; i < notes.length; i += 4) {
                measures.push({
                    notes: notes.slice(i, i + 4),
                    attributes: i === 0 ? {
                        divisions: 1,
                        key: 4, // E major
                        time: { beats: 4, beatType: 4 },
                        clef: { sign: 'G', line: 2 }
                    } : undefined
                });
            }
            const partXml = `<part id="P1">\n${measures.map(measure => `<measure>\n${measure.attributes ? `<attributes>\n  <divisions>${measure.attributes.divisions}</divisions>\n  <key>\n    <fifths>${measure.attributes.key}</fifths>\n  </key>\n  <time>\n    <beats>${measure.attributes.time.beats}</beats>\n    <beat-type>${measure.attributes.time.beatType}</beat-type>\n  </time>\n  <clef>\n    <sign>${measure.attributes.clef.sign}</sign>\n    <line>${measure.attributes.clef.line}</line>\n  </clef>\n</attributes>\n` : ''}${measure.notes.map((note: any) => `<note>\n  <pitch>\n    <step>${note.step}</step>\n    ${note.alter ? `<alter>${note.alter}</alter>` : ''}\n    <octave>${note.octave}</octave>\n  </pitch>\n  <duration>${note.duration}</duration>\n  <type>${note.type}</type>\n</note>`).join('\n')}\n</measure>`).join('\n')}\n</part>`;
            const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<score-partwise version="3.1">\n  <work>\n    <work-title>Live Recording</work-title>\n  </work>\n  <part-list>\n    <score-part id=\"P1\"><part-name>Part</part-name></score-part>\n  </part-list>\n  ${partXml}\n</score-partwise>`;
            if (!osmdRef.current) {
                osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current, {
                    drawingParameters: "default",
                });
            }
            osmdRef.current.clear();
            osmdRef.current.load(xml).then(() => osmdRef.current!.render());
        } catch (e) {
            console.error('Error parsing live MIDI events:', e);
        }
    }, [liveMidiEvents, mode]);

    return (
        <div>
            <p>Mode: {mode || 'Waiting...'} | {midi ? `Tracks: ${midi.tracks.length}` : 'No MIDI loaded'}</p>
            <button onClick={exportScoreAsPDF}>Export as PDF</button>
            <div ref={osmdContainerRef}></div>
        </div>
    );
};

export default ScoreView;
