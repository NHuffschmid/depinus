export interface MidiEvent {
    type: string;
    note?: number;
    velocity?: number;
    time?: number;
    channel?: number;
    text?: string;
}
