import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import 'svg2pdf.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { midiEventsToMusicXML } from '../modules/Midi2MusicXML/index';
import { MidiEvent } from '../modules/Midi2MusicXML/types';
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
        // Extract MIDI events (notes + meta events from header)
        const midiEvents: MidiEvent[] = [];
        // Note events
        midi.tracks.forEach(track => {
            track.notes.forEach(note => {
                midiEvents.push({
                    type: 'note_on',
                    note: note.midi,
                    velocity: note.velocity ? Math.round(note.velocity * 127) : 64,
                    time: note.ticks,
                });
            });
        });
        // Tempo events
        if (midi.header.tempos && midi.header.tempos.length > 0) {
            midi.header.tempos.forEach(tempo => {
                midiEvents.push({
                    type: 'set_tempo',
                    microsecondsPerQuarterNote: Math.round(60000000 / tempo.bpm)
                } as any);
            });
        }
        // Copyright event (from meta)
        if (Array.isArray(midi.header.meta)) {
            const copyrightMeta = midi.header.meta.find(e => e.type === 'copyright' && typeof e.text === 'string');
            if (copyrightMeta) {
                midiEvents.push({
                    type: 'copyright',
                    text: copyrightMeta.text
                } as any);
            }
        }
        // Track/piece name
        if (midi.header.name) {
            midiEvents.push({
                type: 'track_name',
                text: midi.header.name
            } as any);
        }
        const xml = midiEventsToMusicXML(midiEvents, compositionName, composerName);
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
            const midiEvents: MidiEvent[] = [];
            liveMidiEvents.forEach(bytes => {
                // Very simple heuristic: status byte 0x90 = note-on, 0x80 = note-off
                if (bytes.length >= 3 && (bytes[0] & 0xf0) === 0x90 && bytes[2] > 0) {
                    midiEvents.push({
                        type: 'note_on',
                        note: bytes[1],
                        velocity: bytes[2],
                        time: 0 // Timing information is missing in the live stream
                    });
                }
            });
            // Generate MusicXML
            const xml = midiEventsToMusicXML(midiEvents, 'Live Recording', '');
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
