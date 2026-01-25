import React, { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
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

const ScoreView: React.FC<ScoreViewProps> = (props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [midiEvents, setMidiEvents] = useState<MidiEvent[]>([]);
    const [mode, setMode] = useState<'playback' | 'recording' | null>(null);
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);
    const [currentCompositionId, setCurrentCompositionId] = useState<string | null>(null);

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

    useEffect(() => {
        if (!containerRef.current || midiEvents.length === 0) return;

        // Clear container
        containerRef.current.innerHTML = '';

        // VexFlow Renderer
        const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
        renderer.resize(500, 200);
        const context = renderer.getContext();

        // Staff system
        const stave = new Stave(10, 40, 400);
        stave.addClef('treble').addTimeSignature('4/4');
        stave.setContext(context).draw();

        // TODO: Convert MIDI events to VexFlow notes
        // For now, just show a placeholder
        const notes = [
            new StaveNote({ keys: ['c/4'], duration: 'q' }),
            new StaveNote({ keys: ['d/4'], duration: 'q' }),
            new StaveNote({ keys: ['e/4'], duration: 'q' }),
            new StaveNote({ keys: ['f/4'], duration: 'q' }),
        ];

        const voice = new Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables(notes);

        new Formatter().joinVoices([voice]).format([voice], 350);
        voice.draw(context, stave);

    }, [midiEvents]);

    return (
        <div>
            <h2>Score View</h2>
            <p>Mode: {mode || 'Waiting...'} | MIDI Events: {midiEvents.length}</p>
            <div ref={containerRef}></div>
        </div>
    );
};

export default ScoreView;
