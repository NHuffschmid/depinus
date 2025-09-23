import React from 'react';
import Modal from 'react-modal';
import { useTranslation } from "react-i18next";

interface CompositionMenuProps {
    open: boolean;
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

    const deleteTrack = () => {
        // Dummy: Delete track
        alert('Delete track: ' + props.composition?.name);
        props.finished();
    };

    return (
        <Modal
            isOpen={props.open}
            onRequestClose={props.finished}
            contentLabel={t('Track Menu') as string}
            ariaHideApp={false}
            style={{
                content: {
                    maxWidth: 320,
                    margin: 'auto',
                    padding: 24,
                    borderRadius: 8,
                    boxShadow: '0 2px 16px #0002',
                }
            }}
        >
            <h3 style={{ marginBottom: 16 }}>{props.composition?.name}</h3>
            <button style={{ width: '100%', marginBottom: 12 }} onClick={playFromHere}>
                {t('Play from here')}
            </button>
            <button style={{ width: '100%' }} onClick={deleteTrack}>
                {t('Delete')}
            </button>
        </Modal>
    );
};

export default CompositionMenu;
