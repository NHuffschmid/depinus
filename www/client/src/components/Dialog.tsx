import React from 'react';
import Modal from 'react-modal';

interface DialogProps {
  open: boolean;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  header?: React.ReactNode;
  content?: React.ReactNode;
  buttons?: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = (props) => {
  return (
    <Modal
      isOpen={ props.open }
      ariaHideApp={ false }
      style={{
        overlay: { zIndex: 2000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        content: { left: props.left, right: props.right, top: props.top, bottom: props.bottom }
      }}
    >
      <div className='dialog'>
        <div className='menu-header'>{props.header}</div>
        <div style={{ overflowY: 'auto' }}>{props.content}</div>
        <div>{props.buttons}</div>
      </div>
    </Modal>
  )
}

export default Dialog;
