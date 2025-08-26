import React from 'react';
import { useState } from 'react';
import NavButton from './NavButton';
import { ConfirmationDialog } from "./MessageBox";
import { useTranslation } from "react-i18next";
import { backendUrl } from '../config';

const ShutdownButton = (props) => {

  const [confirmationMessage, setConfirmationMessage] = useState();
  const { t } = useTranslation();

  const showConfirmationDialog = () => {
    //console.log("Show confirmation dialog...");
    setConfirmationMessage(t('Are you sure?'));
  }

  const shutdownConfirmed = (result) => {
    setConfirmationMessage(); // close dialog
    if (result === true) {
      //console.log('Shutdown...');
      fetch(backendUrl + '/shutdown', { method: 'POST' })
      .catch((error) => {
        console.log(error);
      });
    }
  }

  return (
    <NavButton {...props} action={() => {
      showConfirmationDialog();
    }}>
      {props.children}
      <ConfirmationDialog
        open={confirmationMessage !== undefined}
        setMessage={setConfirmationMessage}
        header={t('Shutdown')}
        message={confirmationMessage}
        onConfirm={shutdownConfirmed}
      />

    </NavButton>
  );
}

export default ShutdownButton;
