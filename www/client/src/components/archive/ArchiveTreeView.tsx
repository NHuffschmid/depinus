import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from "react-i18next";
import TreeView from "react-accessible-treeview";
import { IoMdArrowDropright } from "react-icons/io";
import { FaSquare, FaCheckSquare, FaMinusSquare } from "react-icons/fa";
import cx from "classnames";

interface Composer {
    id: number;
    name: string;
    compositions: { id: number; name: string }[];
}
interface ArchiveTreeViewProps {
    data: Composer[];
    onSelectionChanged: (count: number) => void;
}

export interface ArchiveTreeViewRef {
    getSelection: () => Array<{ composerId: number; compositionIds: number[] }>;
}

const ArchiveTreeView = forwardRef<ArchiveTreeViewRef, ArchiveTreeViewProps>((props, ref) => {
    const selectedIdsRef = useRef<any>(new Set());
    const { t } = useTranslation();
    const [atvData, setAtvData] = useState<any[]>([
        { name: 'root', children: ['archive'], id: 'root', parent: null },
        { name: t('Archive'), children: [], id: 'archive', parent: 'root' }
    ]);

    useImperativeHandle(ref, () => ({
        getSelection() {
            const selection: Array<{ composerId: number; compositionIds: number[] }> = [];
            let composer: any = null;
            let currentComposerId = 0;
            selectedIdsRef.current.forEach((node: string) => {
                if (node.startsWith('Composition-')) {
                    const regex = /-(\d+)-(\d+)/;
                    const match = regex.exec(node);
                    if (!match) return;
                    const compositionId = Number(match[1]);
                    const composerId = Number(match[2]);
                    if (composerId !== currentComposerId) {
                        composer = {
                            composerId: composerId,
                            compositionIds: []
                        };
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
        const atvArray: any[] = []; // input data for react-accessible-treeview
        const archiveChildrenList: string[] = [];
        atvArray.push({ name: "root", children: ['archive'], id: 'root', parent: null });
        atvArray.push({ name: t('Archive'), children: archiveChildrenList, id: 'archive', parent: 'root' });
        props.data.forEach((composer) => {
            const composerChildrenList: string[] = [];
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
                onLoadData={async (_props: any) => { }}
                onSelect={({ treeState }: any) => {
                    selectedIdsRef.current = treeState.selectedIds;
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
                }: any) => {
                    setTimeout(() => { // avoid render collision warning
                        // disable composers without compositions
                        const nodeProps = getNodeProps();
                        if (!isBranch && (element.parent === 'archive') && !(nodeProps as any).disabled) {
                            dispatch({ type: 'DISABLE', id: element.id })
                        }
                    }, 0);
                    return (
                        <div {...getNodeProps({ onClick: handleExpand })}>
                            {isBranch && <ArrowIcon isOpen={isExpanded} />}
                            <CheckBoxIcon
                                className="checkbox-icon"
                                onClick={(e: React.MouseEvent<SVGElement>) => {
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

interface ArrowIconProps {
    isOpen: boolean;
    className?: string;
}
const ArrowIcon: React.FC<ArrowIconProps> = ({ isOpen, className }) => {
    const baseClass = "arrow";
    const classes = cx(
        baseClass,
        { [`${baseClass}--closed`]: !isOpen },
        { [`${baseClass}--open`]: isOpen },
        className
    );
    return <IoMdArrowDropright className={classes} />;
};

interface CheckBoxIconProps extends React.SVGProps<SVGElement> {
    variant: "all" | "none" | "some";
}
const CheckBoxIcon: React.FC<CheckBoxIconProps> = ({ variant, ...rest }) => {
    switch (variant) {
        case "all":
            return <FaCheckSquare {...rest as any} />;
        case "none":
            return <FaSquare {...rest as any} />;
        case "some":
            return <FaMinusSquare {...rest as any} />;
        default:
            return null;
    }
};

export default ArchiveTreeView;
