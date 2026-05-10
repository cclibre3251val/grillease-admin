// src/components/ReservationManager.jsx (Content from Step 7)
import React, { useState, useEffect } from 'react';
import { databases, realtime } from '../lib/appwrite';
import { Query } from 'appwrite';
import {
    Button, Card, CardContent, Typography, Grid, Chip, Box,
    CircularProgress, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Snackbar
} from '@mui/material';
import Badge from '@mui/material/Badge';
import MuiAlert from '@mui/material/Alert';
import { useAuth } from '../context/AuthContext.jsx';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import { normalizeReservationDoc } from '../lib/schemaUtils';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const RESERVATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_RESERVATIONS_COLLECTION_ID;
const MESSAGES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID;

const ReservationManager = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, logout } = useAuth();
    const [newResOpen, setNewResOpen] = useState(false);
    const [resName, setResName] = useState('');
    const [resPhone, setResPhone] = useState('');
    const [resDate, setResDate] = useState('');
    const [resTime, setResTime] = useState('19:00');
    const [resGuests, setResGuests] = useState(2);
    const [submitting, setSubmitting] = useState(false);
    const [messageOpen, setMessageOpen] = useState(false);
    const [selectedReservationId, setSelectedReservationId] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});

    useEffect(() => {
        fetchReservations();
    }, []);

    useEffect(() => {
        // subscribe to messages realtime to update unreadCounts incrementally
        if (!realtime || !MESSAGES_COLLECTION_ID || !DATABASE_ID) return;
        let sub = null;
        try {
            const topic = `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`;
            sub = realtime.subscribe([topic], (resp) => {
                try {
                    const events = resp?.events || [];
                    const isCreate = events.some(e => /\.create$/.test(e) || /documents.create/.test(e));
                    const isUpdate = events.some(e => /\.update$/.test(e) || /documents.update/.test(e));
                    const payload = resp?.payload || resp?.document || {};
                    const reservationId = payload?.reservationId || payload?.reservation_id || payload?.data?.reservationId || null;

                    if (isCreate && reservationId) {
                        setUnreadCounts(prev => ({ ...prev, [reservationId]: (prev[reservationId] || 0) + 1 }));
                    }

                    if (isUpdate && reservationId) {
                        // if read flag present and true, decrement
                        if (payload?.read === true) {
                            setUnreadCounts(prev => ({ ...prev, [reservationId]: Math.max(0, (prev[reservationId] || 0) - 1) }));
                        }
                    }
                } catch (e) {
                    console.error('Realtime messages handler error in ReservationManager:', e, resp);
                }
            });
        } catch (e) {
            console.warn('Failed to subscribe to messages realtime in ReservationManager', e);
        }

        return () => {
            try { if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe(); } catch(e) {}
        };
    }, []);

    const openCreateReservation = () => {
        setResName('');
        setResPhone('');
        setResDate('');
        setResTime('19:00');
        setResGuests(2);
        setNewResOpen(true);
    };

    const fetchReservations = async () => {
        console.log('DEBUG: Starting fetchReservations');
        console.log('DEBUG: User authenticated:', !!user);
        console.log('DEBUG: DATABASE_ID:', DATABASE_ID);
        console.log('DEBUG: RESERVATIONS_COLLECTION_ID:', RESERVATIONS_COLLECTION_ID);
        setLoading(true);
        setError(null);
        try {
            console.log('DEBUG: Calling databases.listDocuments');
            const response = await databases.listDocuments(DATABASE_ID, RESERVATIONS_COLLECTION_ID);
            console.log('DEBUG: Response received:', response);
            const docs = (response.documents || []).map(d => normalizeReservationDoc(d));
            console.log('DEBUG: Normalized reservations:', docs);
            console.log('DEBUG: Number of reservations:', docs.length);
            setReservations(docs);
            // fetch unread counts for these reservations
            fetchUnreadCounts(docs);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching reservations:', err);
            console.log('DEBUG: Error code:', err.code);
            console.log('DEBUG: Error message:', err.message);
            if (err.code === 401) {
                // Session expired, logout user
                console.log('DEBUG: 401 error, logging out user');
                logout();
                setError('Your session has expired. Please log in again.');
            } else {
                setError('Failed to fetch reservations. Please check your connection and try again.');
            }
            setLoading(false);
        }
    };

    const fetchUnreadCounts = async (resList) => {
        if (!MESSAGES_COLLECTION_ID || !DATABASE_ID) return;
        try {
            const promises = (resList || []).map(async (r) => {
                try {
                    const resp = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [Query.equal('reservationId', r.$id), Query.equal('read', false)]);
                    return [r.$id, resp.total || 0];
                } catch (e) {
                    return [r.$id, 0];
                }
            });

            const results = await Promise.all(promises);
            const map = {};
            results.forEach(([id, count]) => { map[id] = count; });
            setUnreadCounts(map);
        } catch (e) {
            console.error('Failed to fetch unread message counts:', e);
        }
    };



    const handleStatusUpdate = async (reservationId, newStatus, tableId = null) => {
        console.log('DEBUG: handleStatusUpdate called with:', { reservationId, newStatus, tableId });
        try {
            console.log('DEBUG: Attempting to update reservation document');
            await databases.updateDocument(DATABASE_ID, RESERVATIONS_COLLECTION_ID, reservationId, { status: newStatus });
            console.log('DEBUG: Reservation document updated successfully');

            fetchReservations();
            console.log('DEBUG: handleStatusUpdate completed');
        } catch (err) {
            console.error('DEBUG: Failed to update reservation:', err);
            console.log('DEBUG: Error code:', err.code);
            console.log('DEBUG: Error message:', err.message);
            setError(`Failed to update reservation ${reservationId}. Error: ${err.message}`);
        }
    };

    const handleDeleteReservation = async (reservationId) => {
        if (!window.confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
            return;
        }
        try {
            await databases.deleteDocument(DATABASE_ID, RESERVATIONS_COLLECTION_ID, reservationId);
            fetchReservations();
            setSnackbar({ open: true, message: 'Reservation deleted successfully', severity: 'success' });
        } catch (err) {
            console.error('Failed to delete reservation:', err);
            setError(`Failed to delete reservation. Error: ${err.message}`);
        }
    };

    const createReservation = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                userId: user?.$id || null,
                customer_name: resName,
                phone_number: resPhone,
                date: resDate ? new Date(resDate).toISOString() : new Date().toISOString(),
                time: resTime,
                party_size: parseInt(resGuests, 10),
                guests: parseInt(resGuests, 10),
                status: 'Pending',
                createdAt: new Date().toISOString(),
            };

            await databases.createDocument(DATABASE_ID, RESERVATIONS_COLLECTION_ID, 'unique()', payload);
            setNewResOpen(false);
            fetchReservations();
            setSnackbar({ open: true, message: 'Reservation created', severity: 'success' });
        } catch (err) {
            console.error('Failed to create reservation:', err);
            setError('Failed to create reservation.');
        } finally {
            setSubmitting(false);
        }
    };

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const handleCloseSnackbar = () => setSnackbar(s => ({ ...s, open: false }));





    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'error';
            case 'Confirmed': return 'success';
            case 'Finished': return 'info';
            case 'Cancelled': return 'default';
            default: return 'info';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending': return <PendingIcon />;
            case 'Confirmed': return <CheckCircleIcon />;
            case 'Finished': return <EventIcon />;
            case 'Cancelled': return <CancelIcon />;
            default: return <EventIcon />;
        }
    };

    const getTableName = (tableId) => {
        // This would ideally fetch from a tables collection
        // For now, return a placeholder
        return `Table ${tableId}`;
    };

    // Calculate statistics
    const stats = {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'Pending').length,
        confirmed: reservations.filter(r => r.status === 'Confirmed').length,
        finished: reservations.filter(r => r.status === 'Finished').length,
        cancelled: reservations.filter(r => r.status === 'Cancelled').length,
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                <CircularProgress size={60} sx={{ color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    Loading reservations...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ width: '100%' }}>
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #C62828 0%, #EF5350 100%)',
                        borderRadius: 3,
                        p: 2,
                        mb: 3,
                        boxShadow: '0px 4px 12px rgba(198, 40, 40, 0.2)',
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontSize: { xs: '1.5rem', sm: '2rem' },
                            color: 'white',
                            fontWeight: 'bold',
                            textAlign: 'center',
                        }}
                    >
                        🗓️ Reservation Manager
                    </Typography>
                </Box>
                <Card
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        borderRadius: 3,
                        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                    }}
                >
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            borderRadius: 2,
                        }}
                        action={
                            <IconButton
                                aria-label="retry"
                                color="inherit"
                                size="small"
                                onClick={fetchReservations}
                            >
                                <RefreshIcon />
                            </IconButton>
                        }
                    >
                        {error}
                    </Alert>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<RefreshIcon />}
                        onClick={fetchReservations}
                        sx={{ mt: 2 }}
                    >
                        Retry Loading Reservations
                    </Button>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box
                sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 2.5,
                    mb: 3,
                    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        color: 'text.primary',
                        fontWeight: 600,
                    }}
                >
                    Reservation Manager ({stats.pending} Pending)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button variant="contained" color="primary" onClick={openCreateReservation}>New Reservation</Button>
                    <IconButton
                        onClick={fetchReservations}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.04)',
                            },
                        }}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <EventIcon sx={{ fontSize: 24, mb: 1, color: 'text.secondary' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.total}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Total
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <PendingIcon sx={{ fontSize: 24, mb: 1, color: 'error.main' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.pending}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Pending
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <CheckCircleIcon sx={{ fontSize: 24, mb: 1, color: 'success.main' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.confirmed}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Confirmed
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <EventIcon sx={{ fontSize: 24, mb: 1, color: 'info.main' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.finished}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Finished
                        </Typography>
                    </Card>
                </Grid>
            </Grid>
            {/* Create Reservation Dialog */}
            <Dialog open={newResOpen} onClose={() => setNewResOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create Reservation</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <TextField label="Customer Name" fullWidth size="small" value={resName} onChange={(e) => setResName(e.target.value)} />
                        <TextField label="Phone Number" fullWidth size="small" value={resPhone} onChange={(e) => setResPhone(e.target.value)} />
                        <TextField label="Date" type="date" fullWidth size="small" value={resDate} onChange={(e) => setResDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <TextField label="Time" type="time" fullWidth size="small" value={resTime} onChange={(e) => setResTime(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <TextField label="Guests" type="number" fullWidth size="small" value={resGuests} onChange={(e) => setResGuests(e.target.value)} inputProps={{ min: 1 }} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewResOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={createReservation} disabled={submitting}>{submitting ? 'Saving...' : 'Save Reservation'}</Button>
                </DialogActions>
            </Dialog>

            {/* Pending Reservations Section */}
            <Box sx={{ mb: 4 }}>
                <Box
                    sx={{
                        borderRadius: 2,
                        p: 2,
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PendingIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                            PENDING RESERVATIONS
                        </Typography>
                        <Chip
                            label={`${stats.pending} reservations`}
                            variant="outlined"
                            size="small"
                        />
                    </Box>
                </Box>
                <Grid container spacing={2}>
                    {reservations.filter(r => r.status === 'Pending').map((res) => (
                        <Grid item xs={12} sm={6} md={4} key={res.$id}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    backgroundColor: 'background.paper',
                                    boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 'bold' }}
                                        >
                                            {res.customer_name || res.name}
                                        </Typography>
                                        <Chip
                                            label={res.status}
                                            color="error"
                                            size="small"
                                        />
                                    </Box>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 0.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Date: {new Date(res.date).toLocaleDateString()} @ {res.time}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 0.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Guests: {res.guests}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Phone: {res.phone_number || res.phone}
                                    </Typography>

                                    {res.table_id && (
                                        <Chip
                                            label={`Assigned: ${getTableName(res.table_id)}`}
                                            color="info"
                                            size="small"
                                            sx={{ mb: 1.5 }}
                                        />
                                    )}

                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        gap: 1,
                                        mt: 2,
                                    }}>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            size="medium"
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                flex: 1,
                                            }}
                                            onClick={() => handleStatusUpdate(res.$id, 'Confirmed')}
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="medium"
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                flex: 1,
                                            }}
                                            onClick={() => handleStatusUpdate(res.$id, 'Cancelled')}
                                        >
                                            Cancel
                                        </Button>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteReservation(res.$id)}
                                            sx={{
                                                flex: '0 0 auto',
                                                '&:hover': {
                                                    backgroundColor: 'error.dark',
                                                    color: 'white',
                                                }
                                            }}
                                        >
                                            <CancelIcon />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {reservations.filter(r => r.status === 'Pending').length === 0 && (
                        <Grid item xs={12}>
                            <Card sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                <Typography color="text.secondary">
                                    No pending reservations at this time.
                                </Typography>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            </Box>

            {/* Confirmed Reservations Section */}
            <Box sx={{ mb: 4 }}>
                <Box
                    sx={{
                        borderRadius: 2,
                        p: 2,
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CheckCircleIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                            CONFIRMED RESERVATIONS
                        </Typography>
                        <Chip
                            label={`${stats.confirmed} reservations`}
                            variant="outlined"
                            size="small"
                        />
                    </Box>
                </Box>
                <Grid container spacing={2}>
                    {reservations.filter(r => r.status === 'Confirmed').map((res) => (
                        <Grid item xs={12} sm={6} md={4} key={res.$id}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    backgroundColor: 'background.paper',
                                    boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 'bold' }}
                                        >
                                            {res.customer_name || res.name}
                                        </Typography>
                                        <Chip
                                            label={res.status}
                                            color="success"
                                            size="small"
                                        />
                                    </Box>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 0.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Date: {new Date(res.date).toLocaleDateString()} @ {res.time}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 0.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Guests: {res.guests}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Phone: {res.phone_number || res.phone}
                                    </Typography>

                                    {res.table_id && (
                                        <Chip
                                            label={`Assigned: ${getTableName(res.table_id)}`}
                                            color="info"
                                            size="small"
                                            sx={{ mb: 1.5 }}
                                        />
                                    )}

                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        gap: 1,
                                        mt: 2,
                                    }}>
                                        <Button
                                            variant="contained"
                                            color="info"
                                            size="medium"
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                flex: 1,
                                            }}
                                            onClick={() => handleStatusUpdate(res.$id, 'Finished')}
                                        >
                                            Finish
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="medium"
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                flex: 1,
                                            }}
                                            onClick={() => handleStatusUpdate(res.$id, 'Cancelled')}
                                        >
                                            Cancel
                                        </Button>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteReservation(res.$id)}
                                            sx={{
                                                flex: '0 0 auto',
                                                '&:hover': {
                                                    backgroundColor: 'error.dark',
                                                    color: 'white',
                                                }
                                            }}
                                        >
                                            <CancelIcon />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {reservations.filter(r => r.status === 'Confirmed').length === 0 && (
                        <Grid item xs={12}>
                            <Card sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                <Typography color="text.secondary">
                                    No confirmed reservations at this time.
                                </Typography>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            </Box>

            {/* Finished Reservations Section */}
            <Box sx={{ mb: 4 }}>
                <Box
                    sx={{
                        borderRadius: 2,
                        p: 2,
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <EventIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                            FINISHED RESERVATIONS
                        </Typography>
                        <Chip
                            label={`${stats.finished} reservations`}
                            variant="outlined"
                            size="small"
                        />
                    </Box>
                </Box>
                <Grid container spacing={2}>
                    {reservations.filter(r => r.status === 'Finished').map((res) => (
                        <Grid item xs={12} sm={6} md={4} key={res.$id}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    backgroundColor: 'background.paper',
                                    boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 'bold' }}
                                        >
                                            {res.customer_name || res.name}
                                        </Typography>
                                        <Chip
                                            label={res.status}
                                            color="info"
                                            size="small"
                                        />
                                    </Box>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 0.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Date: {new Date(res.date).toLocaleDateString()} @ {res.time}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 0.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Guests: {res.guests}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                    >
                                        Phone: {res.phone_number || res.phone}
                                    </Typography>

                                    {res.table_id && (
                                        <Chip
                                            label={`Assigned: ${getTableName(res.table_id)}`}
                                            color="info"
                                            size="small"
                                            sx={{ mb: 1.5 }}
                                        />
                                    )}

                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        gap: 1,
                                        mt: 2,
                                    }}>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="medium"
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                flex: 1,
                                            }}
                                            onClick={() => handleStatusUpdate(res.$id, 'Cancelled')}
                                        >
                                            Cancel
                                        </Button>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteReservation(res.$id)}
                                            sx={{
                                                flex: '0 0 auto',
                                                '&:hover': {
                                                    backgroundColor: 'error.dark',
                                                    color: 'white',
                                                }
                                            }}
                                        >
                                            <CancelIcon />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {reservations.filter(r => r.status === 'Finished').length === 0 && (
                        <Grid item xs={12}>
                            <Card sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                <Typography color="text.secondary">
                                    No finished reservations at this time.
                                </Typography>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            </Box>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
                <MuiAlert elevation={6} variant="filled" onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</MuiAlert>
            </Snackbar>
        </Box>
    );
};

export default ReservationManager;