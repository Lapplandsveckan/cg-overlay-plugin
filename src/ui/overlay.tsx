import {Button} from '@mui/material';
// @ts-ignore
import {useSocket} from '@web-lib';
import React from 'react';

async function toggleSwish(conn: any) {
    await conn.rawRequest('/api/plugin/overlay/swish', 'ACTION', {});
}

const SwishTest = () => {
    const conn = useSocket();

    return (
        <>
            <Button
                onClick={() => toggleSwish(conn)}
            >
                Template
            </Button>
        </>
    );
};

export default SwishTest;