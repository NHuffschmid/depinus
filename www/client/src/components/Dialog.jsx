import React from 'react';
import Modal from 'react-modal';

export default function Dialog(props) {

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
