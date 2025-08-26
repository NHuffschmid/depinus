
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Key from '../src/Key';

describe('Key component', () => {
  it('renders a white key', () => {
    const { container } = render(
      <Key note={60} isPressed={false} setPressed={() => {}} />
    );
    expect(container.firstChild).toHaveClass('ivory');
  });

  it('renders a black key', () => {
    const { container } = render(
      <Key note={61} isPressed={false} setPressed={() => {}} />
    );
    expect(container.firstChild).toHaveClass('ebony');
  });

  it('applies pressed color when pressed', () => {
    const { container } = render(
      <Key note={60} isPressed={true} setPressed={() => {}} pressedColor="red" />
    );
    expect(container.firstChild).toHaveStyle('background: red');
  });

  it('calls setPressed on mouse events', () => {
    const setPressed = vi.fn();
    const { container } = render(
      <Key note={60} isPressed={false} setPressed={setPressed} />
    );
    fireEvent.mouseDown(container.firstChild);
    expect(setPressed).toHaveBeenCalledWith(true);
    fireEvent.mouseUp(container.firstChild);
    expect(setPressed).toHaveBeenCalledWith(false);
    fireEvent.mouseLeave(container.firstChild);
    expect(setPressed).toHaveBeenCalledWith(false);
  });
});
