import React from 'react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import WaitingIndicator from '../WaitingIndicator';
import Modal from 'react-modal';

const UploadCompositionDialog = (props) => {

  const [title, setTitle] = useState(props.title);
  const [midifile, setMidifile] = useState();
  const [uploading, setUploading] = useState(false);

  const { t } = useTranslation();

  return (
    <Modal
      isOpen={props.open}
      ariaHideApp={ false }
      style={{
        overlay: { zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        content: { left: '10%', right: '10%', top: '10%', bottom: 'auto' }
      }}
    >
      <div className='dialog'>
        <div className='menu-header'>{props.header}</div>
        <div className='dialog-form'>

          <label>{t('Title')}:</label>
          <input
            type='text'
            name="title"
            defaultValue={title}
            onChange={(event) => { setTitle(event.target.value); }}
          />
          <input
            style={{ gridColumn: '1 / 3' }}
            type='file'
            name="midifile"
            accept=".mid,.midi"
            onChange={(event) => { setMidifile(event.target.files[0]); }} />
        </div>
        <div>
          <button
            disabled={(title === '') || (!midifile && props.midifileIsMandatory) || uploading}
            onClick={() => {
              setUploading(true); // start waiting indication
              props.upload(title, midifile)
                .then(() => {
                  setUploading(false); // stop waiting indication
                  props.finished();
                })
                .catch((error) => {
                  setUploading(false); // stop waiting indication
                  props.finished(error);
                })
                .finally(() => {
                  setTitle(props.title);
                  setMidifile();
                });
            }}>
            {t('Save')}
          </button>
          {uploading ? <WaitingIndicator width='4rem' height='2rem' /> : null}
          <button
            disabled={uploading}
            style={{ float: 'right' }}
            onClick={() => { props.finished(); }}>
            {t('Cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default UploadCompositionDialog;
