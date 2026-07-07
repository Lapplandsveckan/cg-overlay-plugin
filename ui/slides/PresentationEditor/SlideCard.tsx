import React from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { useContextMenu } from '@web-lib';
import { useTranslation } from '../../i18n';
import SlidePreview from '../SlidePreview';
import { type Slide, slideLabel } from '../api';

interface SlideContentProps {
    slide: Slide;
    backgroundUrl?: string | null;
    imageThumbnails?: Record<string, string>;
    selected?: boolean;
    dimmed?: boolean;
}

const SlideContent: React.FC<SlideContentProps> = ({
    slide,
    backgroundUrl,
    imageThumbnails,
    selected,
    dimmed,
}) =>
    slide.type === 'image' || slide.type === 'video' ? (
        <SlidePreview
            imageUrl={imageThumbnails?.[slide.mediaId] ?? null}
            isVideo={slide.type === 'video'}
            selected={selected}
            dimmed={dimmed}
        />
    ) : (
        <SlidePreview
            text={slide.text}
            reference={slide.type === 'bible' ? slide.reference : ''}
            heading={slide.type === 'heading'}
            backgroundUrl={backgroundUrl}
            selected={selected}
            dimmed={dimmed}
        />
    );

interface GroupDragPreviewProps {
    slide: Slide;
    count: number;
    backgroundUrl?: string | null;
    imageThumbnails?: Record<string, string>;
}

const GroupDragPreview: React.FC<GroupDragPreviewProps> = ({
    slide,
    count,
    backgroundUrl,
    imageThumbnails,
}) => (
    <Box sx={{ position: 'relative' }}>
        <SlideContent
            slide={slide}
            backgroundUrl={backgroundUrl}
            imageThumbnails={imageThumbnails}
            selected
        />
        <Box
            sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: 22,
                height: 22,
                padding: '0 6px',
                borderRadius: 11,
                backgroundColor: '#4a90e2',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {count}
        </Box>
    </Box>
);

interface SlideCardProps {
    slide: Slide;
    index: number;
    backgroundUrl?: string | null;
    imageThumbnails?: Record<string, string>;
    selected: boolean;
    selectionCount: number;
    dimmed?: boolean;
    suppressTransform?: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onPaintEnter: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDeleteSelected: () => void;
}

const SlideCard: React.FC<SlideCardProps> = ({
    slide,
    index,
    backgroundUrl,
    imageThumbnails,
    selected,
    selectionCount,
    dimmed,
    suppressTransform,
    onSelect,
    onPaintEnter,
    onEdit,
    onDelete,
    onDeleteSelected,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const menu = useContextMenu();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: slide.id });

    const menuItems =
        selected && selectionCount > 1
            ? [
                  {
                      label: t('presentationEditor.deleteNSlides', {
                          count: selectionCount,
                      }),
                      icon: <DeleteIcon sx={{ fontSize: 16 }} />,
                      danger: true,
                      onClick: onDeleteSelected,
                  },
              ]
            : [
                  {
                      label: t('presentationEditor.editSlide'),
                      icon: <EditIcon sx={{ fontSize: 16 }} />,
                      onClick: onEdit,
                  },
                  {
                      label: t('presentationEditor.deleteSlide'),
                      icon: <DeleteIcon sx={{ fontSize: 16 }} />,
                      danger: true,
                      divider: true,
                      onClick: onDelete,
                  },
              ];

    const handleContextMenu = (e: React.MouseEvent) => {
        menu.bind(menuItems)(e);
    };

    return (
        <Stack
            spacing={1}
            ref={setNodeRef}
            data-slide-card=""
            onMouseEnter={onPaintEnter}
            onContextMenu={handleContextMenu}
            style={{
                transform: suppressTransform
                    ? undefined
                    : CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                zIndex: isDragging ? 1 : 'auto',
            }}
        >
            <Box
                onClick={onSelect}
                onMouseDown={e => {
                    if (e.shiftKey) e.preventDefault();
                }}
                sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover .slide-overlay': { opacity: 1 },
                }}
            >
                <SlideContent
                    slide={slide}
                    backgroundUrl={backgroundUrl}
                    imageThumbnails={imageThumbnails}
                    selected={selected}
                    dimmed={dimmed}
                />
                <Stack
                    className="slide-overlay"
                    direction="row"
                    spacing={0.5}
                    onClick={e => e.stopPropagation()}
                    sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        opacity: 0,
                        transition: 'opacity 80ms',
                    }}
                >
                    <Tooltip title={t('presentationEditor.reorderSlide')}>
                        <IconButton
                            {...attributes}
                            {...listeners}
                            sx={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                cursor: 'grab',
                                '&:active': { cursor: 'grabbing' },
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                },
                            }}
                        >
                            <DragIndicatorIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('presentationEditor.editSlide')}>
                        <IconButton
                            onClick={onEdit}
                            sx={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                },
                            }}
                        >
                            <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('presentationEditor.deleteSlide')}>
                        <IconButton
                            onClick={onDelete}
                            sx={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#e88c8c',
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ paddingLeft: 0.25 }}
            >
                {index}. {slideLabel(slide)}
            </Typography>
        </Stack>
    );
};

export { SlideCard, SlideContent, GroupDragPreview };
