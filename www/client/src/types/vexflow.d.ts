declare module 'vexflow' {
    export class Renderer {
        static Backends: {
            SVG: number;
            CANVAS: number;
        };
        constructor(element: HTMLElement, backend: number);
        resize(width: number, height: number): void;
        getContext(): any;
    }
    
    export class Stave {
        constructor(x: number, y: number, width: number);
        addClef(clef: string): this;
        addTimeSignature(timeSignature: string): this;
        setContext(context: any): this;
        draw(): void;
    }
    
    export class StaveNote {
        constructor(noteStruct: { 
            keys: string[]; 
            duration: string;
            clef?: string;
        });
    }
    
    export class Voice {
        constructor(options: { num_beats: number; beat_value: number });
        addTickables(notes: any[]): this;
        draw(context: any, stave: Stave): void;
    }
    
    export class Formatter {
        joinVoices(voices: Voice[]): this;
        format(voices: Voice[], width: number): this;
    }
}
