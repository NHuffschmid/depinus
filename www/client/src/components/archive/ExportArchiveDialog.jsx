import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from "react-i18next";
import WaitingIndicator from '../WaitingIndicator';
import Dialog from '../Dialog';
import ArchiveTreeView from './ArchiveTreeView';
import { backendUrl } from '../../config';

const ExportArchiveDialog = (props) => {

  const { t } = useTranslation();
  const treeViewRef = useRef();

  const [treeViewData, SetTreeViewData] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState(0);

  const onSelectionChanged = (numberOfSelectedNodes) => {
    setSelectedNodes(numberOfSelectedNodes);
  }

  const exportSelection = () => {

    setIsExporting(true);

    // treeview component provides JSON structure required by backend
    const selection = treeViewRef.current.getSelection();

    fetch(backendUrl + '/archive/export',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection)
      })
      .then((response) => {
        if (response.status === 200) {
          response.blob()
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.style.display = "none";
              a.href = url;
              a.download = "depinus.zip";
              //a.download = "archive.dep";
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);

              setIsExporting(false);
              props.closed();
            })
        }
        else {
          response.json()
            .then((error) => {
              console.log('Backend sent HTTP response status ' + response.status + ' - ' + error.message);
              setIsExporting(false);
              props.closed();
            })
        }
      });
  }

  useEffect(() => {
    // get lists of composers from database
    fetch(backendUrl + '/archive/composers')
      .then((response) => response.json())
      .then((data) => {
        const tvData = [];
        data.forEach((composer, i) => {
          const tvdComposer = {
            'type': 'composer',
            'id': composer.id,
            'name': composer.firstname + ' ' + composer.surname,
            'compositions': []
          };
          // get all compositions of given composer
          fetch(backendUrl + '/archive/compositions?composerId=' + composer.id)
            .then((response) => response.json())
            .then((data) => {
              data.forEach((composition) => {
                const tvdComposition = {
                  'type': 'composition',
                  'id': composition.id,
                  'name': composition.name
                }
                tvdComposer.compositions.push(tvdComposition);
                SetTreeViewData(tvData);
              });
            });
          tvData.push(tvdComposer);
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <Dialog {...props}
      left='5%' right='5%' top='5%' bottom='5%'
      header={t('ExportArchive')}
      content={
        <div>
          {isExporting ? (
            <WaitingIndicator />
          ) : (
            <ArchiveTreeView
              data={treeViewData}
              ref={treeViewRef}
              onSelectionChanged={onSelectionChanged}
            />
          )}
        </div>
      }
      buttons={
        <div>
          <button
            disabled={isExporting || (selectedNodes === 0)}
            style={{ float: 'left', width: '6rem' }}
            onClick={exportSelection}
          >
            {t('Export')}
          </button>
          <button
            disabled={isExporting}
            style={{ float: 'right', width: '6rem' }}
            onClick={() => {
              setTimeout(() => { // why do we need this?
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

export default ExportArchiveDialog;
