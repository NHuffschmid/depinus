
import React from 'react';
import { usePlaylistContext } from './PlaylistContext';

interface PlaylistSelectorProps {
    playlists: string[];
    onSelect?: (selected: string) => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ playlists, onSelect }) => {
    const { selected, setSelected } = usePlaylistContext();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelected(e.target.value);
        if (onSelect) onSelect(e.target.value);
    };

    return (
        <div>
            <select id="playlist-combobox" style={{ fontSize: '1.2rem' }} value={selected} onChange={handleChange}>
                {playlists.map((pl, idx) => (
                    <option key={idx} value={pl}>{pl}</option>
                ))}
            </select>
        </div>
    );
};

export default PlaylistSelector;
