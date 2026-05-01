import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmationDialog } from './MessageBox';
import ExportArchiveDialog from './archive/ExportArchiveDialog';
import ImportArchiveDialog from './archive/ImportArchiveDialog';
import { backendUrl } from '../config';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { IVORY_REALISTIC_CLASS, EBONY_REALISTIC_CLASS } from './react-piano-keyboard/src';

// ── Types ────────────────────────────────────────────────────────────────────

interface WhiteKeyProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}

interface BlackKeyProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const WhiteKey: React.FC<WhiteKeyProps> = ({ icon, label, onClick, danger }) => (
    <button
        className={`piano-nav__key piano-nav__key--white ${IVORY_REALISTIC_CLASS}${danger ? ' piano-nav__key--danger' : ''}`}
        onClick={onClick}
        type="button"
    >
        <span className="piano-nav__icon">{icon}</span>
        <span className="piano-nav__label">{label}</span>
    </button>
);

const BlackKey: React.FC<BlackKeyProps> = ({ icon, label, onClick }) => (
    <button
        className={`piano-nav__key piano-nav__key--black ${EBONY_REALISTIC_CLASS}`}
        onClick={onClick}
        type="button"
    >
        <span className="piano-nav__icon piano-nav__icon--black">{icon}</span>
        <span className="piano-nav__label piano-nav__label--black">{label}</span>
    </button>
);

// ── Main component ────────────────────────────────────────────────────────────

const HomeNav: React.FC = () => {
    const { t } = useTranslation();
    const [exportOpen, setExportOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [shutdownMessage, setShutdownMessage] = useState<string | undefined>();

    const playDemo = () => {
        fetch(backendUrl + '/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ compositionId: 0 }),
        }).catch(console.error);
    };

    const requestShutdown = () => {
        const msg = t('Are you sure?');
        setShutdownMessage(typeof msg === 'string' ? msg : undefined);
    };

    const confirmShutdown = (result: boolean) => {
        setShutdownMessage(undefined);
        if (result) {
            fetch(backendUrl + '/shutdown', { method: 'POST' }).catch(console.error);
        }
    };

    return (
        <nav className="piano-nav" aria-label={t('Main navigation') ?? 'Main navigation'}>
            {/* 
                Layout: three white keys with one black key overlapping
                the gap between key 1 (Demo) and key 2 (Export).
                Negative margins pull the black key over its neighbours.
            */}
            <WhiteKey
                icon={<MusicNoteIcon fontSize="inherit" />}
                label={t('Demo')}
                onClick={playDemo}
            />

            <BlackKey
                icon={<PowerSettingsNewIcon fontSize="inherit" />}
                label={t('Shutdown')}
                onClick={requestShutdown}
            />

            <WhiteKey
                icon={<UploadIcon fontSize="inherit" />}
                label={t('Export archive')}
                onClick={() => setExportOpen(true)}
            />

            <WhiteKey
                icon={<DownloadIcon fontSize="inherit" />}
                label={t('Import archive')}
                onClick={() => setImportOpen(true)}
            />

            {/* Dialogs */}
            <ConfirmationDialog
                open={shutdownMessage !== undefined}
                setMessage={setShutdownMessage}
                header={t('Shutdown')}
                message={shutdownMessage}
                onConfirm={confirmShutdown}
            />
            <ExportArchiveDialog open={exportOpen} closed={() => setExportOpen(false)} />
            <ImportArchiveDialog open={importOpen} closed={() => setImportOpen(false)} />
        </nav>
    );
};

export default HomeNav;
