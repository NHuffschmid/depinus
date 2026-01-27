import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { Factory, Renderer } from 'vexflow';
import useDepinusWebSocket from '../../custom-hooks/useDepinusWebsocket';

interface MidiEvent {
    type: string;
    note?: number;
    velocity?: number;
    time?: number;
    channel?: number;
}

interface ScoreViewProps { }

const SCORE_WIDTH = 1200;
const SCORE_HEIGHT = 400;

function renderDemoScoreHighLevel({
    elementId,
    backend,
    trebleNotes,
    bassNotes,
}: {
    elementId: string,
    backend: 'SVG' | 'CANVAS',
    trebleNotes: string[],
    bassNotes: string[],
}) {
    const vf = new Factory({
        renderer: {
            elementId,
            backend: backend === 'SVG' ? Renderer.Backends.SVG : Renderer.Backends.CANVAS,
            width: SCORE_WIDTH,
            height: SCORE_HEIGHT,
        }
    });
    const score = vf.EasyScore();

    const system = vf.System({
        x: 10,
        y: 40,
        width: 1000,
        spaceBetweenStaves: 120,
    });

    // Takt 1
    system.addStave({
        voices: [
            score.voice(score.notes(trebleNotes[0], { keySignature: 'G' }))
        ]
    }).addClef('treble').addTimeSignature('4/4').addKeySignature('G');

    system.addStave({
        voices: [
            score.voice(score.notes(bassNotes[0], { clef: 'bass' }))
        ]
    }).addClef('bass').addTimeSignature('4/4');

    system.addConnector('brace');
    system.addConnector('singleLeft');
    system.addConnector('singleRight');

    // Takt 2
    system.addStave({
        voices: [
            score.voice(score.notes(trebleNotes[1]))
        ]
    });
    system.addStave({
        voices: [
            score.voice(score.notes(bassNotes[1], { clef: 'bass' }))
        ]
    });

    // Takt 3
    system.addStave({
        voices: [
            score.voice(score.notes(trebleNotes[2]))
        ]
    });
    system.addStave({
        voices: [
            score.voice(score.notes(bassNotes[2], { clef: 'bass' }))
        ]
    });

    // Takt 4
    system.addStave({
        voices: [
            score.voice(score.notes(trebleNotes[3]))
        ]
    });
    system.addStave({
        voices: [
            score.voice(score.notes(bassNotes[3], { clef: 'bass' }))
        ]
    });

    vf.draw();
}

const ScoreView: React.FC<ScoreViewProps> = () => {
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [midiEvents, setMidiEvents] = useState<MidiEvent[]>([]);
    const [mode, setMode] = useState<'playback' | 'recording' | null>(null);
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);
    const [currentCompositionId, setCurrentCompositionId] = useState<string | null>(null);

    // Beispiel: Demo-Noten (später dynamisch aus MIDI-Events generieren)
    const trebleNotes = [
        'C5/q, D5/q, E5/q, F5/q',
        'C5/8, D5/8, E5/8, F5/8, G5/8, A5/8, B5/8, C6/8',
        'C5/16, D5/16, E5/16, F5/16, G5/16, A5/16, B5/16, C6/16, B5/16, A5/16, G5/16, F5/16, E5/16, D5/16, C5/16, B4/16',
        'C5/8, D5/8, F5/q, G5/h'
    ];
    const bassNotes = [
        'C3/q, D3/q, E3/q, F3/q',
        'C3/h, D3/h',
        'C3/w',
        //'C3/q/r, D3/h/r, (E3/G3/B3)/q'
        'C3/q, D3/q, E3/q, F3/q'
    ];

    function exportScoreAsPDF() {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, SCORE_WIDTH, SCORE_HEIGHT);

        renderDemoScoreHighLevel({
            elementId: 'score-canvas-container',
            backend: 'CANVAS',
            trebleNotes,
            bassNotes,
        });

        const imgData = canvasRef.current.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape' });
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 100);
        pdf.save('score.pdf');
    }

    // WebSocket Connection
    const webSocket = useDepinusWebSocket({
        name: 'ScoreView',
        onOpen: () => {
            setIsWebSocketReady(true);
        },
        onInfoMessage: (message: any) => {
            if (message.isRecording === true) {
                setMode('recording');
                setMidiEvents([]);
                setCurrentCompositionId(null);
            }
            else if (message.composition && message.composition.compositionId) {
                const newId = message.composition.compositionId;
                if (newId !== currentCompositionId) {
                    setCurrentCompositionId(newId);
                    if (webSocket.sendRpcCall) {
                        webSocket.sendRpcCall('GetCurrentMidiData', {});
                    }
                }
            }
            if (message.midiEvent) {
                setMode('recording');
                setMidiEvents(prev => [...prev, message.midiEvent]);
            }
        },
        onRtcResponseMessage: (message: any) => {
            if (message.result && message.result.midiEvents) {
                setMode('playback');
                setMidiEvents(message.result.midiEvents);
            }
        }
    });

    useEffect(() => {
        if (isWebSocketReady && webSocket.sendRpcCall) {
            webSocket.sendRpcCall('GetCurrentMidiData', {});
        }
    }, [isWebSocketReady]);

    // SVG-Rendering (Demo, später dynamisch aus midiEvents)
    useEffect(() => {
        if (!svgContainerRef.current) return;
        svgContainerRef.current.innerHTML = '';
        renderDemoScoreHighLevel({
            elementId: 'score-svg-container',
            backend: 'SVG',
            trebleNotes,
            bassNotes,
        });
    }, [trebleNotes, bassNotes]);

    return (
        <div>
            <h2>Score View (High-Level VexFlow)</h2>
            <p>Mode: {mode || 'Waiting...'} | MIDI Events: {midiEvents.length}</p>
            <button onClick={exportScoreAsPDF}>Export as PDF</button>
            <div id="score-svg-container" ref={svgContainerRef}></div>
            <canvas id="score-canvas-container" ref={canvasRef} width={SCORE_WIDTH} height={SCORE_HEIGHT} style={{ display: 'none' }}></canvas>
        </div>
    );
};

export default ScoreView;
