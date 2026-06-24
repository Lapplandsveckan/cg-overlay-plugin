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
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                component: 'form',
                onSubmit: (e: React.FormEvent) => {
                    e.preventDefault();
                    handleSubmit();
                },
            }}
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    label={label}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    fullWidth
                    sx={{ marginTop: 1 }}
                />
            </DialogContent>
            <DialogActions>
                <Button type="button" onClick={onClose}>Cancel</Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={!name.trim()}
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NameDialog;
