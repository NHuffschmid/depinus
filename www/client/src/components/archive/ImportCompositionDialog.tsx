// This file uses Basic Pitch (https://github.com/spotify/basic-pitch) for audio-to-MIDI conversion.
// Basic Pitch is licensed under the Apache License 2.0.
// Copyright 2022 Spotify AB.

import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import Modal from 'react-modal';
import { useCookies } from 'react-cookie';
import { backendUrl } from '../../config';
import WaitingIndicator from '../WaitingIndicator';
import { KeyboardProgressBar } from '../react-piano-keyboard/src';

const BASIC_PITCH_MODEL_URL = 'https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json';
const TARGET_SAMPLE_RATE = 22050;
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a']);

interface Composer {
    id: number;
    firstname: string;
    surname: string;
}

interface ImportCompositionDialogProps {
    open: boolean;
    composerId?: number;
    upload: (title: string, midifile: File, composerId?: number) => Promise<void>;
    finished: (error?: any) => void;
}

interface NoteEventTime {
    startTimeSeconds: number;
    durationSeconds: number;
    pitchMidi: number;
    amplitude: number;
}

function buildMidiFile(notes: NoteEventTime[], bpm = 120): Uint8Array {
    const TICKS_PER_BEAT = 480;
    const microsecondsPerBeat = Math.round(60_000_000 / bpm);
    const secondsToTicks = (s: number) => Math.round(s * TICKS_PER_BEAT * bpm / 60);

    function varLen(n: number): number[] {
        if (n < 0x80) return [n];
        const bytes: number[] = [];
        bytes.unshift(n & 0x7F);
        n >>= 7;
        while (n > 0) { bytes.unshift((n & 0x7F) | 0x80); n >>= 7; }
        return bytes;
    }

    interface MidiEvent { tick: number; data: number[]; }
    const events: MidiEvent[] = [];

    // Tempo meta event
    events.push({ tick: 0, data: [0xFF, 0x51, 0x03,
        (microsecondsPerBeat >> 16) & 0xFF,
        (microsecondsPerBeat >> 8) & 0xFF,
        microsecondsPerBeat & 0xFF] });

    for (const note of notes) {
        const vel = Math.max(1, Math.min(127, Math.round(note.amplitude * 127)));
        events.push({ tick: secondsToTicks(note.startTimeSeconds), data: [0x90, note.pitchMidi & 0x7F, vel] });
        events.push({ tick: secondsToTicks(note.startTimeSeconds + note.durationSeconds), data: [0x80, note.pitchMidi & 0x7F, 0] });
    }

    events.sort((a, b) => a.tick - b.tick || a.data[0] - b.data[0]);

    const trackData: number[] = [];
    let prevTick = 0;
    for (const ev of events) {
        trackData.push(...varLen(ev.tick - prevTick));
        trackData.push(...ev.data);
        prevTick = ev.tick;
    }
    trackData.push(0x00, 0xFF, 0x2F, 0x00); // End of track

    const len = trackData.length;
    return new Uint8Array([
        // MThd
        0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, // format 0
        0x00, 0x01, // 1 track
        (TICKS_PER_BEAT >> 8) & 0xFF, TICKS_PER_BEAT & 0xFF,
        // MTrk
        0x4D, 0x54, 0x72, 0x6B,
        (len >> 24) & 0xFF, (len >> 16) & 0xFF, (len >> 8) & 0xFF, len & 0xFF,
        ...trackData,
    ]);
}

async function resampleToMono(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    const length = Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE);
    const offlineCtx = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    return await offlineCtx.startRendering();
}

const ImportCompositionDialog: React.FC<ImportCompositionDialogProps> = (props) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | undefined>();
    const [isAudioFile, setIsAudioFile] = useState(false);
    const [composerId, setComposerId] = useState<number | undefined>(props.composerId);
    const [converting, setConverting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [composers, setComposers] = useState<Composer[]>([]);
    const { t } = useTranslation();
    const [cookies] = useCookies(['color']);

    useEffect(() => {
        if (props.open) {
            fetch(backendUrl + '/archive/composers')
                .then(res => res.json())
                .then(data => setComposers(data))
                .catch(() => setComposers([]));
            setTitle('');
            setFile(undefined);
            setIsAudioFile(false);
            setComposerId(props.composerId);
            setConverting(false);
            setUploading(false);
            setProgress(0);
            setIsTranscribing(false);
        }
    }, [props.open, props.composerId]);

    const onFileSelected = (selectedFile: File | undefined) => {
        setFile(selectedFile);
        if (selectedFile) {
            const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
            setIsAudioFile(AUDIO_EXTENSIONS.has(ext));
            if (!title) {
                setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
            }
        } else {
            setIsAudioFile(false);
        }
    };

    const importFile = async () => {
        if (!file || !title) return;
        if (isAudioFile) {
            await convertAndUpload();
        } else {
            setUploading(true);
            try {
                await props.upload(title, file, composerId);
                props.finished();
            } catch (error: any) {
                props.finished(error);
            } finally {
                setUploading(false);
            }
        }
    };

    const convertAndUpload = async () => {
        if (!file || !title) return;
        setConverting(true);
        setProgress(0);
        try {
            // 1. Decode audio file
            const arrayBuffer = await file.arrayBuffer();
            const audioCtx = new AudioContext();
            let audioBuffer: AudioBuffer;
            try {
                audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } finally {
                audioCtx.close();
            }

            // 2. Resample to 22050 Hz mono
            const resampledBuffer = await resampleToMono(audioBuffer);

            // 3. Load Basic Pitch and run inference (lazy import to keep initial bundle small)
            const {
                BasicPitch,
                noteFramesToTime,
                addPitchBendsToNoteEvents,
                outputToNotesPoly,
            } = await import('@spotify/basic-pitch');

            const basicPitch = new BasicPitch(BASIC_PITCH_MODEL_URL);

            // 4. Run inference
            setIsTranscribing(true);
            const frames: number[][] = [];
            const onsets: number[][] = [];
            const contours: number[][] = [];

            await basicPitch.evaluateModel(
                resampledBuffer,
                (f: number[][], o: number[][], c: number[][]) => {
                    frames.push(...f);
                    onsets.push(...o);
                    contours.push(...c);
                },
                (p: number) => { setProgress(p); },
            );
            setIsTranscribing(false);

            // 5. Convert raw model output to timed note events
            const noteEvents = outputToNotesPoly(frames, onsets, 0.6, 0.35, 7, false);
            const noteEventsWithBends = addPitchBendsToNoteEvents(contours, noteEvents);
            const notes = noteFramesToTime(noteEventsWithBends);

            // 6. Build MIDI file
            const midiBytes = buildMidiFile(notes);
            const midiFile = new File(
                [new Blob([midiBytes.buffer as ArrayBuffer], { type: 'audio/midi' })],
                `${title}.mid`,
                { type: 'audio/midi' },
            );

            // 7. Upload via existing mechanism
            await props.upload(title, midiFile, composerId);
            props.finished();
        } catch (error: any) {
            props.finished(error);
        } finally {
            setConverting(false);
            setIsTranscribing(false);
        }
    };

    const busy = converting || uploading;

    return React.createElement(
        Modal as any,
        {
            isOpen: props.open,
            ariaHideApp: false,
            style: {
                overlay: { zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                content: { left: '10%', right: '10%', top: '10%', bottom: 'auto' },
            },
        },
        <div className='dialog'>
            <div className='menu-header'>{t('Import file to archive')}</div>
            <div
                className='dialog-form'
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '0.5rem',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                }}
            >
                <label>{t('Title')}:</label>
                <input
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                    disabled={busy}
                />
                <label>{t('Composer')}:</label>
                <select
                    value={composerId ?? ''}
                    onChange={(e) => setComposerId(e.target.value ? parseInt(e.target.value) : undefined)}
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                    disabled={busy}
                >
                    {composers.map((composer) => (
                        <option key={composer.id} value={composer.id}>
                            {composer.firstname} {composer.surname}
                        </option>
                    ))}
                </select>
                <input
                    style={{
                        gridColumn: '1 / 3',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                    }}
                    type='file'
                    accept='.mid,.midi,.mp3,.wav,.ogg,.flac,.aac,.m4a'
                    disabled={busy}
                    onChange={(e) => onFileSelected(e.target.files?.[0])}
                />
                {converting && isTranscribing && (
                    <div style={{ gridColumn: '1 / 3' }}>
                        <div style={{ marginBottom: '0.25rem' }}>{t('Converting audio to MIDI...')}</div>
                        <KeyboardProgressBar value={progress} max={1} color={cookies.color} style={{ width: '100%' }} />
                    </div>
                )}
            </div>
            <div>
                <button
                    disabled={!title || !file || busy}
                    onClick={importFile}
                >
                    {isAudioFile ? t('Convert and import') : t('Save')}
                </button>
                {busy ? <WaitingIndicator width='4rem' height='2rem' /> : null}
                <button
                    disabled={busy}
                    style={{ float: 'right' }}
                    onClick={() => props.finished()}
                >
                    {t('Cancel')}
                </button>
            </div>
        </div>,
    );
};

export default ImportCompositionDialog;
