export interface MidiEvent {
    type: string;
    note?: number; // (0-127)
    velocity?: number;
    time?: number;
    channel?: number;
}
