import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Cookie mock – start with the default 'idle' mode.
const mockCookies: Record<string, string> = { circleOfFifths: 'idle' };
vi.mock('react-cookie', () => ({
    useCookies: () => [mockCookies],
}));

// WebSocket mock – captures the onInfoMessage callback so tests can fire messages.
let capturedOnInfoMessage: ((msg: any) => void) | undefined;
vi.mock('../../custom-hooks/useDepinusWebsocket', () => ({
    default: vi.fn((opts: any) => {
        capturedOnInfoMessage = opts.onInfoMessage;
        return {};
    }),
}));

import { useCircleOfFifths } from '../../custom-hooks/useCircleOfFifths';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the three arguments useCircleOfFifths expects from App. */
function makeArgs(notes: number[] = []) {
    const notesSet = new Set(notes);
    const ref = { current: new Set(notes) };
    const setter = vi.fn();
    return { notesSet, ref, setter };
}

/** Fire a playState WebSocket message. */
function firePlayState(isStoppable: boolean) {
    act(() => {
        capturedOnInfoMessage?.({ infoType: 'playState', isStoppable });
    });
}

// ── Visibility tests ──────────────────────────────────────────────────────────

describe('useCircleOfFifths – visibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnInfoMessage = undefined;
    });

    it('shows when mode is "always" regardless of play state', () => {
        mockCookies.circleOfFifths = 'always';
        const { notesSet, ref, setter } = makeArgs();
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));

        expect(result.current.show).toBe(true);

        firePlayState(true); // playback active
        expect(result.current.show).toBe(true);
    });

    it('hides when mode is "never"', () => {
        mockCookies.circleOfFifths = 'never';
        const { notesSet, ref, setter } = makeArgs();
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.show).toBe(false);
    });

    it('shows in idle mode when nothing is playing', () => {
        mockCookies.circleOfFifths = 'idle';
        const { notesSet, ref, setter } = makeArgs();
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.show).toBe(true);
    });

    it('hides in idle mode when playback starts (isStoppable=true)', () => {
        mockCookies.circleOfFifths = 'idle';
        const { notesSet, ref, setter } = makeArgs();
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));

        firePlayState(true);
        expect(result.current.show).toBe(false);
    });

    it('shows again in idle mode after playback stops (isStoppable=false)', () => {
        mockCookies.circleOfFifths = 'idle';
        const { notesSet, ref, setter } = makeArgs();
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));

        firePlayState(true);
        expect(result.current.show).toBe(false);

        firePlayState(false);
        expect(result.current.show).toBe(true);
    });

    it('clears pressedNotes when playback stops', () => {
        mockCookies.circleOfFifths = 'idle';
        const { notesSet, ref, setter } = makeArgs([60, 64, 67]);
        renderHook(() => useCircleOfFifths(notesSet, ref, setter));

        firePlayState(true);
        firePlayState(false);

        expect(ref.current.size).toBe(0);
        expect(setter).toHaveBeenCalledWith(new Set());
    });

    it('ignores non-playState info messages', () => {
        mockCookies.circleOfFifths = 'idle';
        const { notesSet, ref, setter } = makeArgs();
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));

        act(() => {
            capturedOnInfoMessage?.({ infoType: 'settings', tempo: 120 });
        });

        expect(result.current.show).toBe(true); // unchanged
        expect(setter).not.toHaveBeenCalled();
    });
});

// ── Key detection tests ───────────────────────────────────────────────────────
// These tests exercise the key detection logic that was previously in
// useKeyDetection. Notes are supplied directly; the CoF is set to "always"
// so gating never interferes with the test input.

describe('useCircleOfFifths – key detection', () => {
    beforeEach(() => {
        mockCookies.circleOfFifths = 'always';
        vi.clearAllMocks();
    });

    it('returns empty arrays when no notes are pressed', () => {
        const { notesSet, ref, setter } = makeArgs([]);
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.selectedMajorKeys).toEqual([]);
        expect(result.current.selectedMinorKeys).toEqual([]);
        expect(result.current.dominantSeventhMajorKeys).toEqual([]);
    });

    it('detects C major triad (C-E-G = MIDI 60-64-67)', () => {
        // C major = index 0 on the circle of fifths
        const { ref, setter } = makeArgs();
        const notesSet = new Set([60, 64, 67]);
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.selectedMajorKeys).toContain(0);
    });

    it('detects G major triad (G-B-D = MIDI 67-71-74)', () => {
        // G major = index 1 on the circle of fifths
        const { ref, setter } = makeArgs();
        const notesSet = new Set([67, 71, 74]);
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.selectedMajorKeys).toContain(1);
    });

    it('detects A minor triad (A-C-E = MIDI 69-60-64)', () => {
        // A minor = index 0 on the minor circle
        const { ref, setter } = makeArgs();
        const notesSet = new Set([69, 60, 64]);
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.selectedMinorKeys).toContain(0);
    });

    it('detects G7 dominant seventh chord (G-B-D-F = MIDI 67-71-74-65)', () => {
        // G7 = index 1 (G position) on the circle
        const { ref, setter } = makeArgs();
        const notesSet = new Set([67, 71, 74, 65]);
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.dominantSeventhMajorKeys).toContain(1);
    });

    it('does not report dominant seventh when a tonic triad also matches', () => {
        // C major triad: no dom7 should fire
        const { ref, setter } = makeArgs();
        const notesSet = new Set([60, 64, 67]);
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.dominantSeventhMajorKeys).toEqual([]);
    });

    it('returns empty when only 1 or 2 notes are pressed (below chord threshold)', () => {
        const { ref, setter } = makeArgs();
        const notesSet = new Set([60, 64]); // only 2 pitch classes
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));
        expect(result.current.selectedMajorKeys).toEqual([]);
        expect(result.current.selectedMinorKeys).toEqual([]);
        expect(result.current.dominantSeventhMajorKeys).toEqual([]);
    });

    it('gates key detection in idle mode when playback is active', () => {
        mockCookies.circleOfFifths = 'idle';
        const ref = { current: new Set<number>() };
        const setter = vi.fn();

        const { result, rerender } = renderHook(
            ({ notes }: { notes: Set<number> }) => useCircleOfFifths(notes, ref, setter),
            { initialProps: { notes: new Set<number>() } },
        );

        // Trigger playback first → show becomes false
        firePlayState(true);
        expect(result.current.show).toBe(false);

        // Notes arrive while hidden – should be gated (not detected)
        act(() => { rerender({ notes: new Set([60, 64, 67]) }); });

        expect(result.current.selectedMajorKeys).toEqual([]);
        expect(result.current.selectedMinorKeys).toEqual([]);
    });

    it('detects C major in "always" mode even during playback', () => {
        mockCookies.circleOfFifths = 'always';
        const { ref, setter } = makeArgs();
        const notesSet = new Set([60, 64, 67]);
        const { result } = renderHook(() => useCircleOfFifths(notesSet, ref, setter));

        firePlayState(true); // does not affect "always"

        expect(result.current.selectedMajorKeys).toContain(0);
    });
});
