import React, { useState, useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from "react-i18next";
import { MessageDialog, ConfirmationDialog } from "../MessageBox";
import UploadComposerDialog from "./UploadComposerDialog";
import { backendUrl } from '../../config';

interface Composer {
    firstname: string;
    surname: string;
    id: number;
}

interface ComposerPanelProps {
    updateComposer: (composer: Composer | null) => void;
    refreshTrigger?: number;
    selectComposerName?: string | null;
    onComposerSelected?: () => void;
}

const ComposerPanel: React.FC<ComposerPanelProps> = (props) => {
    const [composers, setComposers] = useState<Composer[] | undefined>();
    const [selectedComposer, setSelectedComposer] = useState<Composer | null>(null);
    const [uploadComposerDialogHeader, setUploadComposerDialogHeader] = useState<string | undefined>();
    const [uploadComposerDialogIsOpen, setUploadComposerDialogIsOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [confirmationMessage, setConfirmationMessage] = useState<string | undefined>();
    const [imageTag, setImageTag] = useState('123');
    const { t } = useTranslation();

    useEffect(() => {
        getComposers();
    }, [props.refreshTrigger]);

    useEffect(() => {
        // Programmatically select a composer by surname
        if (props.selectComposerName && composers) {
            const composer = composers.find(c => c.surname === props.selectComposerName);
            if (composer) {
                setSelectedComposer(composer);
                props.updateComposer(composer);
                
                // Update the select element
                const selectElement = document.getElementById('composers') as HTMLSelectElement;
                if (selectElement) {
                    selectElement.value = composer.id.toString();
                }
                
                // Notify parent that selection is complete
                if (props.onComposerSelected) {
                    props.onComposerSelected();
                }
            }
        }
    }, [props.selectComposerName, composers]);

    const getComposers = () => {
        fetch(backendUrl + '/archive/composers')
            .then((response) => response.json())
            .then((composers: Composer[]) => {
                setComposers(composers);
                //console.log(composers);
            });
    }

    const updateComposerData = (firstname: string, surname: string, imageBlob?: File) => {
        return new Promise<void>((resolve, reject) => {
            const formData = new FormData();
            formData.append('firstname', firstname);
            formData.append('surname', surname);
            if (imageBlob) {
                formData.append('image', imageBlob);
            }
            let url, method;
            if (selectedComposer === null) {
                url = '/archive/composer';
                method = 'POST';
            } else {
                url = '/archive/composer/' + selectedComposer.id;
                method = 'PATCH';
            }
            fetch(backendUrl + url, {
                method: method,
                body: formData,
            })
                .then((response) => {
                    if (response.status === 200) {
                        response.json().then(() => {
                            getComposers();
                            resolve();
                        });
                    } else if (response.status === 204) {
                        getComposers();
                        setSelectedComposer({ firstname, surname, id: selectedComposer ? selectedComposer.id : 0 });
                        setImageTag(Math.random().toString().slice(2));
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
    }

    const uploadFinished = (error?: any) => {
        setUploadComposerDialogIsOpen(false);
        if (error) {
            setErrorMessage(error.toString());
        }
    }

    const showDeleteConfirmationDialog = () => {
        setConfirmationMessage(t('Delete composer (and associated midi files) from archive permanently?') ?? undefined);
    }

    const deleteConfirmed = (result: boolean) => {
        setConfirmationMessage(undefined);
        if (result === true && selectedComposer) {
            fetch(backendUrl + '/archive/composer/' + selectedComposer.id, { method: 'DELETE' })
                .then(() => {
                    setSelectedComposer(null);
                    props.updateComposer(null);
                    const composersSelect = document.getElementById('composers') as HTMLSelectElement;
                    if (composersSelect) composersSelect.value = 'DEFAULT';
                    getComposers();
                });
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'gray',
            padding: '0.2rem'
        }}>
            <select
                id='composers'
                style={{ fontSize: '1.2rem' }}
                defaultValue={'DEFAULT'}
                onChange={(e) => {
                    fetch(backendUrl + '/archive/compositions?composerId=' + e.target.value)
                        .then((response) => response.json())
                        .then((data) => {
                            if (composers) {
                                for (let composer of composers) {
                                    if (composer.id === parseInt(e.target.value)) {
                                        setSelectedComposer(composer);
                                        props.updateComposer(composer);
                                    }
                                }
                            }
                        });
                }}
            >
                <option value='DEFAULT' disabled>-- {t('Select composer')} --</option>
                {composers ? composers.map((composer) => (
                    <option key={composer.id} value={composer.id}>
                        {composer.firstname} {composer.surname}
                    </option>
                )) : ''}
            </select>
            {selectedComposer ? (
                <img
                    alt='Composer'
                    height='48px'
                    src={backendUrl + '/archive/composerImage?composerId=' + selectedComposer.id + '&' + imageTag}
                />
            ) : null}
            {selectedComposer ? (
                <button
                    title={t('Edit composer') ?? ''}
                    style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem 0.5rem' }}
                    onClick={() => {
                        setUploadComposerDialogHeader(t('Edit') ?? undefined);
                        setUploadComposerDialogIsOpen(true);
                    }}
                >
                    <EditIcon fontSize="small" />
                </button>
            ) : null}
            <button
                title={t('Add new composer to archive') ?? ''}
                onClick={() => {
                    setUploadComposerDialogHeader(t('Add new composer to archive') ?? undefined);
                    setSelectedComposer(null);
                    const composersSelect = document.getElementById('composers') as HTMLSelectElement;
                    if (composersSelect) composersSelect.value = 'DEFAULT';
                    props.updateComposer(null);
                    setUploadComposerDialogIsOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem 0.5rem' }}
            >
                <AddIcon fontSize="small" />
            </button>
            {selectedComposer ? (
                <button
                    title={t('Delete composer') ?? ''}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem 0.5rem' }}
                    onClick={showDeleteConfirmationDialog}
                >
                    <DeleteIcon fontSize="small" />
                </button>
            ) : null}
            <UploadComposerDialog
                open={uploadComposerDialogIsOpen}
                header={uploadComposerDialogHeader}
                composer={selectedComposer}
                uploadComposer={updateComposerData}
                finished={uploadFinished}
            />
            <MessageDialog
                open={errorMessage !== undefined}
                setMessage={setErrorMessage}
                header={t('Upload failed')}
                message={errorMessage}
            />
            <ConfirmationDialog
                open={confirmationMessage !== undefined}
                setMessage={setConfirmationMessage}
                header={selectedComposer ? `${selectedComposer.firstname} ${selectedComposer.surname}` : null}
                message={confirmationMessage}
                onConfirm={deleteConfirmed}
            />
        </div>
    );
}

export default ComposerPanel;
