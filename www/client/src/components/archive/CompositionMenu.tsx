import React, { useState } from 'react';
import Modal from 'react-modal';
import { usePlaylistContext } from '../playlist/PlaylistContext';
import { useTranslation } from "react-i18next";
import { MessageDialog, ConfirmationDialog } from "../MessageBox";
import UploadCompositionDialog from "./UploadCompositionDialog";
import { backendUrl } from '../../config';

interface CompositionMenuProps {
    open: boolean;
    composition?: { id: number; name: string } | null;
    finished: () => void;
}

const CompositionMenu: React.FC<CompositionMenuProps> = (props) => {
    const [uploadDialogIsOpen, setUploadDialogIsOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [confirmationMessage, setConfirmationMessage] = useState<string | undefined>();
    const { t } = useTranslation();
    const { selectedPlaylist } = usePlaylistContext();

    const playComposition = () => {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ compositionId: props.composition?.id })
        };
        fetch(backendUrl + '/play', requestOptions);
        props.finished();
    }

    const showDeleteConfirmationDialog = () => {
        setConfirmationMessage(t('Delete from archive permanently?') ?? undefined);
    }

    const deleteConfirmed = (result: boolean) => {
        setConfirmationMessage(undefined);
        if (result === true && props.composition) {
            fetch(backendUrl + '/archive/composition/' + props.composition.id, { method: 'DELETE' })
                .then(() => {
                    props.finished();
                });
        }
        props.finished();
    }

    const uploadComposition = (title: string, midifile: File) => {
        return new Promise<void>((resolve, reject) => {
            const formData = new FormData();
            formData.append('name', title);
            if (midifile) {
                formData.append('midifile', midifile);
            }
            fetch(backendUrl + '/archive/composition/' + props.composition?.id, {
                method: 'PATCH',
                body: formData,
            })
                .then((response) => {
                    if (response.status === 204) {
                        resolve();
                    } else {
                        response.json().then((data) => {
                            reject(new Error(data.message));
                        });
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    };

    const uploadFinished = (error?: any) => {
        setUploadDialogIsOpen(false);
        if (error) {
            setErrorMessage(error.toString());
        } else {
            props.finished();
        }
    }

    const handleAddToPlaylist = () => {
        if (!props.composition || !selectedPlaylist) return;
        fetch(`${backendUrl}/playlist/${selectedPlaylist.id}/compositions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ compositionId: props.composition.id })
        })
            .then(res => {
                if (res.status === 200) {
                    props.finished();
                } else {
                    res.json().then(data => setErrorMessage(data.message || 'Error at adding to playlist'));
                }
            })
            .catch(err => setErrorMessage(err.toString()));
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
                    onClick={playComposition}
                >
                    {t('Play')}
                </div>
                <div
                    className='menu-item'
                    onClick={showDeleteConfirmationDialog}
                >
                    {t('Delete')}
                </div>
                <div
                    className='menu-item' onClick={handleAddToPlaylist}
                    style={{ opacity: selectedPlaylist ? 1 : 0.5, pointerEvents: selectedPlaylist ? 'auto' : 'none' }}
                >
                    {t('Add to playlist')}
                </div>
                <div
                    className='menu-item'
                    onClick={() => { setUploadDialogIsOpen(true) }}>{t('Edit')}
                </div>
            </div>
            <ConfirmationDialog
                open={confirmationMessage !== undefined}
                setMessage={setConfirmationMessage}
                header={props.composition ? props.composition.name : null}
                message={confirmationMessage}
                onConfirm={deleteConfirmed}
            />
            <UploadCompositionDialog
                open={uploadDialogIsOpen}
                header={t('Edit')}
                title={props.composition ? props.composition.name ?? '' : ''}
                midifileIsMandatory={false}
                upload={uploadComposition}
                finished={uploadFinished}
            />
            <MessageDialog
                open={errorMessage !== undefined}
                setMessage={setErrorMessage}
                header={t('UploadFailed')}
                message={errorMessage}
            />
        </>
    );
}

export default CompositionMenu;
