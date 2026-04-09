import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { MessageDialog } from "../MessageBox";
import ImportCompositionDialog from './ImportCompositionDialog';
import { backendUrl } from '../../config';

interface UploadCompositionPanelProps {
    composerId: number;
    finished: () => void;
}

const UploadCompositionPanel: React.FC<UploadCompositionPanelProps> = (props) => {
    const [dialogIsOpen, setDialogIsOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const { t } = useTranslation();

    //console.log('Uploading composition data');
    const uploadComposition = (title: string, midifile: File | undefined, composerId?: number) => {
        return new Promise<void>((resolve, reject) => {
            if (!midifile) {
                reject(new Error('Midifile is required'));
                return;
            }
            const formData = new FormData();
            formData.append('name', title);
            formData.append('composerId', String(props.composerId));
            formData.append('midifile', midifile);
            fetch(backendUrl + '/archive/composition', {
                method: 'POST',
                body: formData,
            })
                .then((response) => {
                    if (response.status === 200) {
                        resolve();
                    } else {
                        response.json().then((data) => {
                            reject(data.message);
                        });
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    };

    const uploadFinished = (error?: any) => {
        setDialogIsOpen(false);
        if (error) {
            setErrorMessage(error.toString());
        }
        props.finished();
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => { setDialogIsOpen(true) }}>{t('Import file to archive')}</button>
                <span style={{ color: 'gray', fontSize: '0.85em' }}>MIDI, MP3, WAV, ...</span>
            </div>
            <ImportCompositionDialog
                open={dialogIsOpen}
                composerId={props.composerId}
                upload={uploadComposition}
                finished={uploadFinished}
            />
            <MessageDialog
                open={errorMessage !== undefined}
                setMessage={setErrorMessage}
                header={t('Upload failed')}
                message={errorMessage}
            />
        </div>
    );
}

export default UploadCompositionPanel;
