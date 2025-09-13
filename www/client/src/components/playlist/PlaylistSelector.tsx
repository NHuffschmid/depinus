import React, { useState, useImperativeHandle, forwardRef } from 'react';

export interface PlaylistSelectorRef {
    getPlaylist: () => string[];
    setPlaylist: (playlist: string[]) => void;
}

interface PlaylistSelectorProps {
    playlists: string[];
    onSelect?: (selected: string) => void;
}

const PlaylistSelector = forwardRef<PlaylistSelectorRef, PlaylistSelectorProps>(({ playlists, onSelect }, ref) => {
    const [playlist, setPlaylist] = useState<string[]>(playlists);
    const [selected, setSelected] = useState<string>(playlists[0] || '');

    useImperativeHandle(ref, () => ({
        getPlaylist: () => playlist,
        setPlaylist: (newPlaylist: string[]) => {
            setPlaylist(newPlaylist);
            setSelected(newPlaylist[0] || '');
        }
    }), [playlist]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelected(e.target.value);
        if (onSelect) onSelect(e.target.value);
    };

    return (
        <div>
            <select id="playlist-combobox" style={{ fontSize: '1.2rem' }} value={selected} onChange={handleChange}>
                {playlist.map((pl, idx) => (
                    <option key={idx} value={pl}>{pl}</option>
                ))}
            </select>
        </div>
    );
});

export default PlaylistSelector;
