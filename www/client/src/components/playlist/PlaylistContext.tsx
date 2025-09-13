import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PlaylistContextType {
    playlists: string[];
    setPlaylists: (playlists: string[]) => void;
    selected: string;
    setSelected: (selected: string) => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const usePlaylistContext = () => {
    const context = useContext(PlaylistContext);
    if (!context) {
        throw new Error('usePlaylistContext must be used within a PlaylistProvider');
    }
    return context;
};

export const PlaylistProvider = ({ children }: { children: ReactNode }) => {
    const [playlists, setPlaylists] = useState<string[]>([
        'Classical Favorites',
        'Jazz Essentials',
        'Rock Hits',
        'Chill Vibes'
    ]);
    const [selected, setSelected] = useState<string>(playlists[0]);

    return (
        <PlaylistContext.Provider value={{ playlists, setPlaylists, selected, setSelected }}>
            {children}
        </PlaylistContext.Provider>
    );
};
