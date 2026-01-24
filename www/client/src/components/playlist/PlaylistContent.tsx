import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { useTranslation } from "react-i18next";
import { usePlaylistContext, Track } from './PlaylistContext';
import { useCookies } from 'react-cookie';
import { backendUrl } from '../../config';
import CompositionMenu from './CompositionMenu';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const PlaylistContent: React.FC = () => {
    const [cookies] = useCookies(['color']);
    const { t } = useTranslation();
    const { selectedPlaylist, playingCompositionId } = usePlaylistContext();
    const [tracks, setTracks] = useState<Track[] | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

    const reloadTracks = () => {
        if (selectedPlaylist) {
            fetch(`${backendUrl}/playlist/${selectedPlaylist.id}/compositions`)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then((tracks: Track[]) => setTracks(tracks))
                .catch(() => setTracks(null));
        } else {
            setTracks(null);
        }
    };

    useEffect(() => {
        reloadTracks();
    }, [selectedPlaylist]);

    async function patchPosition(playlistId: number, compositionId: number, newPosition: number) {
        await fetch(`${backendUrl}/playlist/${playlistId}/compositions/${compositionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: newPosition })
        });
    }

    function handleDragEnd(result: DropResult) {
        if (!tracks || !selectedPlaylist) return;
        const { source, destination } = result;
        if (!destination || source.index === destination.index) return;
        const reordered = Array.from(tracks);
        const [removed] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, removed);
        setTracks(reordered);
        patchPosition(selectedPlaylist.id, removed.compositionId, destination.index);
    }

    return (
        <div style={{ marginTop: '1rem' }}>
            {selectedPlaylist ? (
                <>
                    <div>
                        {tracks === null
                            ? 'Loading...'
                            : tracks.length === 0
                                ? t('Please go to archive to fill this playlist')
                                : (
                                    <DragDropContext onDragEnd={handleDragEnd}>
                                        <Droppable droppableId="playlist-droppable">
                                            {(provided: DroppableProvided) => (
                                                <ul
                                                    className="composition-list"
                                                    style={{ padding: 0, listStyle: 'none', minHeight: 40 }}
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {tracks.map((track, index) => {
                                                        const isPlaying = playingCompositionId === track.compositionId;
                                                        return (
                                                            <Draggable key={track.compositionId} draggableId={track.compositionId.toString()} index={index}>
                                                                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                                                    <li
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={{
                                                                            ...provided.draggableProps.style,
                                                                            background: isPlaying ? cookies.color : 'transparent',
                                                                            color: isPlaying ? '#fff' : undefined,
                                                                            borderRadius: '0.6rem',
                                                                            marginBottom: 4,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            textAlign: 'left',
                                                                            whiteSpace: 'normal',
                                                                            boxShadow: snapshot.isDragging ? '0 2px 8px #8882' : undefined,
                                                                        }}
                                                                    >
                                                                        <span
                                                                            {...provided.dragHandleProps}
                                                                            style={{
                                                                                marginRight: '0.2rem',
                                                                                color: 'inherit',
                                                                                cursor: 'grab',
                                                                                width: '2rem',
                                                                                height: '2rem',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                borderRadius: '0.6rem',
                                                                                background: '#ccc',
                                                                            }}
                                                                            tabIndex={0}
                                                                            onClick={e => e.stopPropagation()}
                                                                            title={t('Change order') || ''}
                                                                        >
                                                                            <DragIndicatorIcon fontSize="medium" />
                                                                        </span>
                                                                        <div
                                                                            style={{ flex: 1, width: '100%' }}
                                                                            onClick={() => {
                                                                                setSelectedTrack(track);
                                                                                setMenuOpen(true);
                                                                            }}
                                                                        >
                                                                            {track.composerSurname}{": "}{track.compositionName}
                                                                        </div>
                                                                    </li>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </ul>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                )}
                    </div>
                </>
            ) : null}
            {selectedTrack && (
                <CompositionMenu
                    open={menuOpen}
                    playlistId={selectedPlaylist?.id}
                    track={selectedTrack}
                    finished={() => {
                        setMenuOpen(false);
                        setSelectedTrack(null);
                        reloadTracks();
                    }}
                />
            )}
        </div>
    );
};

export default PlaylistContent;
