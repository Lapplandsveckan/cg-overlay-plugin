import React from 'react';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface BarsRundownItemProps {
    entry: RundownEntry;
}

export const BarsRundownItem: React.FC<BarsRundownItemProps> = ({entry}) => {
    return null;
}

export default BarsRundownItem;