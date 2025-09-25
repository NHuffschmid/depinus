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
    selectedPlaylistId: number | null;
    setSelectedPlaylistId: (selected: number | null) => void;
    selectedPosition: number | null;
    setSelectedPosition: (selected: number | null) => void;
    shuffle: boolean;
    setShuffle: (shuffle: boolean) => void;
    repeat: RepeatMode;
    setRepeat: (repeat: RepeatMode) => void;
    playing: boolean;
    setPlaying: (playing: boolean) => void;
    currentlyPlayedPosition: number | null;
    setCurrentlyPlayedPosition: (position: number | null) => void;
    play: (id: number) => void;
    stop: () => void;
    next: () => void;
    previous: () => void;
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
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
    const [shuffle, setShuffle] = useState<boolean>(false);
    const [repeat, setRepeat] = useState<RepeatMode>('off');
    const [playing, setPlaying] = useState<boolean>(false);
    const [currentlyPlayedPosition, setCurrentlyPlayedPosition] = useState<number | null>(null);

    const play = (compositionId: number) => {
        //console.log(`Playing composition with ID ${compositionId} (position: ${selectedPosition})`);
        setPlaying(true);
        fetch(backendUrl + '/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compositionId: compositionId
            })
        })
            .catch(error => {
                console.error('Error sending play request:', error);
            });
    };

    const stop = () => {
        setPlaying(false);
    };
    const next = () => {
        setCurrentlyPlayedPosition(prev => (prev !== null ? prev + 1 : 0));
    };
    const previous = () => {
        setCurrentlyPlayedPosition(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    };

    useEffect(() => {
        fetch(backendUrl + '/playlist')
            .then((response) => response.json())
            .then((data) => {
                setPlaylists(data);
                if (data.length > 0) setSelectedPlaylistId(data[0].id);
            });
    }, []);

    return (
        <PlaylistContext.Provider value={{
            playlists, setPlaylists, selectedPlaylistId, setSelectedPlaylistId,
            selectedPosition, setSelectedPosition, shuffle, setShuffle, repeat,
            setRepeat, playing, setPlaying, currentlyPlayedPosition,
            setCurrentlyPlayedPosition, play, stop, next, previous
        }}>
            {children}
        </PlaylistContext.Provider>
    );
};
