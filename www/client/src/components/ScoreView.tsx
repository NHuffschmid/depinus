import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import 'svg2pdf.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { midi2MusicXML } from '../modules/Midi2MusicXML/index';
import { Midi } from '@tonejs/midi';
import { Base64 } from 'js-base64';

interface ScoreViewProps { }

const ScoreView: React.FC<ScoreViewProps> = () => {
    const osmdContainerRef = useRef<HTMLDivElement>(null);
    const [midi, setMidi] = useState<Midi | null>(null);
    const [liveMidi, setLiveMidi] = useState<Midi | null>(null);
    const liveActiveNotesRef = useRef<Map<number, { startTick: number, velocity: number }>>(new Map());
    const liveTickRef = useRef<number>(0);
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
                const midi = new Midi();
                midi.header.setTempo(120); // Default tempo
                midi.addTrack();
                setLiveMidi(midi);
                liveActiveNotesRef.current = new Map();
                liveTickRef.current = 0;
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
            if (message.midiEventBytes && mode === 'recording') {
                const bytes = Base64.toUint8Array(message.midiEventBytes);
                // Only handle note-on and note-off events (3 bytes)
                if (bytes.length >= 3) {
                    const status = bytes[0] & 0xf0;
                    const channel = bytes[0] & 0x0f;
                    const note = bytes[1];
                    const velocity = bytes[2];
                    if (liveMidi) {
                        const track = liveMidi.tracks[0];
                        const tick = liveTickRef.current;
                        if (status === 0x90 && velocity > 0) {
                            liveActiveNotesRef.current.set(note, { startTick: tick, velocity });
                        } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
                            const active = liveActiveNotesRef.current.get(note);
                            if (active) {
                                const duration = Math.max(1, tick - active.startTick);
                                track.addNote({
                                    midi: note,
                                    time: active.startTick,
                                    duration,
                                    velocity: active.velocity / 127,
                                });
                                liveActiveNotesRef.current.delete(note);
                            }
                        }
                        liveTickRef.current += 1;
                        setLiveMidi(liveMidi.clone());
                    }
                }
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
        const xml = midi2MusicXML(midi, compositionName, composerName);
        if (!osmdRef.current) {
            osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current, {
                drawingParameters: "default",
            });
        }
        osmdRef.current.clear();
        osmdRef.current.load(xml).then(() => osmdRef.current!.render());
    }, [midi, compositionName, composerName]);

    // Live recording: display liveMidi as score
    useEffect(() => {
        if (!osmdContainerRef.current) return;
        if (mode !== 'recording') return;
        if (!liveMidi || liveMidi.tracks[0].notes.length === 0) {
            // Clear score
            if (osmdRef.current) osmdRef.current.clear();
            return;
        }
        try {
            const xml = midi2MusicXML(liveMidi, 'Live Recording', 'Depinus');
            if (!osmdRef.current) {
                osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current, {
                    drawingParameters: "default",
                });
            }
            osmdRef.current.clear();
            osmdRef.current.load(xml).then(() => osmdRef.current!.render());
        } catch (e) {
            console.error('Error rendering live MIDI:', e);
        }
    }, [liveMidi, mode]);

    return (
        <div>
            <p>Mode: {mode || 'Waiting...'} | {mode === 'recording' ? `Live notes: ${liveMidi?.tracks[0].notes.length ?? 0}` : midi ? `Tracks: ${midi.tracks.length}` : 'No MIDI loaded'}</p>
            <button onClick={exportScoreAsPDF}>Export as PDF</button>
            <div ref={osmdContainerRef}></div>
        </div>
    );
};

export default ScoreView;
