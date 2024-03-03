import {Button} from '@mui/material';
// @ts-ignore
import {useSocket} from '@web-lib';
import React from 'react';

async function toggleSwish(conn: any) {
    await conn.rawRequest('/api/plugin/overlay/swish', 'ACTION', {});
}

async function showNamnskylt(conn: any, name: string) {
    await conn.rawRequest('/api/plugin/overlay/namnskylt', 'ACTION', { name });
}

const SwishTest = () => {
    const conn = useSocket();

    return (
        <>
            <Button
                onClick={() => toggleSwish(conn)}
            >
                Swish
            </Button>
            <Button
                onClick={() => showNamnskylt(conn, 'Eliyah Sundström')}
            >
                Namnskylt
            </Button>
        </>
    );
};

export default SwishTest;