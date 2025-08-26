import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import WaitingIndicator from '../WaitingIndicator';
import Modal from 'react-modal';
import { backendUrl } from '../../config';

const UploadComposerDialog = (props) => {
  const [isValid, setIsValid] = useState(false);
  const [imageBlob, setImageBlob] = useState();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (props.open) {
      if (fileInputRef.current) {
        // reset file input
        fileInputRef.current.value = null;
      }
      setImageBlob(undefined);
      setIsValid(false);
    }
  }, [props.open]);

  return (
    <Modal
      isOpen={props.open}
      ariaHideApp={false}
      style={{
        overlay: { zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        content: { left: '10%', right: '10%', top: '10%', bottom: 'auto' }
      }}
    >
      <div className='dialog'>
        <div className='menu-header'>{props.header}</div>
        <div className='dialog-form'>
          <label>{t('FirstName')}:</label>
          <input
            type='text'
            id="firstname"
            size='1'
            defaultValue={props.composer ? props.composer.firstname : ''}
            onChange={(event) => {
              setIsValid(document.getElementById('surname').value.length > 0);
            }}
          />
          <label>{t('Surname')}:</label>
          <input
            type='text'
            id="surname"
            size='1'
            defaultValue={props.composer ? props.composer.surname : ''}
            onChange={(event) => {
              setIsValid(event.target.value.length > 0);
            }}
          />
          <div style={{ gridColumn: '1/3' }}>
            <img
              id='composerImage'
              alt='Composer'
              height='96px'
              src={
                props.composer
                  ? backendUrl +
                  '/archive/composerImage?composerId=' + props.composer.id
                  : backendUrl + '/archive/composerImage'
              }
            />
          </div>
          <input
            ref={fileInputRef}
            style={{ gridColumn: '1/3' }}
            type='file'
            id="imagefile"
            accept=".jpg,.jpeg,.png,.gif"
            onChange={(event) => {
              const file = event.target.files[0];
              setImageBlob(file);
              document.getElementById('composerImage').src = URL.createObjectURL(file);
              setIsValid(true);
            }}
          />
        </div>
        <div>
          <button
            disabled={!isValid || uploading}
            onClick={() => {
              setUploading(true);
              props.uploadComposer(
                document.getElementById('firstname').value,
                document.getElementById('surname').value,
                imageBlob
              )
                .then(() => {
                  setUploading(false);
                  props.finished();
                })
                .catch((error) => {
                  setUploading(false);
                  props.finished(error);
                });
            }}
          >
            {t('Save')}
          </button>
          {uploading ? <WaitingIndicator width='4rem' height='2rem' /> : null}
          <button
            disabled={uploading}
            style={{ float: 'right' }}
            onClick={() => {
              props.finished();
            }}
          >
            {t('Cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default UploadComposerDialog;
