import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from "react-i18next";
import { usePlaylistContext, Track } from './PlaylistContext';
import { useCookies } from 'react-cookie';
import CompositionMenu from './CompositionMenu';
import { backendUrl } from '../../config';

const PlaylistContent: React.FC = () => {
    const [cookies] = useCookies(['color']);
    const { t } = useTranslation();
    const { selectedPlaylist } = usePlaylistContext();
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

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    function SortableItem({ id, children }: { id: number, children: React.ReactNode }) {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            background: selectedTrack && (id === selectedTrack?.compositionId) ? cookies.color : 'transparent',
            borderRadius: 4,
            marginBottom: 4,
            boxShadow: isDragging ? '0 2px 8px #8882' : undefined,
            display: 'flex',
            alignItems: 'flex-start',
            cursor: 'default',
            textAlign: 'left',
            whiteSpace: 'normal'
        };
        return (
            <li ref={setNodeRef} style={style as any} {...attributes}>
                <span
                    {...listeners}
                    style={{ cursor: 'grab', marginRight: 8, fontSize: 18, userSelect: 'none', touchAction: 'none' }}
                    aria-label='Drag handle'
                    onClick={e => e.stopPropagation()} // Drag-Handle schluckt Klicks
                >☰</span>
                <div
                    style={{ flex: 1, width: '100%' }}
                    onClick={React.isValidElement(children) ? children.props.onClick : undefined}
                >
                    {React.isValidElement(children) ? children.props.children : children}
                </div>
            </li>
        );
    }

    async function patchPosition(playlistId: number, compositionId: string, newPosition: number) {
        await fetch(`${backendUrl}/playlist/${playlistId}/compositions/${compositionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: newPosition })
        });
    }

    function handleDragEnd(event: any) {
        if (!tracks || !selectedPlaylist) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = tracks.findIndex(c => c.compositionId === active.id);
        const newIndex = tracks.findIndex(c => c.compositionId === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(tracks, oldIndex, newIndex);
        setTracks(reordered);
        patchPosition(selectedPlaylist.id, active.id, newIndex);
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
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={tracks.map(c => c.compositionId)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <ul className="composition-list" style={{ padding: 0, listStyle: 'none', minHeight: 40 }}>
                                                {tracks.map(track => (
                                                    <SortableItem key={track.compositionId} id={track.compositionId}>
                                                        <div
                                                            onClick={() => {
                                                                setSelectedTrack(track);
                                                                setMenuOpen(true);
                                                            }}
                                                        >
                                                            {track.composerSurname}{": "}{track.compositionName}
                                                        </div>
                                                    </SortableItem>
                                                ))}
                                            </ul>
                                        </SortableContext>
                                    </DndContext>
                                )}
                    </div>
                </>
            ) : (
                <span>{t('No playlist selected')}</span>
            )}
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
