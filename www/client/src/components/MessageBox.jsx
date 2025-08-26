import React from 'react';
import { useTranslation } from "react-i18next";
import Dialog from './Dialog';

export function MessageDialog(props) {

  const { t } = useTranslation();

  return (
    <Dialog {...props}
      left='20%' right='auto' top='20%' bottom='auto'
      header={props.header}
      content={props.message}
      buttons={
        <button
          onClick={() => { props.setMessage(undefined) }}>{t('Close')}
        </button>
      }
    />
  );
}

export function ConfirmationDialog(props) {

  const { t } = useTranslation();

  return (
    <Dialog {...props}
      left='20%' right='auto' top='20%' bottom='auto'
      header={props.header}
      content={props.message}
      buttons={
        <div>
          <button
            style={{ float: 'left', width: '6rem', marginRight: '1rem' }}
            onClick={() => {
              setTimeout(() => { // why do we need this?
                props.onConfirm(true);
              }, 0);
            }}>{t('Yes')}</button>
          <button
            style={{ float: 'right', width: '6rem', marginLeft: '1rem' }}
            onClick={() => {
              setTimeout(() => { // why do we need this?
                props.onConfirm(false);
              }, 0);
            }}>
            {t('No')}
          </button>
        </div>
      }
    />
  );
}
