import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import 'svg2pdf.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { midiEventsToMusicXML } from '../modules/Midi2MusicXML/index';
import { MidiEvent } from '../modules/Midi2MusicXML/types';

interface ScoreViewProps { }

const ScoreView: React.FC<ScoreViewProps> = () => {
    const osmdContainerRef = useRef<HTMLDivElement>(null);
    const [midiEvents, setMidiEvents] = useState<MidiEvent[]>([]);
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
        // SVG-Größe auslesen
        const bbox = svg.getBBox();
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: [bbox.width, bbox.height]
        });
        // svg2pdf.js erwartet ein SVGElement
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
                setCompositionName(message.result.compositionName || '');
                setComposerName(message.result.composerName || '');
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
        const musicXML = midiEventsToMusicXML(midiEvents, compositionName, composerName);
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
            <p>Mode: {mode || 'Waiting...'} | MIDI Events: {midiEvents.length}</p>
            <button onClick={exportScoreAsPDF}>Export as PDF</button>
            <div ref={osmdContainerRef}></div>
            {/* Canvas entfernt, da nicht mehr benötigt */}
        </div>
    );
};

export default ScoreView;
