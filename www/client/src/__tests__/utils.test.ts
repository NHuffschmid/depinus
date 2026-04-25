import { formattedPlaytime } from '../utils';

describe('formattedPlaytime', () => {
    it('returns "0:00" for zero or negative seconds', () => {
        expect(formattedPlaytime(0)).toBe('0:00');
        expect(formattedPlaytime(-5)).toBe('0:00');
    });

    it('formats seconds below one minute', () => {
        expect(formattedPlaytime(5)).toBe('0:05');
        expect(formattedPlaytime(59)).toBe('0:59');
    });

    it('formats minutes and seconds', () => {
        expect(formattedPlaytime(60)).toBe('1:00');
        expect(formattedPlaytime(90)).toBe('1:30');
        expect(formattedPlaytime(3599)).toBe('59:59');
    });

    it('formats hours, minutes and seconds', () => {
        expect(formattedPlaytime(3600)).toBe('1:00:00');
        expect(formattedPlaytime(3661)).toBe('1:01:01');
        expect(formattedPlaytime(7322)).toBe('2:02:02');
    });
});
