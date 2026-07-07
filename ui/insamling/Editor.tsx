import React, { useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import ContentCutIcon from '@mui/icons-material/ContentCut';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FastForwardIcon from '@mui/icons-material/FastForward';
import GradientIcon from '@mui/icons-material/Gradient';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { RundownEditorActionBar } from '@web-lib';
import { useTranslation } from '../i18n';
import { ModeRow, type ModeOption } from '../mode-row';
import {
    normalizeIntro,
    normalizeOutro,
    type IntroMode,
    type OutroMode,
} from '../video-utils';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface InsamlingEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const InsamlingEditor: React.FC<InsamlingEditorProps> = ({
    entry,
    updateEntry,
    deleteEntry,
    creating,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const [title, setTitle] = useState(entry?.title ?? '');
    const [goal, setGoal] = useState<string>(String(entry?.data.goal ?? '0'));
    const [now, setNow] = useState<string>(String(entry?.data.now ?? '0'));

    const opts = entry?.data?.options;
    const [intro, setIntro] = useState<IntroMode>(normalizeIntro(opts));
    const [outro, setOutro] = useState<OutroMode>(normalizeOutro(opts));

    const additionalOptionsActive = intro !== 'regular' || outro !== 'cut';

    const introOptions: ModeOption[] = [
        {
            value: 'regular',
            label: t('transition.introRegular'),
            icon: <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'fast',
            label: t('transition.introFast'),
            icon: <FastForwardIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'fade',
            label: t('transition.introFade'),
            icon: <GradientIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'cut',
            label: t('transition.introCut'),
            icon: <ContentCutIcon sx={{ fontSize: 16 }} />,
        },
    ];

    const outroOptions: ModeOption[] = [
        {
            value: 'fade',
            label: t('transition.outroFade'),
            icon: <GradientIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'cut',
            label: t('transition.outroCut'),
            icon: <ContentCutIcon sx={{ fontSize: 16 }} />,
        },
    ];

    const kr = <InputAdornment position="end">kr</InputAdornment>;

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('insamling.heading')}</Typography>

            <TextField
                label={t('insamling.titleLabel')}
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText={t('insamling.titleHelper')}
            />

            <Stack direction="row" spacing={2}>
                <TextField
                    label={t('insamling.currentLabel')}
                    type="number"
                    value={now}
                    onChange={e => setNow(e.target['value'])}
                    InputProps={{ endAdornment: kr }}
                    helperText={t('insamling.currentHelper')}
                    sx={{ flex: 1 }}
                />
                <TextField
                    label={t('insamling.goalLabel')}
                    type="number"
                    value={goal}
                    onChange={e => setGoal(e.target['value'])}
                    InputProps={{ endAdornment: kr }}
                    helperText={t('insamling.goalHelper')}
                    sx={{ flex: 1 }}
                />
            </Stack>

            <Accordion
                defaultExpanded={additionalOptionsActive}
                disableGutters
                square
                sx={{
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 1,
                    '&:before': { display: 'none' },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ fontSize: 14 }} />}
                    sx={{
                        minHeight: 40,
                        '& .MuiAccordionSummary-content': { margin: '8px 0' },
                    }}
                >
                    <Typography variant="body2">
                        {t('transition.additionalOptions')}
                        {additionalOptionsActive && ' •'}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={1.5}>
                        <ModeRow
                            label={t('transition.introLabel')}
                            value={intro}
                            onChange={v => setIntro(v as IntroMode)}
                            options={introOptions}
                        />
                        <ModeRow
                            label={t('transition.outroLabel')}
                            value={outro}
                            onChange={v => setOutro(v as OutroMode)}
                            options={outroOptions}
                        />
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <RundownEditorActionBar
                exists={!creating}
                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            goal,
                            now,
                            options: { intro, outro },
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default InsamlingEditor;
