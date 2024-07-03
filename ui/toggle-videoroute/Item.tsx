import React from 'react';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface ToggleVideoRouteRundownItemProps {
    entry: RundownEntry;
}

export const ToggleVideoRouteRundownItem: React.FC<ToggleVideoRouteRundownItemProps> = ({entry}) => {
    return null;
}

export default ToggleVideoRouteRundownItem;
