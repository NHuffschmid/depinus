import { useRef, useState } from 'react';
import { useCookies } from 'react-cookie';
import useDepinusWebSocket, { DepinusInfoMessage } from './useDepinusWebsocket';
import { useKeyDetection, KeyDetectionResult } from './useKeyDetection';
import { type CircleOfFifthsMode } from '../components/CircleOfFifthsSelector';

export interface CircleOfFifthsResult extends KeyDetectionResult {
    show: boolean;
}

/**
 * Encapsulates all CircleOfFifths visibility and key-detection logic.
 *
 * - Reads the `circleOfFifths` cookie (never / idle / always).
 * - Subscribes to `playState` WebSocket messages to track whether playback or
 *   recording is active.
 * - Gates key detection: notes are only fed into `useKeyDetection` while the
 *   CircleOfFifths is actually visible, preventing accumulation during playback.
 * - Clears `pressedNotes` in the same React batch as `isStoppable`, eliminating
 *   the race condition between the playState message and the keyboard-reset message.
 */
export function useCircleOfFifths(
    pressedNotes: Set<number>,
    pressedNotesRef: React.MutableRefObject<Set<number>>,
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

    const detection = useKeyDetection(show ? pressedNotes : emptyNotes);
    return { show, ...detection };
}
