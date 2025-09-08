import React, { useState } from 'react';
import NavButton from '../NavButton';
import ImportArchiveDialog from './ImportArchiveDialog';

interface ImportArchiveButtonProps {
    children?: React.ReactNode;
    angle: number;
    radius: number;
}

const ImportArchiveButton: React.FC<ImportArchiveButtonProps> = (props) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const dialogClosed = () => {
        setIsDialogOpen(false);
    }
    return (
        <NavButton {...props} action={() => {
            //console.log('ImportArchiveButton has been clicked.');
            setIsDialogOpen(true);
        }}>
            <ImportArchiveDialog open={isDialogOpen} closed={dialogClosed} />
            {props.children}
        </NavButton>
    );
}

export default ImportArchiveButton;
