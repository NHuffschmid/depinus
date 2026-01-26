import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Tuplet, StaveConnector } from 'vexflow';
import useDepinusWebSocket from '../../custom-hooks/useDepinusWebsocket';

interface MidiEvent {
    type: string;
    note?: number;
    velocity?: number;
    time?: number;
    channel?: number;
}

interface ScoreViewProps {
    // Placeholder for future props
}

function renderDemoScore(context: any) {
    const staveWidth = 250;
    const startX = 10;
    const trebleY = 40;
    const bassY = 160;

    // TAKT 1
    const treble1 = new Stave(startX, trebleY, staveWidth);
    treble1.addClef('treble').addTimeSignature('4/4').addKeySignature('G');
    treble1.setContext(context).draw();

    const bass1 = new Stave(startX, bassY, staveWidth);
    bass1.addClef('bass').addTimeSignature('4/4');
    bass1.setContext(context).draw();

    const connector1 = new StaveConnector(treble1, bass1);
    connector1.setType(StaveConnector.type.BRACE);
    connector1.setContext(context).draw();

    const trebleNotes1 = [
        new StaveNote({ keys: ['c/5'], duration: 'q' }),
        new StaveNote({ keys: ['d/5'], duration: 'q' }),
        new StaveNote({ keys: ['e/5'], duration: 'q' }),
        new StaveNote({ keys: ['f/5'], duration: 'q' }),
    ];

    const bassNotes1 = [
        new StaveNote({ keys: ['c/3'], duration: 'q', clef: 'bass' }),
        new StaveNote({ keys: ['d/3'], duration: 'q', clef: 'bass' }),
        new StaveNote({ keys: ['e/3'], duration: 'q', clef: 'bass' }),
        new StaveNote({ keys: ['f/3'], duration: 'q', clef: 'bass' }),
    ];

    const trebleVoice1 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(trebleNotes1);
    const bassVoice1 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(bassNotes1);

    new Formatter().joinVoices([trebleVoice1]).format([trebleVoice1], staveWidth - 20);
    new Formatter().joinVoices([bassVoice1]).format([bassVoice1], staveWidth - 20);

    trebleVoice1.draw(context, treble1);
    bassVoice1.draw(context, bass1);

    // TAKT 2
    const x2 = startX + staveWidth;
    const treble2 = new Stave(x2, trebleY, staveWidth);
    treble2.setContext(context).draw();

    const bass2 = new Stave(x2, bassY, staveWidth);
    bass2.setContext(context).draw();

    const trebleNotes2 = [
        new StaveNote({ keys: ['c/5'], duration: '8' }),
        new StaveNote({ keys: ['d/5'], duration: '8' }),
        new StaveNote({ keys: ['e/5'], duration: '8' }),
        new StaveNote({ keys: ['f/5'], duration: '8' }),
        new StaveNote({ keys: ['g/5'], duration: '8' }),
        new StaveNote({ keys: ['a/5'], duration: '8' }),
        new StaveNote({ keys: ['b/5'], duration: '8' }),
        new StaveNote({ keys: ['c/6'], duration: '8' }),
    ];

    const bassNotes2 = [
        new StaveNote({ keys: ['c/3'], duration: 'h', clef: 'bass' }),
        new StaveNote({ keys: ['d/3'], duration: 'h', clef: 'bass' }),
    ];

    const trebleVoice2 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(trebleNotes2);
    const bassVoice2 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(bassNotes2);

    const trebleBeams2 = Beam.generateBeams(trebleNotes2);

    new Formatter().joinVoices([trebleVoice2]).format([trebleVoice2], staveWidth - 20);
    new Formatter().joinVoices([bassVoice2]).format([bassVoice2], staveWidth - 20);

    trebleVoice2.draw(context, treble2);
    bassVoice2.draw(context, bass2);

    trebleBeams2.forEach(beam => beam.setContext(context).draw());

    // TAKT 3
    const x3 = x2 + staveWidth;
    const treble3 = new Stave(x3, trebleY, staveWidth);
    treble3.setContext(context).draw();

    const bass3 = new Stave(x3, bassY, staveWidth);
    bass3.setContext(context).draw();

    const trebleNotes3 = [
        new StaveNote({ keys: ['c/5'], duration: '16' }),
        new StaveNote({ keys: ['d/5'], duration: '16' }),
        new StaveNote({ keys: ['e/5'], duration: '16' }),
        new StaveNote({ keys: ['f/5'], duration: '16' }),
        new StaveNote({ keys: ['g/5'], duration: '16' }),
        new StaveNote({ keys: ['a/5'], duration: '16' }),
        new StaveNote({ keys: ['b/5'], duration: '16' }),
        new StaveNote({ keys: ['c/6'], duration: '16' }),
        new StaveNote({ keys: ['b/5'], duration: '16' }),
        new StaveNote({ keys: ['a/5'], duration: '16' }),
        new StaveNote({ keys: ['g/5'], duration: '16' }),
        new StaveNote({ keys: ['f/5'], duration: '16' }),
        new StaveNote({ keys: ['e/5'], duration: '16' }),
        new StaveNote({ keys: ['d/5'], duration: '16' }),
        new StaveNote({ keys: ['c/5'], duration: '16' }),
        new StaveNote({ keys: ['b/4'], duration: '16' }),
    ];

    const bassNotes3 = [
        new StaveNote({ keys: ['c/3'], duration: 'w', clef: 'bass' }),
    ];

    const trebleVoice3 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(trebleNotes3);
    const bassVoice3 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(bassNotes3);

    const trebleBeams3 = Beam.generateBeams(trebleNotes3);

    new Formatter().joinVoices([trebleVoice3]).format([trebleVoice3], staveWidth - 20);
    new Formatter().joinVoices([bassVoice3]).format([bassVoice3], staveWidth - 20);

    trebleVoice3.draw(context, treble3);
    bassVoice3.draw(context, bass3);

    trebleBeams3.forEach(beam => beam.setContext(context).draw());

    // TAKT 4
    const x4 = x3 + staveWidth;
    const treble4 = new Stave(x4, trebleY, staveWidth);
    treble4.setContext(context).draw();

    const bass4 = new Stave(x4, bassY, staveWidth);
    bass4.setContext(context).draw();

    const tripletNotes = [
        new StaveNote({ keys: ['c/5'], duration: '8' }),
        new StaveNote({ keys: ['d/5'], duration: '8' }),
        new StaveNote({ keys: ['e/5'], duration: '8' }),
    ];

    const trebleNotes4 = [
        ...tripletNotes,
        new StaveNote({ keys: ['f/5'], duration: 'q' }),
        new StaveNote({ keys: ['g/5'], duration: 'h' }),
    ];

    const bassNotes4 = [
        new StaveNote({ keys: ['c/3'], duration: 'qr', clef: 'bass' }),
        new StaveNote({ keys: ['d/3'], duration: 'hr', clef: 'bass' }),
        new StaveNote({ keys: ['e/3', 'g/3', 'b/3'], duration: 'q', clef: 'bass' }),
    ];

    const triplet = new Tuplet(tripletNotes);

    const trebleVoice4 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(trebleNotes4);
    const bassVoice4 = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(bassNotes4);

    const trebleBeams4 = Beam.generateBeams(tripletNotes);

    new Formatter().joinVoices([trebleVoice4]).format([trebleVoice4], staveWidth - 20);
    new Formatter().joinVoices([bassVoice4]).format([bassVoice4], staveWidth - 20);

    trebleVoice4.draw(context, treble4);
    bassVoice4.draw(context, bass4);

    trebleBeams4.forEach(beam => beam.setContext(context).draw());
    triplet.setContext(context).draw();
}

const ScoreView: React.FC<ScoreViewProps> = (props) => {
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [midiEvents, setMidiEvents] = useState<MidiEvent[]>([]);
    const [mode, setMode] = useState<'playback' | 'recording' | null>(null);
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);
    const [currentCompositionId, setCurrentCompositionId] = useState<string | null>(null);

    function exportScoreAsPDF() {
        const canvas = canvasRef.current;
        if (!canvas) {
            alert('No Canvas found!');
            return;
        }
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape' });
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 100);
        pdf.save('score.pdf');
    }

    // WebSocket Connection
    const webSocket = useDepinusWebSocket({
        name: 'ScoreView',
        onOpen: () => {
            console.log('WebSocket connected');
            setIsWebSocketReady(true);
        },
        onInfoMessage: (message: any) => {
            // Check if recording starts
            if (message.isRecording === true) {
                console.log('Recording started - clearing score');
                setMode('recording');
                setMidiEvents([]);
                setCurrentCompositionId(null);
            }
            // Listen for composition changes
            else if (message.composition && message.composition.compositionId) {
                const newId = message.composition.compositionId;
                if (newId !== currentCompositionId) {
                    console.log('New composition detected:', newId);
                    setCurrentCompositionId(newId);
                    // Trigger RPC to get MIDI data
                    if (webSocket.sendRpcCall) {
                        console.log('Requesting MIDI data via RPC for new composition...');
                        webSocket.sendRpcCall('GetCurrentMidiData', {});
                    }
                }
            }
            // Handle recording MIDI events
            if (message.midiEvent) {
                console.log('Received midiEvent during recording:', message.midiEvent);
                setMode('recording');
                setMidiEvents(prev => [...prev, message.midiEvent]);
            }
        },
        onRtcResponseMessage: (message: any) => {
            // Handle RPC response for GetCurrentMidiData
            console.log('RPC Response:', message);
            if (message.result && message.result.midiEvents) {
                console.log('Received RPC midiData:', message.result);
                setMode('playback');
                setMidiEvents(message.result.midiEvents);
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

    // Separate useEffect for VexFlow Demo - runs once on mount
    useEffect(() => {
        if (!svgContainerRef.current || !canvasRef.current) return;

        // SVG-Renderer (wie gehabt)
        svgContainerRef.current.innerHTML = '';
        const svgRenderer = new Renderer(svgContainerRef.current, Renderer.Backends.SVG);
        svgRenderer.resize(1200, 400);
        const svgContext = svgRenderer.getContext();
        renderDemoScore(svgContext);

        // Canvas-Renderer (jetzt mit echtem <canvas>)
        const canvas = canvasRef.current;
        const canvasRenderer = new Renderer(canvas, Renderer.Backends.CANVAS);
        canvasRenderer.resize(1200, 400);
        const canvasContext = canvasRenderer.getContext();
        renderDemoScore(canvasContext);
    }, []);

    return (
        <div>
            <h2>Score View</h2>
            <p>Mode: {mode || 'Waiting...'} | MIDI Events: {midiEvents.length}</p>
            <button onClick={exportScoreAsPDF}>Export as PDF</button>
            <div ref={svgContainerRef}></div>
            <canvas ref={canvasRef} style={{ display: 'none' }} width={1200} height={400}></canvas>        </div>
    );
};

export default ScoreView;
