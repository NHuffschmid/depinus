import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { backendUrl } from '../../config';

export interface Playlist {
    id: number;
    name: string;
}

type RepeatMode = 'off' | 'playlist' | 'composition';

interface PlaylistContextType {
    playlists: Playlist[];
    setPlaylists: (playlists: Playlist[]) => void;
    selected: number | null;
    setSelected: (selected: number | null) => void;
    shuffle: boolean;
    setShuffle: (shuffle: boolean) => void;
    repeat: RepeatMode;
    setRepeat: (repeat: RepeatMode) => void;
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
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [shuffle, setShuffle] = useState<boolean>(false);
    const [repeat, setRepeat] = useState<RepeatMode>('off');

    useEffect(() => {
        fetch(backendUrl + '/playlist')
            .then((response) => response.json())
            .then((data) => {
                setPlaylists(data);
                if (data.length > 0) setSelected(data[0].id);
            });
    }, []);

    return (
        <PlaylistContext.Provider value={{ playlists, setPlaylists, selected, setSelected, shuffle, setShuffle, repeat, setRepeat }}>
            {children}
        </PlaylistContext.Provider>
    );
};
