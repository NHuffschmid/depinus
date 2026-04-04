import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { MessageDialog } from "../MessageBox";
import UploadCompositionDialog from './UploadCompositionDialog';
import { backendUrl } from '../../config';

interface UploadCompositionPanelProps {
    composerId: number;
    finished: () => void;
}

const UploadCompositionPanel: React.FC<UploadCompositionPanelProps> = (props) => {
    const [uploadDialogIsOpen, setUploadDialogIsOpen] = useState(false);
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
        setUploadDialogIsOpen(false);
        if (error) {
            setErrorMessage(error.toString());
        }
        props.finished();
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => { setUploadDialogIsOpen(true) }}>{t('Add midifile to archive')}</button>
                <button onClick={() => { alert(t('Import of audio files is not implemented yet')) }}>{t('Import audio file to archive')}</button>
            </div>
            <UploadCompositionDialog
                open={uploadDialogIsOpen}
                header={t('Add midifile to archive')}
                title={''}
                composerId={props.composerId}
                midifileIsMandatory={true}
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
