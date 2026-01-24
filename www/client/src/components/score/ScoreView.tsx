import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';

interface ScoreViewProps {
    // Placeholder für zukünftige Props
}

const ScoreView: React.FC<ScoreViewProps> = (props) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Container leeren
        containerRef.current.innerHTML = '';

        // VexFlow Renderer
        const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
        renderer.resize(500, 200);
        const context = renderer.getContext();

        // Notensystem
        const stave = new Stave(10, 40, 400);
        stave.addClef('treble').addTimeSignature('4/4');
        stave.setContext(context).draw();

        // Noten
        const notes = [
            new StaveNote({ keys: ['c/4'], duration: 'q' }),
            new StaveNote({ keys: ['d/4'], duration: 'q' }),
            new StaveNote({ keys: ['e/4'], duration: 'q' }),
            new StaveNote({ keys: ['f/4'], duration: 'q' }),
        ];

        const voice = new Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables(notes);

        new Formatter().joinVoices([voice]).format([voice], 350);
        voice.draw(context, stave);

    }, []);

    return (
        <div>
            <h2>VexFlow Test</h2>
            <div ref={containerRef}></div>
        </div>
    );
};

export default ScoreView;
