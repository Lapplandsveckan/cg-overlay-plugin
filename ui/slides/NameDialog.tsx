import React, { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';

interface Props {
    open: boolean;
    title: string;
    label?: string;
    initialName: string;
    confirmLabel?: string;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

const NameDialog: React.FC<Props> = ({
    open,
    title,
    label = 'Name',
    initialName,
    confirmLabel = 'Save',
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState(initialName);

    useEffect(() => {
        if (open) setName(initialName);
    }, [open]);

    const handleSubmit = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    label={label}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleSubmit();
                    }}
                    autoFocus
                    fullWidth
                    sx={{ marginTop: 1 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NameDialog;
