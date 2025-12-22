import React, { useState } from 'react';
import { useCookies } from 'react-cookie';
import ComposerPanel from './ComposerPanel';
import UploadCompositionPanel from './UploadCompositionPanel';
import CompositionMenu from './CompositionMenu';
import { backendUrl } from '../../config';

const ArchiveView: React.FC = () => {
    const [cookies] = useCookies(['color']);
    const [composer, setComposer] = useState<any>();
    const [compositions, setCompositions] = useState<any[]>();
    const [selectedComposition, setSelectedComposition] = useState<any>();
    const [openCompositionMenu, setOpenCompositionMenu] = useState(false);

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
            <ComposerPanel updateComposer={updateComposer} />
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
