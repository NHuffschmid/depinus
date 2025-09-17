import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { backendUrl } from '../../config';

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
    const [playlists, setPlaylists] = useState<string[]>([]);
    const [selected, setSelected] = useState<string>('');

    useEffect(() => {
        fetch(backendUrl + '/playlist')
            .then((response) => response.json())
            .then((data) => {
                // data is array of { id, name }
                const names = data.map((pl: { id: number, name: string }) => pl.name);
                setPlaylists(names);
                if (names.length > 0) setSelected(names[0]);
            });
    }, []);

    return (
        <PlaylistContext.Provider value={{ playlists, setPlaylists, selected, setSelected }}>
            {children}
        </PlaylistContext.Provider>
    );
};
