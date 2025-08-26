import React from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { MessageDialog, ConfirmationDialog } from "../MessageBox";
import UploadComposerDialog from "./UploadComposerDialog";
import { backendUrl } from '../../config';

const ComposerPanel = (props) => {

  const [composers, setComposers] = useState();
  const [selectedComposer, setSelectedComposer] = useState();
  const [uploadComposerDialogHeader, setUploadComposerDialogHeader] = useState();
  const [uploadComposerDialogIsOpen, setUploadComposerDialogIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState();
  const [confirmationMessage, setConfirmationMessage] = useState();
  const [imageTag, setImageTag] = useState('123');

  const { t } = useTranslation();

  useEffect(() => {
    getComposers();
  }, []);

  const getComposers = () => {
    fetch(backendUrl + '/archive/composers')
      .then((response) => response.json())
      .then((composers) => {
        setComposers(composers);
        //console.log(composers);
      })
  }

  const updateComposerData = (firstname, surname, imageBlob) => {
    const promise = new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('firstname', firstname);
      formData.append('surname', surname);
      if (imageBlob) {
        formData.append('image', imageBlob);
      }

      let url, method;
      if (selectedComposer === null) {
        url = '/archive/composer';
        method = 'POST';
      }
      else {
        url = '/archive/composer/' + selectedComposer.id;
        method = 'PATCH';
      }

      fetch(backendUrl + url,
        {
          method: method,
          body: formData,
        })
          .then((response) => {
            if (response.status === 200) {
              // sucessful POST request
              response.json()
                .then((newComposer) => {
                  getComposers();
                  resolve();
                })
            }
            else if (response.status === 204) {
              // sucessful PATCH request
              getComposers();
              setSelectedComposer({
                firstname: firstname,
                surname: surname,
                id: selectedComposer.id
              })
              setImageTag(Math.random().toString().slice(2)); // trigger img re-rendering
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
  }

  const uploadFinished = (error) => {
    setUploadComposerDialogIsOpen(false);
    if (error) {
      //console.log(error.toString());
      setErrorMessage(error.toString());
    }
}

  const showDeleteConfirmationDialog = () => {
    //console.log("Show confirmation dialog...");
    setConfirmationMessage(t('Delete composer (and associated midi files) from archive permanently?'));
  }

  const deleteConfirmed = (result) => {
    setConfirmationMessage(); // close dialog
    if (result === true) {
      //console.log('Delete composer with ID ' + selectedComposer.id + ' and all his compositions...');
      fetch(backendUrl + '/archive/composer/' + selectedComposer.id,
        { method: 'DELETE' })
        .then((response) => {
          // update composer list
          setSelectedComposer(null);
          props.updateComposer(null);
          document.getElementById('composers').value = 'DEFAULT';
          getComposers();
        });
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '0.3rem',
      backgroundColor: 'gray',
      padding: '0.2rem'
    }}>
      <select id='composers' style={{
        fontSize: '1.2rem'
      }}
        defaultValue={'DEFAULT'}
        onChange={(e) =>
          fetch(backendUrl + '/archive/compositions?composerId=' + e.target.value)
            .then((response) => response.json())
            .then((data) => {
              //setCompositions(data);
              for (let composer of composers) {
                if (composer.id === parseInt(e.target.value)) {
                  setSelectedComposer(composer);
                  props.updateComposer(composer);
                }
              }
            })
        }
      >
        <option value='DEFAULT' disabled>-- {t('Select composer')} --</option>
        {composers ? composers.map((composer) => (
          <option key={composer.id} value={composer.id}>
            {composer.firstname} {composer.surname}
          </option>
        )) : ''}
      </select>
      {selectedComposer ?
        <img
          alt='Composer'
          height='48px'
          src={backendUrl + '/archive/composerImage?composerId=' +
            selectedComposer.id + '&' + imageTag}
        /> : null}
      {selectedComposer ?
        <button onClick={() => {
          setUploadComposerDialogHeader(t('Edit'));
          setUploadComposerDialogIsOpen(true)
        }}>
          {t('Edit')}
        </button>
        : null}
      {selectedComposer ?
        <button
          onClick={() => {
            showDeleteConfirmationDialog();
          }}>
          {t('Delete')}
        </button>
        : null}
      <button
        title={t('Add new composer to archive')}
        onClick={() => {
          setUploadComposerDialogHeader(t('Add new composer to archive'));
          setSelectedComposer(null);
          document.getElementById('composers').value = 'DEFAULT';
          props.updateComposer(null);
          setUploadComposerDialogIsOpen(true)
        }}>
        +
      </button>
      <UploadComposerDialog
        open={uploadComposerDialogIsOpen}
        header={uploadComposerDialogHeader}
        composer={selectedComposer}
        uploadComposer={updateComposerData}
        finished={uploadFinished}
      />
      <MessageDialog
        open={errorMessage !== undefined}
        setMessage={setErrorMessage}
        header={t('UploadFailed')}
        message={errorMessage}
      />
      <ConfirmationDialog
        open={confirmationMessage !== undefined}
        setMessage={setConfirmationMessage}
        header={selectedComposer ?
          selectedComposer.firstname + ' ' + selectedComposer.surname
          : null}
        message={confirmationMessage}
        onConfirm={deleteConfirmed}
      />
    </div>
  );
}

export default ComposerPanel;
