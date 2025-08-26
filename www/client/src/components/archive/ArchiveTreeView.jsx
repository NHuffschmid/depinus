import React from 'react';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from "react-i18next";
import TreeView from "react-accessible-treeview";
import { IoMdArrowDropright } from "react-icons/io";
import { FaSquare, FaCheckSquare, FaMinusSquare } from "react-icons/fa";
import cx from "classnames";

const ArchiveTreeView = forwardRef((props, ref) => {

  const selectedIdsRef = useRef(0);
  const { t } = useTranslation();

  const [atvData, setAtvData] = useState([
    { name: 'root', children: ['archive'], id: 'root', parent: null },
    { name: t('Archive'), children: [], id: 'archive', parent: 'root' }
  ]);

  useImperativeHandle(ref, () => ({
    getSelection() {
      const selection = [];
      let composer = null;
      let currentComposerId = 0;
      selectedIdsRef.current.forEach((node) => {
        if (node.startsWith('Composition-')) {
          const regex = /-(\d+)-(\d+)/;
          const compositionId = Number(regex.exec(node)[1]);
          const composerId = Number(regex.exec(node)[2]);
          if (composerId !== currentComposerId) {
            composer = {
              'composerId': composerId,
              'compositionIds': []
            }
            selection.push(composer);
            currentComposerId = composerId;
          }
          composer.compositionIds.push(compositionId);
        }
      });
      return selection;
    }
  }));

  useEffect(() => {
    const atvArray = []; // input data for react-accessible-treeview
    const archiveChildrenList = [];
    atvArray.push({ name: "root", children: ['archive'], id: 'root', parent: null });
    atvArray.push({ name: t('Archive'), children: archiveChildrenList, id: 'archive', parent: 'root' });
    props.data.forEach((composer) => {
      const composerChildrenList = [];
      const atvComposer = {
        name: composer.name,
        children: composerChildrenList,
        id: 'Composer-' + composer.id,
        parent: 'archive'
      };
      composer.compositions.forEach((composition) => {
        const atvComposition = {
          name: composition.name,
          children: [],
          id: 'Composition-' + composition.id + '-' + composer.id,
          parent: 'Composer-' + composer.id
        };
        atvArray.push(atvComposition);
        composerChildrenList.push(atvComposition.id);
      });
      atvArray.push(atvComposer);
      archiveChildrenList.push(atvComposer.id);
    });
    setAtvData(atvArray);
  }, [props]);

  return (
    <div className='treeview'>
      <TreeView
        data={atvData}
        aria-label="Data type Map tree"
        multiSelect
        propagateSelect
        propagateSelectUpwards
        togglableSelect
        defaultSelectedIds={['archive']}
        defaultExpandedIds={['archive']}
        onLoadData={(element, isExpanded, isSelected, isHalfSelected, isDisabled, treeState) => {
        }} // why do we need this to make defaultSelectedIds works???
        onSelect={({ element, isBranch, isExpanded, isSelected, isHalfSelected, isDisabled, treeState }) => {
          props.onSelectionChanged(selectedIdsRef.current.size);
        }}
        nodeRenderer={({
          element,
          isBranch,
          isExpanded,
          isSelected,
          isHalfSelected,
          getNodeProps,
          handleSelect,
          handleExpand,
          dispatch,
          treeState,
        }) => {
          selectedIdsRef.current = treeState.selectedIds;
          setTimeout(() => { // avoid render collision warning
            if (!isBranch && (element.parent === 'archive') && (!getNodeProps().disabled)) {
              // disable composers without compositions
              dispatch({ type: 'DISABLE', id: element.id })
            }
          }, 0);
          return (
            <div {...getNodeProps({ onClick: handleExpand })}>
              {isBranch && <ArrowIcon isOpen={isExpanded} />}
              <CheckBoxIcon
                className="checkbox-icon"
                onClick={(e) => {
                  handleSelect(e);
                  e.stopPropagation();
                }}
                variant={isHalfSelected ? "some" : isSelected ? "all" : "none"}
              />
              <span>{element.name}</span>
            </div>
          );
        }}
      />
    </div>
  );
});

const ArrowIcon = ({ isOpen, className }) => {
  const baseClass = "arrow";
  const classes = cx(
    baseClass,
    { [`${baseClass}--closed`]: !isOpen },
    { [`${baseClass}--open`]: isOpen },
    className
  );
  return <IoMdArrowDropright className={classes} />;
};

const CheckBoxIcon = ({ variant, ...rest }) => {
  switch (variant) {
    case "all":
      return <FaCheckSquare {...rest} />;
    case "none":
      return <FaSquare {...rest} />;
    case "some":
      return <FaMinusSquare {...rest} />;
    default:
      return null;
  }
};

export default ArchiveTreeView;
