import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCookies } from 'react-cookie';
import jsPDF from 'jspdf';
import 'svg2pdf.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { Midi } from '@tonejs/midi';
import { Base64 } from 'js-base64';
import WaitingIndicator from './WaitingIndicator';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { useMidi2MusicXMLWorker } from '../modules/midi2musicxml/useMidi2MusicXMLWorker';
import { ClefType } from '../modules/midi2musicxml/types';

interface ScoreViewProps { }

const ScoreView: React.FC<ScoreViewProps> = () => {
    const { t } = useTranslation();
    const [cookies] = useCookies(['color']);
    const osmdContainerRef = useRef<HTMLDivElement>(null);
    const [midi, setMidi] = useState<Midi | null>(null);
    const [liveMidi, setLiveMidi] = useState<Midi | null>(null);
    const liveActiveNotesRef = useRef<Map<number, { startTick: number, velocity: number, startTimeMs?: number }>>(new Map());
    const liveTickRef = useRef<number>(0);
    const lastEventTimeRef = useRef<number | null>(null);
    const [compositionName, setCompositionName] = useState<string>('');
    const [composerName, setComposerName] = useState<string>('');
    const [mode, setMode] = useState<'playback' | 'recording' | null>(null);
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);
    const [currentCompositionId, setCurrentCompositionId] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [selectedClef, setSelectedClef] = useState<ClefType>('piano');

    const osmdRef = useRef<OpenSheetMusicDisplay>();
    const midi2MusicXML = useMidi2MusicXMLWorker();

    // ── Playback cursor ──────────────────────────────────────────────────────
    /** Last playTime (seconds) received from the server via keyboard message. */
    const currentPlayTimeSecondsRef = useRef<number>(0);
    /** @tonejs/midi object — kept in a ref for secondsToTicks() in the cursor loop. */
    const midiObjRef               = useRef<Midi | null>(null);
    const cursorAnimFrameRef       = useRef<number | null>(null);   // rAF handle
    const isPlaybackActiveRef      = useRef<boolean>(false);        // cursor loop guard
    /** Sorted unique startTicks (non-chord notes) — one entry per OSMD cursor step. */
    const noteCursorTicksRef       = useRef<number[]>([]);
    /** Index into noteCursorTicksRef that the OSMD cursor currently sits at. */
    const cursorIndexRef           = useRef<number>(0);
    // ────────────────────────────────────────────────────────────────────────

    /** Stop the cursor animation loop. Does NOT hide the cursor (caller's responsibility). */
    function stopCursorLoop() {
        isPlaybackActiveRef.current = false;
        if (cursorAnimFrameRef.current !== null) {
            cancelAnimationFrame(cursorAnimFrameRef.current);
            cursorAnimFrameRef.current = null;
        }
        cursorIndexRef.current = 0;
    }

    /**
     * Return the current playback tick, derived from the last server-reported
     * playTime (seconds) converted via the full MIDI tempo map.
     * Accurate across all tempo changes and unaffected by user tempo-multiplier.
     */
    function getCurrentTick(): number {
        const midiObj = midiObjRef.current;
        if (!midiObj) return 0;
        return midiObj.header.secondsToTicks(currentPlayTimeSecondsRef.current);
    }

    /**
     * Start the requestAnimationFrame cursor loop.
     * Moves cursor.next() incrementally — never resets during playback.
     * O(1) per frame: just compares currentTick to the next trigger tick.
     */
    function startCursorLoop() {
        stopCursorLoop(); // Cancel any running loop; resets cursorIndexRef
        isPlaybackActiveRef.current = true;

        const osmd = osmdRef.current;
        if (!osmd) return;

        // Position cursor at note 0 and make it visible.
        osmd.cursor.reset();
        osmd.cursor.show();
        cursorIndexRef.current = 0;

        function tick() {
            if (!isPlaybackActiveRef.current) return;

            const currentTick = getCurrentTick();
            const ticks       = noteCursorTicksRef.current;

            // Advance once for each note-boundary that has been passed.
            // Using ticks[cursorIndexRef.current + 1] means: stay on current
            // note until the *next* note's tick has been reached, then step.
            while (
                cursorIndexRef.current < ticks.length - 1 &&
                currentTick >= ticks[cursorIndexRef.current + 1]
            ) {
                osmd!.cursor.next();
                cursorIndexRef.current++;
            }

            cursorAnimFrameRef.current = requestAnimationFrame(tick);
        }

        cursorAnimFrameRef.current = requestAnimationFrame(tick);
    }

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

    async function exportScoreAsMusicXML() {
        const currentMidi = mode === 'recording' ? liveMidi : midi;
        if (!currentMidi) {
            alert('No MIDI data available!');
            return;
        }
        const title = mode === 'recording' ? 'Live Recording' : compositionName;
        const composer = mode === 'recording' ? 'Depinus' : composerName;
        const { xml } = await midi2MusicXML(currentMidi, { title, composer, clef: selectedClef });

        // Create Blob and download
        const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'score'}.musicxml`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // WebSocket Connection
    const webSocket = useDepinusWebSocket({
        name: 'ScoreView',
        onOpen: () => {
            setIsWebSocketReady(true);
        },
        onKeyboardMessage: (_note: any, _velocity: any, playTime?: number) => {
            // Keep current playback position up to date for cursor synchronisation.
            if (playTime !== undefined) {
                currentPlayTimeSecondsRef.current = playTime;
            }
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
                lastEventTimeRef.current = null;
            }
            else if (message.composition && message.composition.compositionId) {
                const newId = message.composition.compositionId;
                if (newId !== currentCompositionId) {
                    //console.log('New composition detected:', newId);
                    setCurrentCompositionId(newId);
                    if (webSocket.sendRpcCall) {
                        console.log('Requesting MIDI data via RPC for new composition...');
                        webSocket.sendRpcCall('GetCurrentMidiData', {});
                    }
                }
            }

            // Playback stopped or ended: reset cursor to note 0
            if (message.isStoppable === false && message.isPlayable === true) {
                currentPlayTimeSecondsRef.current = 0;
                stopCursorLoop();
                if (osmdRef.current && noteCursorTicksRef.current.length > 0) {
                    osmdRef.current.cursor.reset();
                    osmdRef.current.cursor.show();
                }
            }

            // Playback started or resumed: (re)start cursor loop if OSMD is ready.
            // Guard against new-composition messages (those carry compositionId and
            // will trigger a full re-render via GetCurrentMidiData instead).
            if (message.isStoppable === true && message.isPauseable === true &&
                !message.composition?.compositionId) {
                if (osmdRef.current && noteCursorTicksRef.current.length > 0) {
                    startCursorLoop();
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
                        // Time measurement for correct tick calculation
                        const now = performance.now();
                        const pulsesPerQuarterNote = liveMidi.header.ppq || 480;
                        const tempo = (liveMidi.header.tempos && liveMidi.header.tempos.length > 0)
                            ? liveMidi.header.tempos[0].bpm
                            : 120;
                        const msPerQuarter = 60000 / tempo;

                        let tick = liveTickRef.current;
                        if (status === 0x90 && velocity > 0) {
                            // Note-On: remember time
                            liveActiveNotesRef.current.set(note, {
                                startTick: tick,
                                velocity,
                                startTimeMs: now
                            });
                        } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
                            // Note-Off: calculate duration from time difference
                            const active = liveActiveNotesRef.current.get(note);
                            if (active && typeof active.startTimeMs === 'number') {
                                const msSinceOn = now - active.startTimeMs;
                                const durationTicks = Math.round((msSinceOn / msPerQuarter) * pulsesPerQuarterNote);
                                track.addNote({
                                    midi: note,
                                    ticks: active.startTick,
                                    durationTicks: Math.max(1, durationTicks),
                                    velocity: active.velocity / 127,
                                });
                                liveActiveNotesRef.current.delete(note);
                            } else {
                                console.warn(`[LIVE] Note-Off without Note-On: note=${note}`);
                            }
                        }
                        // Increment tick counter for event time (for note time property)
                        if (lastEventTimeRef.current !== null) {
                            const msSinceLast = now - lastEventTimeRef.current;
                            const ticksSinceLast = Math.round((msSinceLast / msPerQuarter) * pulsesPerQuarterNote);
                            liveTickRef.current += ticksSinceLast;
                        }
                        lastEventTimeRef.current = now;
                        setLiveMidi(liveMidi.clone());
                    }
                }
            }
        },
        onRpcResponseMessage: async (message: any) => {
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
                    // Store in ref for secondsToTicks() in cursor loop
                    midiObjRef.current = midiObj;
                    currentPlayTimeSecondsRef.current = 0;
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
        setIsRendering(true);
        stopCursorLoop();
        // Use async IIFE to handle worker call
        (async () => {
            try {
                const { xml, measureTickMap, noteCursorTicks } = await midi2MusicXML(
                    midi,
                    {
                        title: compositionName,
                        composer: composerName,
                        clef: selectedClef
                    });

                // Store tick lists for cursor animation
                noteCursorTicksRef.current = noteCursorTicks;

                // Give browser a frame to update UI
                await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

                if (!osmdRef.current) {
                    osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current!, {
                        drawingParameters: "default",
                        cursorsOptions: [{ type: 0, color: cookies.color ?? '#007ACC', alpha: 0.5, follow: true }]
                    });
                }
                osmdRef.current.clear();

                const loadStart = performance.now();
                await osmdRef.current.load(xml);

                // Give browser a frame before heavy render operation
                await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

                osmdRef.current.render(); // GUI will freeze here because OSMD is sync

                // Give browser time to paint the SVG before state update
                await new Promise(resolve => setTimeout(() => resolve(undefined), 100));
                setIsRendering(false);

                // Start cursor animation loop (resets + shows cursor internally)
                startCursorLoop();
            } catch (error) {
                console.error('Error rendering MIDI:', error);
                setIsRendering(false);
            }
        })();
    }, [midi, compositionName, composerName, selectedClef]);

    // Live recording: display liveMidi as score
    useEffect(() => {
        if (!osmdContainerRef.current) return;
        if (mode !== 'recording') return;
        if (!liveMidi || liveMidi.tracks[0].notes.length === 0) {
            // Clear score
            if (osmdRef.current) osmdRef.current.clear();
            return;
        }
        // Use async IIFE to handle worker call (no isRendering in live mode to prevent flicker)
        (async () => {
            try {
                const { xml } = await midi2MusicXML(
                    liveMidi,
                    {
                        title: 'Live Recording',
                        composer: 'Depinus',
                        clef: selectedClef
                    });

                if (!osmdRef.current) {
                    osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current!, {
                        drawingParameters: "default",
                        cursorsOptions: [{ type: 0, color: cookies.color ?? '#007ACC', alpha: 0.5, follow: true }]
                    });
                }
                osmdRef.current.clear();

                await osmdRef.current.load(xml);
                osmdRef.current.render();
            } catch (error) {
                console.error('Error rendering live MIDI:', error);
            }
        })();
    }, [liveMidi, mode, selectedClef]);

    // Cleanup: stop cursor loop on unmount
    useEffect(() => {
        return () => { stopCursorLoop(); };
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            {isRendering && mode !== 'recording' && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <WaitingIndicator width='4rem' height='2rem' />
                </div>
            )}
            <div style={{ visibility: isRendering ? 'hidden' : 'visible' }}>
                {mode !== 'recording' && (
                    <>
                        <div style={{ marginBottom: '12px' }}>
                            <label htmlFor="clef-select" style={{ marginRight: '10px' }}>{t('Clef')}:</label>
                            <select
                                id="clef-select"
                                value={selectedClef}
                                onChange={e => setSelectedClef(e.target.value as any)}
                            >
                                <option value="piano">{t('Instrument-Piano')}</option>
                                <option value="violin">{t('Instrument-Violin')}</option>
                                <option value="viola">{t('Instrument-Viola')}</option>
                                <option value="cello">{t('Instrument-Cello')}</option>
                            </select>
                        </div>
                        <button onClick={exportScoreAsPDF}>
                            {t('Export PDF')}
                        </button>
                        <button onClick={exportScoreAsMusicXML} style={{ marginLeft: '10px' }}>
                            {t('Export MusicXML')}
                        </button>
                    </>
                )}
            </div>
            <div ref={osmdContainerRef} style={{ visibility: isRendering ? 'hidden' : 'visible' }}></div>
        </div>
    );
};

export default ScoreView;
