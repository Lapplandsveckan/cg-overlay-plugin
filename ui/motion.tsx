import {Button, Card, Stack} from '@mui/material';
import React, {useState} from 'react';

// @ts-ignore
import {MediaView, useSocket} from '@web-lib';

export const MotionControl = () => {
    const conn = useSocket();
    const [color, setColor] = useState<string>();

    return (
        <>
            <Card
                sx={{
                    padding: '10px',
                    backgroundColor: '#47575a',
                    marginBottom: '20px',
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" height="100%">
                    <input
                        type="color"
                        onChange={async (event) => {
                            const color = event.target['value'] as string;

                            setColor(color);
                            await conn.rawRequest('/api/plugin/overlay/motion/color', 'ACTION', { color })
                        }}
                        value={color}
                    />
                    <Button onClick={async () => {
                        setColor(undefined);
                        await conn.rawRequest('/api/plugin/overlay/motion/color', 'ACTION', {})
                    }}>
                        Clear
                    </Button>
                </Stack>
            </Card>
            <MediaView prefix="MOTIONS/" onClipSelect={(clip) => conn.rawRequest('/api/plugin/overlay/motion/clip', 'ACTION', { clip: clip.id })} />
        </>
    );
};