import React from 'react';
import Modal from 'react-modal';
import { useTranslation } from "react-i18next";
import { backendUrl } from '../../config';

interface CompositionMenuProps {
    open: boolean;
    playlistId?: number;
    composition?: { id: string; name: string } | null;
    finished: () => void;
}

const CompositionMenu: React.FC<CompositionMenuProps> = (props) => {
    const { t } = useTranslation();

    const playFromHere = () => {
        // Dummy: Play from here
        alert('Play from here: ' + props.composition?.name);
        props.finished();
    };

    const removeFromPlaylist = async () => {
        if (!props.composition || !(props as any).playlistId) return props.finished();
        const playlistId = (props as any).playlistId;
        await fetch(backendUrl + `/playlist/${playlistId}/compositions/${props.composition.id}`, {
            method: 'DELETE'
        });
        props.finished();
    };

    return React.createElement(
        Modal as any,
        {
            isOpen: props.open,
            ariaHideApp: false,
            onRequestClose: () => props.finished(),
            style: {
                overlay: { zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                content: { left: '10%', right: 'auto', top: '10%', bottom: 'auto' }
            }
        },
        <>
            <div className='menu'>
                <div
                    className='menu-header'>{props.composition ? props.composition.name : null}
                </div>
                <div
                    className='menu-item'
                    onClick={playFromHere}
                >
                    {t('Start playlist from here')}
                </div>
                <div
                    className='menu-item'
                    onClick={removeFromPlaylist}
                >
                    {t('Remove from playlist')}
                </div>
            </div>
        </>
    );
};

export default CompositionMenu;
