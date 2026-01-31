// MusicXML Model Types
export type Note = {
    step: string;
    alter?: number;
    octave: number;
    duration: number;
    type: string;
};

export type Measure = {
    notes: Note[];
    attributes?: {
        divisions?: number;
        key?: number;
        time?: { beats: number; beatType: number };
        clef?: { sign: string; line: number };
    };
    sound?: {
        tempo: number;
    };
    direction?: {
        tempo: number;
        beatUnit?: string;
    };
};

export type Part = {
    id: string;
    measures: Measure[];
};

export type Score = {
    title?: string;
    composer?: string;
    copyright?: string;
    parts: Part[];
};

