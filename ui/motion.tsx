import {Box, Button, Collapse, IconButton, Stack, Tooltip, Typography} from '@mui/material';
import React, {useState} from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// @ts-ignore
import {MediaView, useSocket} from '@web-lib';

export const MotionControl = () => {
    const conn = useSocket();
    const [color, setColor] = useState<string>();
    const [colorOpen, setColorOpen] = useState(false);

    return (
        <Stack direction="row" sx={{height: '100%', minHeight: 0}}>
            <Box sx={{flexGrow: 1, minWidth: 0, overflowY: 'auto', padding: 1.5}}>
                <MediaView
                    prefix="MOTIONS/"
                    onClipSelect={(clip) => conn.rawRequest('/api/plugin/lappis/motion/clip', 'ACTION', {clip: clip.id})}
                />
            </Box>

            <Stack
                direction="row"
                sx={{borderLeft: '1px solid rgba(255,255,255,0.08)', flexShrink: 0}}
            >
                <Collapse in={colorOpen} orientation="horizontal" unmountOnExit>
                    <Stack
                        spacing={1.5}
                        sx={{width: 180, padding: 1.5, height: '100%', boxSizing: 'border-box'}}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{textTransform: 'uppercase', letterSpacing: '0.08em'}}>
                            Background color
                        </Typography>
                        <Box
                            component="label"
                            sx={{
                                position: 'relative',
                                width: '100%',
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
                        <Typography variant="caption" color="text.secondary">
                            {color ? color.toUpperCase() : 'No color set'}
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={!color}
                            onClick={async () => {
                                setColor(undefined);
                                await conn.rawRequest('/api/plugin/lappis/motion/color', 'ACTION', {});
                            }}
                        >
                            Clear
                        </Button>
                    </Stack>
                </Collapse>

                <Tooltip title={colorOpen ? 'Hide color' : 'Background color'} placement="left">
                    <IconButton
                        size="small"
                        onClick={() => setColorOpen(v => !v)}
                        sx={{
                            borderRadius: 0,
                            height: '100%',
                            width: 28,
                            color: color ? color : 'text.secondary',
                        }}
                    >
                        {colorOpen ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Stack>
        </Stack>
    );
};
