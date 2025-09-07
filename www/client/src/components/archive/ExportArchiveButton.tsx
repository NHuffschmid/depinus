import React, { useState } from 'react';
import NavButton from '../NavButton';
import ExportArchiveDialog from './ExportArchiveDialog';

interface ExportArchiveButtonProps {
    children?: React.ReactNode;
    angle: number;
    radius: number;
}

const ExportArchiveButton: React.FC<ExportArchiveButtonProps> = (props) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const dialogClosed = () => {
        setIsDialogOpen(false);
    }
    return (
        <NavButton {...props} action={() => {
            setIsDialogOpen(true);
        }}>
            <ExportArchiveDialog open={isDialogOpen} closed={dialogClosed} />
            {props.children}
        </NavButton>
    );
}

export default ExportArchiveButton;
