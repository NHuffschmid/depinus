import { useRef, useState } from 'react';
import { MutableRefObject } from 'react';
import { useCookies } from 'react-cookie';
import useDepinusWebSocket, { DepinusInfoMessage } from './useDepinusWebsocket';
import { type CircleOfFifthsMode } from '../components/CircleOfFifthsSelector';
import { useCircleOfFifthsDetection, type CircleOfFifthsDetectionResult } from '../components/react-circle-of-fifths/src';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CircleOfFifthsResult extends CircleOfFifthsDetectionResult {
    /** Whether the CircleOfFifths should be rendered. */
    show: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Encapsulates all CircleOfFifths visibility and key-detection logic.
 *
 * - Reads the `circleOfFifths` cookie (never / idle / always).
 * - Subscribes to `playState` WebSocket messages to track whether playback or
 *   recording is active.
 * - Gates key detection: notes are only fed into the detection logic while the
 *   CircleOfFifths is actually visible, preventing accumulation during playback.
 * - Clears `pressedNotes` in the same React batch as `isStoppable`, eliminating
 *   the race condition between the playState message and the keyboard-reset message.
 *
 * Key detection is delegated to `useCircleOfFifthsDetection` from the
 * react-circle-of-fifths library.
 */
export function useCircleOfFifths(
    pressedNotes: Set<number>,
    pressedNotesRef: MutableRefObject<Set<number>>,
    setPressedNotes: (notes: Set<number>) => void,
): CircleOfFifthsResult {
    const [cookies] = useCookies(['circleOfFifths']);
    const [isStoppable, setIsStoppable] = useState(false);
    const emptyNotes = useRef(new Set<number>()).current;

    const mode: CircleOfFifthsMode = (cookies.circleOfFifths as CircleOfFifthsMode) || 'idle';
    const show = mode === 'always' || (mode === 'idle' && !isStoppable);

    useDepinusWebSocket({
        name: 'useCircleOfFifths',
        onInfoMessage: (message: DepinusInfoMessage): void => {
            if (message.infoType === 'playState' && message.isStoppable !== undefined) {
                if (!message.isStoppable) {
                    // Batch both state updates so that the first render with
                    // show=true already sees an empty pressedNotes set.
                    pressedNotesRef.current.clear();
                    setPressedNotes(new Set());
                }
                setIsStoppable(message.isStoppable);
            }
        },
    });

    // Only feed pressed notes into key detection while the CircleOfFifths is
    // visible. This prevents accumulation during playback (idle mode) and
    // eliminates flicker when it becomes visible again.
    const activeNotes = show ? pressedNotes : emptyNotes;

    const detection = useCircleOfFifthsDetection(activeNotes);

    return { show, ...detection };
}
