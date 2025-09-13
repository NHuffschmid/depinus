import React, { useRef } from 'react';
import PlaylistSelector, { PlaylistSelectorRef } from './components/playlist/PlaylistSelector';

const initialPlaylists = [
    'Classical Favorites',
    'Jazz Essentials',
    'Rock Hits',
    'Chill Vibes'
];

const Playlist: React.FC = () => {
    const selectorRef = useRef<PlaylistSelectorRef>(null);

    // Example: Access playlist state from outside
    // const currentPlaylist = selectorRef.current?.getPlaylist();

    return (
        <div style={{ padding: '2rem' }}>
            <h2>Playlist</h2>
            <PlaylistSelector ref={selectorRef} playlists={initialPlaylists} />
        </div>
    );
};

export default Playlist;
