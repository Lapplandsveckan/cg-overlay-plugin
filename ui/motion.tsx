import {Box, Button, Card, CardContent, Stack, Typography} from '@mui/material';
import React, {useState} from 'react';

// @ts-ignore
import {MediaView, useSocket} from '@web-lib';

export const MotionControl = () => {
    const conn = useSocket();
    const [color, setColor] = useState<string>();

    return (
        <Stack spacing={2} sx={{maxWidth: 960, margin: '0 auto', padding: 2}}>
            <Typography variant="h5" fontWeight={600}>Motion</Typography>

            <Card variant="outlined" sx={{borderColor: 'rgba(255,255,255,0.08)'}}>
                <CardContent>
                    <Stack spacing={1.5}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={600}>Background color</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Pick a solid color for the motion background, or clear it to fall back to the selected clip.
                            </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Box
                                component="label"
                                sx={{
                                    position: 'relative',
                                    width: 56,
                                    height: 36,
                                    borderRadius: 1,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    backgroundColor: color ?? '#1a1c22',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                }}
                            >
                                <input
                                    type="color"
                                    style={{
                                        opacity: 0,
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        cursor: 'pointer',
                                    }}
                                    onChange={async (event) => {
                                        const next = event.target['value'] as string;
                                        setColor(next);
                                        await conn.rawRequest('/api/plugin/lappis/motion/color', 'ACTION', {color: next});
                                    }}
                                    value={color ?? '#000000'}
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{flexGrow: 1}}>
                                {color ? color.toUpperCase() : 'No color set'}
                            </Typography>
                            <Button
                                variant="outlined"
                                disabled={!color}
                                onClick={async () => {
                                    setColor(undefined);
                                    await conn.rawRequest('/api/plugin/lappis/motion/color', 'ACTION', {});
                                }}
                            >
                                Clear
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{marginBottom: 1}}>Clip</Typography>
                <Typography variant="caption" color="text.secondary">
                    Select a motion clip to play in the background.
                </Typography>
                <Box sx={{marginTop: 1.5}}>
                    <MediaView
                        prefix="MOTIONS/"
                        onClipSelect={(clip) => conn.rawRequest('/api/plugin/lappis/motion/clip', 'ACTION', {clip: clip.id})}
                    />
                </Box>
            </Box>
        </Stack>
    );
};
