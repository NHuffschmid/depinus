import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import ComposerPanel from './ComposerPanel';
import UploadCompositionPanel from './UploadCompositionPanel';
import CompositionMenu from './CompositionMenu';
import { backendUrl } from '../../config';
import useDepinusWebSocket from '../../custom-hooks/useDepinusWebsocket';

const ArchiveView: React.FC = () => {
    const [cookies] = useCookies(['color']);
    const location = useLocation();
    const [composer, setComposer] = useState<any>();
    const [compositions, setCompositions] = useState<any[]>();
    const [selectedComposition, setSelectedComposition] = useState<any>();
    const [openCompositionMenu, setOpenCompositionMenu] = useState(false);
    const [refreshComposers, setRefreshComposers] = useState(0);
    const [selectComposerName, setSelectComposerName] = useState<string | null>(null);

    // Check if we were navigated here with a composer to select
    useEffect(() => {
        const state = location.state as { selectComposer?: string } | null;
        if (state?.selectComposer) {
            setRefreshComposers(prev => prev + 1);
            setSelectComposerName(state.selectComposer);
        }
    }, [location]);

    useDepinusWebSocket({
        name: 'ArchiveView',
        onInfoMessage: (message: any) => {
            if ('recordingSaved' in message && message.recordingSaved) {
                // New recording was saved, refresh composers and select "Depinus"
                setRefreshComposers(prev => prev + 1);
                setSelectComposerName('Depinus');
            }
        }
    });

    const getCompositions = (composer: any) => {
        if (composer === null) {
            //console.log('Getting compositions of composer with ID ' + composer.id);
            setCompositions(undefined);
        } else {
            fetch(backendUrl + '/archive/compositions?composerId=' + composer.id)
                .then((response) => response.json())
                .then((data) => {
                    setCompositions(data);
                    setSelectedComposition(undefined);
                    setOpenCompositionMenu(false);
                });
        }
    }

    const updateCompositions = () => {
        getCompositions(composer);
    }

    const updateComposer = (composer: any) => {
        //console.log('Selected composer with ID ' + composer.id);
        setComposer(composer);
        getCompositions(composer);
    }

    return (
        <React.Fragment>
            <ComposerPanel 
                updateComposer={updateComposer} 
                refreshTrigger={refreshComposers}
                selectComposerName={selectComposerName}
                onComposerSelected={() => setSelectComposerName(null)}
            />
            <div style={{ marginTop: '1rem' }}>
                <ul
                    className="composition-list"
                    style={{ visibility: compositions ? 'visible' : 'hidden' }}
                >
                    {compositions ? compositions.map((composition, i) => (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto' }} key={i}>
                            <li
                                className="composition-listitem"
                                style={{ background: selectedComposition && (composition.id === parseInt(selectedComposition.id)) ? cookies.color : 'transparent' }}
                                key={composition.id}
                                data-id={composition.id}
                                onClick={(e) => {
                                    const id = (e.target as HTMLElement).getAttribute('data-id');
                                    if (!selectedComposition) {
                                        for (const comp of compositions) {
                                            if (comp.id === parseInt(id ?? '')) {
                                                setSelectedComposition(comp);
                                            }
                                        }
                                        setOpenCompositionMenu(true);
                                    } else {
                                        setSelectedComposition(undefined);
                                        setOpenCompositionMenu(false);
                                    }
                                }}
                            >
                                {composition.name}
                            </li>
                        </div>
                    )) : ''}
                </ul>
            </div>
            <CompositionMenu
                open={openCompositionMenu}
                composition={selectedComposition}
                finished={updateCompositions}
            />
            {composer ? (
                <UploadCompositionPanel
                    composerId={composer.id}
                    finished={updateCompositions}
                />
            ) : null}
        </React.Fragment>
    );
}

export default ArchiveView;
