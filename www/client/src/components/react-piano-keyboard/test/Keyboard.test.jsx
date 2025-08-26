
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Keyboard from '../src/Keyboard';

describe('Keyboard component', () => {
  it('renders without crashing', () => {
    render(<Keyboard from={21} to={108} />);
  });

  it('throws error for invalid range', () => {
    expect(() => render(<Keyboard from={10} to={108} />)).toThrow();
    expect(() => render(<Keyboard from={21} to={121} />)).toThrow();
    expect(() => render(<Keyboard from={50} to={20} />)).toThrow();
  });

  it('renders correct number of keys', () => {
    const from = 60, to = 72;
    const { container } = render(<Keyboard from={from} to={to} />);
    // 13 notes in range, 8 white keys
    expect(container.querySelectorAll('.ivory').length).toBe(8);
    expect(container.querySelectorAll('.ebony').length).toBe(5);
  });

  it('calls onKeyDown and onKeyUp when key is pressed/released', () => {
    const onKeyDown = vi.fn();
    const onKeyUp = vi.fn();
    const from = 60, to = 61;
    const { container } = render(
      <Keyboard from={from} to={to} onKeyDown={onKeyDown} onKeyUp={onKeyUp} />
    );
    const whiteKey = container.querySelector('.ivory');
    fireEvent.mouseDown(whiteKey);
    expect(onKeyDown).toHaveBeenCalledWith(60);
    fireEvent.mouseUp(whiteKey);
    expect(onKeyUp).toHaveBeenCalledWith(60);
  });

  it('supports ref methods setKeyPressed and reset', () => {
    const ref = React.createRef();
    render(<Keyboard ref={ref} from={60} to={61} />);
    expect(ref.current).toBeDefined();
    ref.current.setKeyPressed(60, 127);
    ref.current.reset();
  });
});
