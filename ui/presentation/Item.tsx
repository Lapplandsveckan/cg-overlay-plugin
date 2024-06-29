import React from 'react';
import {Typography} from '@mui/material';

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
    return (
        <Typography variant="h6">
            ATEM: {entry.data.atem}
        </Typography>
    )
}

export default PresentationRundownItem;
