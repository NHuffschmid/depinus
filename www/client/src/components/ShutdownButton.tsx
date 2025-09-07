import React, { useState } from 'react';
import NavButton from './NavButton';
import { ConfirmationDialog } from "./MessageBox";
import { useTranslation } from "react-i18next";
import { backendUrl } from '../config';

interface ShutdownButtonProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const ShutdownButton: React.FC<ShutdownButtonProps> = (props) => {
  const [confirmationMessage, setConfirmationMessage] = useState<string | undefined>();
  const { t } = useTranslation();

  const showConfirmationDialog = () => {
    //console.log("Show confirmation dialog...");
    const msg = t('Are you sure?');
    setConfirmationMessage(typeof msg === 'string' ? msg : undefined);
  }

  const shutdownConfirmed = (result: boolean) => {
    setConfirmationMessage(undefined);
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
