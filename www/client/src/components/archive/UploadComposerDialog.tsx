import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import WaitingIndicator from '../WaitingIndicator';
import Modal from 'react-modal';
import { backendUrl } from '../../config';

interface UploadComposerDialogProps {
  open: boolean;
  header: React.ReactNode;
  composer?: { firstname: string; surname: string; id: number } | null;
  uploadComposer: (firstname: string, surname: string, imageBlob?: File) => Promise<void>;
  finished: (error?: any) => void;
}

const UploadComposerDialog: React.FC<UploadComposerDialogProps> = (props) => {
  const [isValid, setIsValid] = useState(false);
  const [imageBlob, setImageBlob] = useState<File | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (props.open) {
      if (fileInputRef.current) {
        // reset file input
        fileInputRef.current.value = '';
      }
      setImageBlob(undefined);
      setIsValid(false);
    }
  }, [props.open]);

  return React.createElement(
    Modal as any,
    {
      isOpen: props.open,
      ariaHideApp: false,
      style: {
        overlay: { zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        content: { left: '10%', right: '10%', top: '10%', bottom: 'auto' }
      }
    },
    <div className='dialog'>
      <div className='menu-header'>{props.header}</div>
      <div className='dialog-form'>
        <label>{t('FirstName')}:</label>
        <input
          type='text'
          id="firstname"
          size={1}
          defaultValue={props.composer ? props.composer.firstname : ''}
          onChange={() => {
            setIsValid((document.getElementById('surname') as HTMLInputElement).value.length > 0);
          }}
        />
        <label>{t('Surname')}:</label>
        <input
          type='text'
          id="surname"
          size={1}
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
            const file = event.target.files ? event.target.files[0] : undefined;
            setImageBlob(file);
            const imgElem = document.getElementById('composerImage') as HTMLImageElement;
            if (file && imgElem) {
              imgElem.src = URL.createObjectURL(file);
            }
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
              (document.getElementById('firstname') as HTMLInputElement).value,
              (document.getElementById('surname') as HTMLInputElement).value,
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
  );
}

export default UploadComposerDialog;
