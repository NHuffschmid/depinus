import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { usePlaylistContext } from './PlaylistContext';
import { backendUrl } from '../../config';

const PlaylistContent: React.FC = () => {
    const { t } = useTranslation();
    const { playlists, selected } = usePlaylistContext();
    const selectedPlaylist = playlists.find(pl => pl.id === selected);
    const [compositions, setCompositions] = useState<any[] | null>(null);

    useEffect(() => {
        if (selectedPlaylist) {
            fetch(`${backendUrl}/playlist/${selectedPlaylist.id}/compositions`)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then((compositions: any[]) => setCompositions(compositions))
                .catch(() => setCompositions(null));
        } else {
            setCompositions(null);
        }
    }, [selectedPlaylist]);

    return (
        <div style={{ marginTop: '1rem' }}>
            {selectedPlaylist ? (
                <>
                    <div>
                        {compositions === null
                            ? 'Loading...'
                            : compositions.length === 0
                                ? t('Please go to archive to fill this playlist')
                                : (
                                    <ul className="composition-list">
                                        {compositions.map(composition => (
                                            <li
                                                className="composition-listitem"
                                                key={composition.compositionId}
                                            >
                                                <span>{composition.composerSurname}</span>
                                                {" - "}
                                                <span>{composition.compositionName}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                    </div>
                </>
            ) : (
                <span>{t('No playlist selected')}</span>
            )}
        </div>
    );
};

export default PlaylistContent;
