import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from "react-i18next";
import { usePlaylistContext } from './PlaylistContext';
import CompositionMenu from './CompositionMenu';
import { backendUrl } from '../../config';

const PlaylistContent: React.FC = () => {
    const { t } = useTranslation();
    const { playlists, selected } = usePlaylistContext();
    const selectedPlaylist = playlists.find(pl => pl.id === selected);
    const [compositions, setCompositions] = useState<any[] | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedComposition, setSelectedComposition] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        if (selectedPlaylist) {
            fetch(`${backendUrl}/playlist/${selectedPlaylist.id}/compositions`)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then((compositions: any[]) => setCompositions(
                    compositions.map(c => ({ ...c, compositionId: c.compositionId.toString() }))
                ))
                .catch(() => setCompositions(null));
        } else {
            setCompositions(null);
        }
    }, [selectedPlaylist]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    function SortableItem({ id, children }: { id: string, children: React.ReactNode }) {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            background: isDragging ? '#e0e7ff' : undefined,
            borderRadius: 4,
            marginBottom: 4,
            boxShadow: isDragging ? '0 2px 8px #8882' : undefined,
            display: 'flex',
            alignItems: 'center',
            cursor: 'default'
        };
        return (
            <li ref={setNodeRef} style={style} {...attributes}>
                <span
                    {...listeners}
                    style={{ cursor: 'grab', marginRight: 8, fontSize: 18, userSelect: 'none', touchAction: 'none' }}
                    aria-label='Drag handle'
                >☰</span>
                {children}
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
        if (!compositions || !selectedPlaylist) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = compositions.findIndex(c => c.compositionId === active.id);
        const newIndex = compositions.findIndex(c => c.compositionId === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(compositions, oldIndex, newIndex);
        setCompositions(reordered);
        patchPosition(selectedPlaylist.id, active.id, newIndex);
    }

    return (
        <div style={{ marginTop: '1rem' }}>
            {selectedPlaylist ? (
                <>
                    <div>
                        {compositions === null
                            ? 'Loading...'
                            : compositions.length === 0
                                ? t('Please go to archive to fill this playlist')
                                : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={compositions.map(c => c.compositionId)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <ul className="composition-list" style={{ padding: 0, listStyle: 'none', minHeight: 40 }}>
                                                {compositions.map(composition => (
                                                    <SortableItem key={composition.compositionId} id={composition.compositionId}>
                                                        <div
                                                            style={{ display: 'flex', alignItems: 'center', width: '100%' }}
                                                            onClick={() => {
                                                                setSelectedComposition({
                                                                    id: composition.compositionId,
                                                                    name: `${composition.compositionName} – ${composition.composerFirstname} ${composition.composerSurname}`
                                                                });
                                                                setMenuOpen(true);
                                                            }}
                                                        >
                                                            {composition.composerSurname}
                                                            {": "}
                                                            {composition.compositionName}
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
            <CompositionMenu
                open={menuOpen}
                composition={selectedComposition}
                finished={() => {
                    setMenuOpen(false);
                    setSelectedComposition(null);
                }}
            />
        </div>
    );
};

export default PlaylistContent;
