import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import WaitingIndicator from '../WaitingIndicator';
import Modal from 'react-modal';

interface Composer {
    id: number;
    firstname: string;
    surname: string;
}

interface UploadCompositionDialogProps {
    open: boolean;
    header: React.ReactNode;
    title: string;
    composerId?: number;
    composers?: Composer[];
    midifileIsMandatory: boolean;
    upload: (title: string, midifile: File | undefined, composerId?: number) => Promise<void>;
    finished: (error?: any) => void;
}

const UploadCompositionDialog: React.FC<UploadCompositionDialogProps> = (props) => {
    const [title, setTitle] = useState(props.title);
    const [midifile, setMidifile] = useState<File | undefined>();
    const [composerId, setComposerId] = useState<number | undefined>(props.composerId);
    const [uploading, setUploading] = useState(false);
    const { t } = useTranslation();

    const hasChanges = () => {
        return title !== props.title || 
               composerId !== props.composerId || 
               midifile !== undefined;
    };

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
                <label>{t('Title')}:</label>
                <input
                    type='text'
                    name="title"
                    defaultValue={title}
                    onChange={(event) => { setTitle(event.target.value); }}
                />
                {props.composers && (
                    <>
                        <label>{t('Composer')}:</label>
                        <select
                            value={composerId || ''}
                            onChange={(event) => { setComposerId(event.target.value ? parseInt(event.target.value) : undefined); }}
                        >
                            {props.composers.map((composer) => (
                                <option key={composer.id} value={composer.id}>
                                    {composer.firstname} {composer.surname}
                                </option>
                            ))}
                        </select>
                    </>
                )}
                <input
                    style={{ gridColumn: '1 / 3' }}
                    type='file'
                    name="midifile"
                    accept=".mid,.midi"
                    onChange={(event) => { setMidifile(event.target.files ? event.target.files[0] : undefined); }}
                />
            </div>
            <div>
                <button
                    disabled={(title === '') || (!midifile && props.midifileIsMandatory) || uploading || !hasChanges()}
                    onClick={() => {
                        setUploading(true); // start waiting indication
                        props.upload(title, midifile, composerId)
                            .then(() => {
                                setUploading(false); // stop waiting indication
                                props.finished();
                            })
                            .catch((error) => {
                                setUploading(false); // stop waiting indication
                                props.finished(error);
                            })
                            .finally(() => {
                                setTitle(props.title);
                                setMidifile(undefined);
                                setComposerId(props.composerId);
                            });
                    }}
                >
                    {t('Save')}
                </button>
                {uploading ? <WaitingIndicator width='4rem' height='2rem' /> : null}
                <button
                    disabled={uploading}
                    style={{ float: 'right' }}
                    onClick={() => { props.finished(); }}
                >
                    {t('Cancel')}
                </button>
            </div>
        </div>
    );
}

export default UploadCompositionDialog;
