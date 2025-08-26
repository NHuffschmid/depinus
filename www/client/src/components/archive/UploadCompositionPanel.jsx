import React from 'react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { MessageDialog } from "../MessageBox";
import UploadCompositionDialog from './UploadCompositionDialog';
import { backendUrl } from '../../config';

const UploadCompositionPanel = (props) => {

  const [uploadDialogIsOpen, setUploadDialogIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState();

  const { t } = useTranslation();

  const uploadComposition = (title, midifile) => {
    //console.log('Uploading composition data');
    const promise = new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('name', title);
      formData.append('composerId', props.composerId);
      formData.append('midifile', midifile);

      fetch(backendUrl + '/archive/composition',
        {
          method: 'POST',
          body: formData,
        })
        .then((response) => {
          if (response.status === 200) {
            resolve();
          }
          else {
            response.json()
              .then((data) => {
                reject(data.message);
              })
          }
        })
        .catch((error) => {
          reject(error);
        });
    })
    return promise;
  };

  const uploadFinished = (error) => {
    setUploadDialogIsOpen(false);
    if (error) {
      setErrorMessage(error.toString());
    }
    props.finished();
  }

  return (
    <div>
      <button onClick={() => { setUploadDialogIsOpen(true) }}>{t('Add midifile to archive')}</button>
      <UploadCompositionDialog
        open={uploadDialogIsOpen}
        header={t('Add midifile to archive')}
        title={''}
        midifileIsMandatory={true}
        upload={uploadComposition}
        finished={uploadFinished} />
      <MessageDialog
        open={errorMessage !== undefined}
        setMessage={setErrorMessage}
        header={t('UploadFailed')}
        message={errorMessage}
      />
    </div>
  );
}

export default UploadCompositionPanel;
