import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import WaitingIndicator from '../WaitingIndicator';
import Modal from 'react-modal';

interface UploadComposerDialogProps {
    open: boolean;
    header: React.ReactNode;
    name?: { name: string; id: number } | null;
    createPlaylist: (name: string) => Promise<void>;
    finished: (error?: any) => void;
}

const CreatePlaylistDialog: React.FC<UploadComposerDialogProps> = (props) => {
    const [isValid, setIsValid] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        if (props.open) {
            setIsValid(false);
        }
    }, [props.open]);

    return React.createElement(
        Modal as any,
        {
            isOpen: props.open,
            ariaHideApp: false,
            style: {
                overlay: { zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                content: { left: '10%', right: '10%', top: '10%', bottom: 'auto' }
            }
        },
        <div className='dialog'>
            <div className='menu-header'>{props.header}</div>
            <div className='dialog-form'>
                <label>{t('Name')}:</label>
                <input
                    type='text'
                    id="name"
                    size={1}
                    defaultValue={props.name ? props.name.name : ''}
                    onChange={() => {
                        setIsValid((document.getElementById('name') as HTMLInputElement).value.length > 0);
                    }}
                />
            </div>
            <div>
                <button
                    disabled={!isValid || uploading}
                    onClick={() => {
                        setUploading(true);
                        props.createPlaylist(
                            (document.getElementById('name') as HTMLInputElement).value
                        )
                            .then(() => {
                                setUploading(false);
                                props.finished();
                            })
                            .catch((error) => {
                                setUploading(false);
                                props.finished(error.message);
                            });
                    }}
                >
                    {t('Save')}
                </button>
                {uploading ? <WaitingIndicator width='4rem' height='2rem' /> : null}
                <button
                    disabled={uploading}
                    style={{ float: 'right' }}
                    onClick={() => {
                        props.finished();
                    }}
                >
                    {t('Cancel')}
                </button>
            </div>
        </div>
    );
}

export default CreatePlaylistDialog;
