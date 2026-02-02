// MusicXML Model Types
export type Note = {
    step: string;
    alter?: number;
    octave: number;
    duration: number;
    type: string;
    isRest?: boolean;
    tick?: number;
};

export type Measure = {
    notes: Note[];
    section: Section;
};

export type Section = {
    measures: Measure[];
    attributes?: {
        divisions?: number;
        key?: string;
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
    sections: Section[];
};

export type Score = {
    title?: string;
    composer?: string;
    copyright?: string;
    parts: Part[];
};

