import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import Modal from 'react-modal';
import { backendUrl } from '../../config';
import WaitingIndicator from '../WaitingIndicator';

const BASIC_PITCH_MODEL_URL = 'https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json';
const TARGET_SAMPLE_RATE = 22050;

interface Composer {
    id: number;
    firstname: string;
    surname: string;
}

interface ImportAudioDialogProps {
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

const ImportAudioDialog: React.FC<ImportAudioDialogProps> = (props) => {
    const [title, setTitle] = useState('');
    const [audioFile, setAudioFile] = useState<File | undefined>();
    const [composerId, setComposerId] = useState<number | undefined>(props.composerId);
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [composers, setComposers] = useState<Composer[]>([]);
    const { t } = useTranslation();

    useEffect(() => {
        if (props.open) {
            fetch(backendUrl + '/archive/composers')
                .then(res => res.json())
                .then(data => setComposers(data))
                .catch(() => setComposers([]));
            setTitle('');
            setAudioFile(undefined);
            setComposerId(props.composerId);
            setConverting(false);
            setProgress(0);
            setStatusMessage('');
        }
    }, [props.open, props.composerId]);

    const convertAndUpload = async () => {
        if (!audioFile || !title) return;

        setConverting(true);
        setProgress(0);

        try {
            // 1. Decode audio file
            setStatusMessage(t('Decoding audio...'));
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioCtx = new AudioContext();
            let audioBuffer: AudioBuffer;
            try {
                audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } finally {
                audioCtx.close();
            }

            // 2. Resample to 22050 Hz mono
            setStatusMessage(t('Resampling audio...'));
            const resampledBuffer = await resampleToMono(audioBuffer);

            // 3. Load Basic Pitch and run inference (lazy import to keep initial bundle small)
            setStatusMessage(t('Loading transcription model...'));
            const {
                BasicPitch,
                noteFramesToTime,
                addPitchBendsToNoteEvents,
                outputToNotesPoly,
            } = await import('@spotify/basic-pitch');

            const basicPitch = new BasicPitch(BASIC_PITCH_MODEL_URL);

            // 4. Run inference
            setStatusMessage(t('Transcribing audio...'));
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
                (p: number) => {
                    setProgress(p);
                },
            );

            // 5. Convert raw model output to timed note events
            setStatusMessage(t('Generating MIDI...'));
            const noteEvents = outputToNotesPoly(frames, onsets, 0.5, 0.3, 5);
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
            setStatusMessage(t('Uploading...'));
            await props.upload(title, midiFile, composerId);
            props.finished();
        } catch (error: any) {
            props.finished(error);
        } finally {
            setConverting(false);
        }
    };

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
            <div className='menu-header'>{t('Import audio file to archive')}</div>
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
                    disabled={converting}
                />
                <label>{t('Composer')}:</label>
                <select
                    value={composerId ?? ''}
                    onChange={(e) =>
                        setComposerId(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                    disabled={converting}
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
                    accept='.mp3,.wav,.ogg,.flac,.aac,.m4a'
                    disabled={converting}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            if (!title) {
                                setTitle(file.name.replace(/\.[^.]+$/, ''));
                            }
                            setAudioFile(file);
                        }
                    }}
                />
                {converting && (
                    <div style={{ gridColumn: '1 / 3' }}>
                        <div style={{ marginBottom: '0.25rem' }}>{statusMessage}</div>
                        <progress value={progress} max={1} style={{ width: '100%' }} />
                    </div>
                )}
            </div>
            <div>
                <button
                    disabled={!title || !audioFile || converting}
                    onClick={convertAndUpload}
                >
                    {t('Convert and import')}
                </button>
                {converting ? <WaitingIndicator width='4rem' height='2rem' /> : null}
                <button
                    disabled={converting}
                    style={{ float: 'right' }}
                    onClick={() => props.finished()}
                >
                    {t('Cancel')}
                </button>
            </div>
        </div>,
    );
};

export default ImportAudioDialog;
