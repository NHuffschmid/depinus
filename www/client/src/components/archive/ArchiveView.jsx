import React from 'react';
import { useState } from 'react';
import { useCookies } from 'react-cookie';
import ComposerPanel from './ComposerPanel';
import UploadCompositionPanel from './UploadCompositionPanel';
import CompositionMenu from './CompositionMenu';
import { backendUrl } from '../../config';

const ArchiveView = () => {

  const [cookies] = useCookies(['color']);

  const [composer, setComposer] = useState();
  const [compositions, setCompositions] = useState();
  const [selectedComposition, setSelectedComposition] = useState();
  const [openCompositionMenu, setOpenCompositionMenu] = useState(false);

  const getCompositions = (composer) => {
    if (composer === null) {
      setCompositions();
    }
    else {
      //console.log('Getting compositions of composer with ID ' + composer.id);
      fetch(backendUrl + '/archive/compositions?composerId=' + composer.id)
        .then((response) => response.json())
        .then((data) => {
          setCompositions(data);
          setSelectedComposition();
          setOpenCompositionMenu(false);
        })
    }
  }

  const updateCompositions = () => {
    getCompositions(composer);
  }

  const updateComposer = (composer) => {
    //console.log('Selected composer with ID ' + composer.id);
    setComposer(composer);
    getCompositions(composer);
  }

  return (
    <React.Fragment>
      <ComposerPanel updateComposer={updateComposer} />
      <div style={{
        marginTop: '1rem'
      }}>
        <ul style={{
          visibility: compositions ? 'visible' : 'hidden',
          listStyleType: 'none',
          padding: '0.5rem',
          margin: '0',
          border: '1px solid #333',
          borderRadius: '12px',
        }}>
          {compositions ? compositions.map((composition, i) => (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto'
            }} key={i}>
              <li
                style={{
                  margin: '0rem',
                  padding: '0rem',
                  textAlign: 'left',
                  background: selectedComposition &&
                    (composition.id === parseInt(selectedComposition.id)) ?
                    cookies.color : 'transparent'
                }}
                key={composition.id}
                value={composition.id}
                onClick={(e) => {
                  if (!selectedComposition) {
                    for (composition of compositions) {
                      if (composition.id === parseInt(e.target.value)) {
                        setSelectedComposition(composition);
                      }
                    }
                    setOpenCompositionMenu(true);
                  }
                  else {
                    setSelectedComposition();
                    setOpenCompositionMenu(false);
                  }

                }}>
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
