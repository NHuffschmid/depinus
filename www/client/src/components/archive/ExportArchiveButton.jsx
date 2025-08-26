import React, { useState } from 'react';
import NavButton from '../NavButton';
import ExportArchiveDialog from './ExportArchiveDialog';

const ExportArchiveButton = (props) => {

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const dialogClosed = () => {
    setIsDialogOpen(false);
  }

  return (
    <NavButton {...props} action={() => {
      //console.log('ExportArchiveButton has been clicked.');
      setIsDialogOpen(true);
    }}>
      <ExportArchiveDialog open={isDialogOpen} closed={dialogClosed} />
      {props.children}
    </NavButton>
  );
}

export default ExportArchiveButton;
