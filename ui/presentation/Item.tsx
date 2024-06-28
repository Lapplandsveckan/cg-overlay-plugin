import React from 'react';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface PresentationRundownItemProps {
    entry: RundownEntry;
}

export const PresentationRundownItem: React.FC<PresentationRundownItemProps> = ({entry}) => {
    return null;
}

export default PresentationRundownItem;