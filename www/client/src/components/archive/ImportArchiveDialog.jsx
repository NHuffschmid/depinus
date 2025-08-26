import React, { useState, useRef } from 'react';
import { useTranslation } from "react-i18next";
import WaitingIndicator from '../WaitingIndicator';
import Dialog from '../Dialog';
import ArchiveTreeView from './ArchiveTreeView';
import { backendUrl } from '../../config';

const ImportArchiveDialog = (props) => {

  const { t } = useTranslation();
  const treeViewRef = useRef();

  const [archiveFile, SetArchiveFile] = useState();
  const [treeViewData, SetTreeViewData] = useState();
  const [isImporting, setIsImporting] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState(0);

  const onSelectionChanged = (numberOfSelectedNodes) => {
    //console.log('Selected nodes: ' + numberOfSelectedNodes);
    setSelectedNodes(numberOfSelectedNodes);
  }

  const onArchiveFileSelected = (file) => {
    SetArchiveFile(file);
    if (file === undefined) {
      SetTreeViewData();
    }
    else {
      setIsInspecting(true);
      const formData = new FormData();
      formData.append('archivefile', file);

      fetch(backendUrl + '/archive/inspect',
        {
          method: 'POST',
          body: formData,
        })
        .then((response) => {
          if (response.status === 200) {
            // sucessful POST request
            response.json()
              .then((archive) => {
                SetTreeViewData(archive);
                setIsInspecting(false);
              })
          }
          else {
            response.json()
              .then((data) => {
                console.log("Patching composition failed: " + data.message)
                SetTreeViewData();
                setIsInspecting(false);
              })
          }
        })
    }
  }


  const importArchive = () => {
    setIsImporting(true);

    const formData = new FormData();
    formData.append('archivefile', archiveFile);

    // treeview component provides JSON structure required by backend
    const selection = treeViewRef.current.getSelection();
    formData.append('importdata', JSON.stringify(selection));

    fetch(backendUrl + '/archive/import',
      {
        method: 'POST',
        body: formData,
      })
      .then((response) => {
        setIsImporting(false);
        if (response.status === 200) {
          // sucessful POST request
        }
        else {
          response.json()
            .then((data) => {
              console.log("Import failed: " + data.message)
            })
        }
        props.closed();
      })
  }

  return (
    <Dialog {...props}
      left='5%' right='5%' top='5%' bottom='5%'
      header={t('ImportArchive')}
      content={
        <div>
          <div>
            <input
              type='file'
              name="archivefile"
              accept=".zip" // accept=".dep"
              onChange={(event) => { onArchiveFileSelected(event.target.files[0]); }} />
          </div>
          {isImporting ? (
            <WaitingIndicator />
          ) : (
            <div>
              {isInspecting ? (
                <WaitingIndicator />
              ) : (
                <div>
                  {treeViewData && (
                    <ArchiveTreeView
                      data={treeViewData}
                      ref={treeViewRef}
                      onSelectionChanged={onSelectionChanged}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      }
      buttons={
        <div>
          <button
            disabled={(archiveFile === undefined) || (selectedNodes === 0)}
            style={{ float: 'left', width: '6rem' }}
            onClick={importArchive}
          >
            {t('Import')}
          </button>
          <button
            disabled={isImporting}
            style={{ float: 'right', width: '6rem' }}
            onClick={() => {
              SetTreeViewData();
              setTimeout(() => { // why do we need this?
                SetArchiveFile(undefined);
                setSelectedNodes(0);
                props.closed();
              }, 0);
            }}>
            {t('Cancel')}
          </button>
        </div>
      }
    />
  );
}

export default ImportArchiveDialog;
