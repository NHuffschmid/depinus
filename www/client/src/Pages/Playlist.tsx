import React from 'react';
import PlaylistPanel from '../components/playlist/PlaylistPanel';
import PlaylistContent from '../components/playlist/PlaylistContent';

const Playlist: React.FC = () => {
    return (
        <div style={{ margin: '0.5rem' }}>
            <PlaylistPanel />
            <PlaylistContent />
        </div>
    );
};

export default Playlist;
