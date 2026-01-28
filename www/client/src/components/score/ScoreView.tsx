import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import useDepinusWebSocket from '../../custom-hooks/useDepinusWebsocket';
import { midiEventsToMusicXML } from '../../modules/midiToMusicXML';

interface MidiEvent {
    type: string;
    note?: number;
    velocity?: number;
    time?: number;
    channel?: number;
}

interface ScoreViewProps {}

const ScoreView: React.FC<ScoreViewProps> = () => {
    const osmdContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [midiEvents, setMidiEvents] = useState<MidiEvent[]>([]);
    const [mode, setMode] = useState<'playback' | 'recording' | null>(null);
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);
    const [currentCompositionId, setCurrentCompositionId] = useState<string | null>(null);

    const osmdRef = useRef<OpenSheetMusicDisplay>();

    function exportScoreAsPDF() {
        if (!canvasRef.current || !osmdContainerRef.current) {
            alert('No Canvas or OSMD container found!');
            return;
        }
        // SVG zu PNG zu PDF
        const svg = osmdContainerRef.current.querySelector('svg');
        if (!svg) {
            alert('No SVG found!');
            return;
        }
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new window.Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = function () {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d')!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape' });
            pdf.addImage(imgData, 'PNG', 0, 0, 297, 100);
            pdf.save('score.pdf');
            URL.revokeObjectURL(url);
        };
        img.src = url;
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
                setMidiEvents([]);
                setCurrentCompositionId(null);
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
            if (message.midiEvent) {
                console.log('Received midiEvent during recording:', message.midiEvent);
                setMode('recording');
                setMidiEvents(prev => [...prev, message.midiEvent]);
            }
        },
        onRtcResponseMessage: (message: any) => {
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

    // Create MusicXML from MIDI and display with OSMD
    useEffect(() => {
        if (!osmdContainerRef.current) return;
        // Generate MusicXML
        const musicXML = midiEventsToMusicXML(midiEvents);
        // Initialize or reuse OSMD
        if (!osmdRef.current) {
            osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current, {
                drawingParameters: "default",
            });
        }
        osmdRef.current.clear();
        osmdRef.current.load(musicXML).then(() => osmdRef.current!.render());
    }, [midiEvents]);

    return (
        <div>
            <h2>Score View (OSMD)</h2>
            <p>Mode: {mode || 'Waiting...'} | MIDI Events: {midiEvents.length}</p>
            <button onClick={exportScoreAsPDF}>Export as PDF</button>
            <div ref={osmdContainerRef}></div>
            <canvas ref={canvasRef} style={{ display: 'none' }} width={1200} height={400}></canvas>
        </div>
    );
};

export default ScoreView;
