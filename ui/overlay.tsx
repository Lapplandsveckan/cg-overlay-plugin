import {Box, Button, Card, CardContent, InputAdornment, Stack, TextField, Typography} from '@mui/material';
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


// Layout primitives

interface ActionCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

const ActionCard: React.FC<ActionCardProps> = ({title, description, children}) => (
    <Card variant="outlined" sx={{borderColor: 'rgba(255,255,255,0.08)'}}>
        <CardContent>
            <Stack spacing={1.5}>
                <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
                    <Typography variant="caption" color="text.secondary">{description}</Typography>
                </Box>
                {children}
            </Stack>
        </CardContent>
    </Card>
);

// Components

const SwishCard = () => {
    const conn = useSocket();
    const [number, setNumber] = React.useState('');

    return (
        <ActionCard title="Swish" description="Toggle the Swish donation overlay. Leave the number empty to use the default.">
            <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                    size="small"
                    label="Number"
                    value={number}
                    placeholder="123 607 27 97"
                    InputLabelProps={{shrink: true}}
                    onChange={e => setNumber(e.target['value'])}
                    sx={{flexGrow: 1}}
                />
                <Button variant="contained" onClick={() => toggleSwish(conn, number)}>
                    Toggle
                </Button>
            </Stack>
        </ActionCard>
    );
};

const NamnskyltCard = () => {
    const conn = useSocket();
    const [name, setName] = React.useState('Eliyah Sundström');

    return (
        <ActionCard title="Namnskylt" description="Show a name plate overlay for the person currently on camera.">
            <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                    size="small"
                    label="Name"
                    value={name}
                    InputLabelProps={{shrink: true}}
                    onChange={e => setName(e.target['value'])}
                    sx={{flexGrow: 1}}
                    required
                    error={name === ''}
                    helperText={name === '' ? 'Required' : ' '}
                />
                <Button
                    variant="contained"
                    disabled={!name}
                    onClick={() => showNamnskylt(conn, name)}
                >
                    Show
                </Button>
            </Stack>
        </ActionCard>
    );
};

const VideotransitionCard = () => {
    const conn = useSocket();
    return (
        <ActionCard title="Videotransition" description="Trigger the configured transition between video sources.">
            <Button variant="contained" onClick={() => toggleVideotransition(conn)}>
                Trigger
            </Button>
        </ActionCard>
    );
};

const BarsCard = () => {
    const conn = useSocket();
    return (
        <ActionCard title="Bars" description="Toggle cinematic black letterbox bars on the output.">
            <Button variant="contained" onClick={() => toggleBars(conn)}>
                Toggle
            </Button>
        </ActionCard>
    );
};

const InsamlingCard = () => {
    const conn = useSocket();
    const [goal, setGoal] = React.useState(1000);
    const [now, setNow] = React.useState(500);

    return (
        <ActionCard title="Insamling" description="Toggle the fundraising progress overlay with a target and a current amount.">
            <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                    size="small"
                    label="Current"
                    type="number"
                    value={now}
                    InputLabelProps={{shrink: true}}
                    InputProps={{endAdornment: <InputAdornment position="end">kr</InputAdornment>}}
                    onChange={e => setNow(parseInt(e.target['value']))}
                    sx={{flex: 1}}
                />
                <TextField
                    size="small"
                    label="Goal"
                    type="number"
                    value={goal}
                    InputLabelProps={{shrink: true}}
                    InputProps={{endAdornment: <InputAdornment position="end">kr</InputAdornment>}}
                    onChange={e => setGoal(parseInt(e.target['value']))}
                    sx={{flex: 1}}
                />
                <Button variant="contained" onClick={() => toggleInsamling(conn, { goal, now })}>
                    Toggle
                </Button>
            </Stack>
        </ActionCard>
    );
};

// Main component
const OverlayTest = ({ path }) => {
    if (path && path[0] === 'motion') return <MotionControl />;
    if (path && path[0] === 'video') return <VideoQueue />;

    return (
        <Stack spacing={2} sx={{maxWidth: 720, margin: '0 auto', padding: 2}}>
            <Typography variant="h5" fontWeight={600}>Overlay controls</Typography>

            <SwishCard/>
            <NamnskyltCard/>
            <VideotransitionCard/>
            <BarsCard/>
            <InsamlingCard/>

            <Box sx={{paddingTop: 1}}>
                <Typography variant="overline" color="text.secondary">More</Typography>
                <Stack direction="row" spacing={1.5} sx={{marginTop: 1}}>
                    <Button component="a" href="lappis/motion" variant="outlined" fullWidth>
                        Motion
                    </Button>
                    <Button component="a" href="lappis/video" variant="outlined" fullWidth>
                        Video queue
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
};

export default OverlayTest;
