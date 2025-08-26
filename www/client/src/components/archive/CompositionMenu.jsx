import React from 'react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import Modal from 'react-modal';
import { MessageDialog, ConfirmationDialog } from "../MessageBox";
import UploadCompositionDialog from "./UploadCompositionDialog";
import { backendUrl } from '../../config';

const CompositionMenu = (props) => {

  const [uploadDialogIsOpen, setUploadDialogIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState();
  const [confirmationMessage, setConfirmationMessage] = useState();

  const { t } = useTranslation();

  const playComposition = () => {

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compositionId: props.composition.id })
    };

    fetch(backendUrl + '/play', requestOptions);
    props.finished();
  }

  const showDeleteConfirmationDialog = () => {
    console.log("Show confirmation dialog...");
    setConfirmationMessage(t('Delete from archive permanently?'));
  }

  const deleteConfirmed = (result) => {
    //console.log("Delete confirmation result: " + result);
    setConfirmationMessage(undefined); // close dialog
    if (result === true) {
      fetch(backendUrl + '/archive/composition/' + props.composition.id,
        { method: 'DELETE' })
        .then((response) => {
          // update composition list
          props.finished();
        });
    }
    props.finished();
  }

  const uploadComposition = (title, midifile) => {
    //console.log('Uploading composition data');
    const promise = new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('name', title);
      if (midifile) {
        formData.append('midifile', midifile);
      }

      fetch(backendUrl + '/archive/composition/' + props.composition.id,
        {
          method: 'PATCH',
          body: formData,
        })
        .then((response) => {
          if (response.status === 204) {
            resolve();
          }
          else {
            response.json()
              .then((data) => {
                //console.log("Patching composition failed: " + data.message)
                reject(new Error(data.message));
              })
          }
        })
        .catch((error) => {
          //console.error('Error:', error);
          reject(error);
        });
    });
    return promise;
  };

  const uploadFinished = (error) => {
    setUploadDialogIsOpen(false);
    if (error) {
      //console.log(error.toString());
      setErrorMessage(error.toString());
    }
    else {
      props.finished();
    }
  }

  return (
    <Modal
      isOpen={props.open}
      ariaHideApp={ false }
      onRequestClose={ () => props.finished() }
      style={{
        overlay: { zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        content: { left: '10%', right: 'auto', top: '10%', bottom: 'auto' }
      }}
    >
      <div className='menu'>
        <div className='menu-header'>{props.composition ? props.composition.name : null}</div>
        <div className='menu-item' onClick={playComposition}>{t('Play')}</div>
        <div className='menu-item' onClick={showDeleteConfirmationDialog}>{t('Delete')}</div>
        <div className='menu-item'>{t('Add to playlist')}</div>
        <div className='menu-item' onClick={() => { setUploadDialogIsOpen(true) }}>{t('Edit')}</div>
      </div>
      <ConfirmationDialog
        open={confirmationMessage !== undefined}
        setMessage={setConfirmationMessage}
        header={props.composition ? props.composition.name : null}
        message={confirmationMessage}
        onConfirm={deleteConfirmed}
      />
      <UploadCompositionDialog
        open={uploadDialogIsOpen}
        header={t('Edit')}
        title={props.composition ? props.composition.name : null}
        midifileIsMandatory={false}
        upload={uploadComposition}
        finished={uploadFinished}
      />
      <MessageDialog
        open={errorMessage !== undefined}
        setMessage={setErrorMessage}
        header={t('UploadFailed')}
        message={errorMessage}
      />
    </Modal>
  );
}

export default CompositionMenu;
