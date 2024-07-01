import {Button, Stack, TextField} from '@mui/material';
// @ts-ignore
import {useSocket} from '@web-lib';
import React from 'react';
import {MotionControl} from './motion';
import VideoQueue from './video';

// Actions

async function toggleSwish(conn: any, number?: string) {
    await conn.rawRequest('/api/plugin/lappis/swish', 'ACTION', { number });
}

async function showNamnskylt(conn: any, name: string) {
    await conn.rawRequest('/api/plugin/lappis/namnskylt', 'ACTION', { name });
}

async function toggleVideotransition(conn: any) {
    await conn.rawRequest('/api/plugin/lappis/videotransition', 'ACTION', {});
}

async function toggleBars(conn: any) {
    await conn.rawRequest('/api/plugin/lappis/bars', 'ACTION', {});
}

async function toggleInsamling(conn: any, options?: { goal?: number, now?: number }) {
    await conn.rawRequest('/api/plugin/lappis/insamling', 'ACTION', options);
}


// Components

const SwishTest = () => {
    const conn = useSocket();
    const [number, setNumber] = React.useState('');

    return (
        <Stack>
            <TextField
                label={'Number'}
                value={number}
                InputLabelProps={{
                    shrink: true,
                }}
                placeholder={'123 607 27 97'}
                onChange={e => setNumber(e.target['value'])}
                sx={{
                    flexGrow: 1,
                }}
            />
            <Button
                onClick={() => toggleSwish(conn, number)}
            >
                Swish
            </Button>
        </Stack>
    );
};

const NamnskyltTest = () => {
    const conn = useSocket();
    const [name, setName] = React.useState('Eliyah Sundström');

    return (
        <Stack>
            <TextField
                label={'Name'}
                value={name}
                InputLabelProps={{
                    shrink: true,
                }}
                onChange={e => setName(e.target['value'])}
                sx={{
                    flexGrow: 1,
                }}
                required={true}
                error={name === ''}
            />
            <Button
                onClick={() => name && showNamnskylt(conn, name)}
            >
                Namnskylt
            </Button>
        </Stack>
    );
};

const VideotransitionTest = () => {
    const conn = useSocket();

    return (
        <Button
            onClick={() => toggleVideotransition(conn)}
        >
            Videotransition
        </Button>
    );
};

const BarsTest = () => {
    const conn = useSocket();

    return (
        <Button
            onClick={() => toggleBars(conn)}
        >
            Bars
        </Button>
    );
};

const InsamlingTest = () => {
    const conn = useSocket();
    const [goal, setGoal] = React.useState(1000);
    const [now, setNow] = React.useState(500);

    return (
        <Stack>
            <TextField
                label={'Goal'}
                type={'number'}
                value={goal}
                InputLabelProps={{
                    shrink: true,
                }}
                onChange={e => setGoal(parseInt(e.target['value']))}
                sx={{
                    flexGrow: 1,
                }}
            />
            <TextField
                label={'Now'}
                type={'number'}
                value={now}
                InputLabelProps={{
                    shrink: true,
                }}
                onChange={e => setNow(parseInt(e.target['value']))}
                sx={{
                    flexGrow: 1,
                }}
            />
            <Button
                onClick={() => toggleInsamling(conn, { goal, now })}
            >
                Insamling
            </Button>
        </Stack>
    );
};

// Main component
const OverlayTest = ({ path }) => {
    if (path && path[0] === 'motion') return <MotionControl />;
    if (path && path[0] === 'video') return <VideoQueue />;

    return (
        <>
            <SwishTest/>
            <NamnskyltTest/>
            <VideotransitionTest/>
            <BarsTest/>
            <InsamlingTest/>

            <a href={'lappis/motion'}>
                Motion
            </a>

            <a href={'lappis/video'}>
                Video
            </a>
        </>
    );
};

export default OverlayTest;
