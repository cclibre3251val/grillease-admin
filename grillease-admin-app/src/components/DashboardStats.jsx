// src/components/DashboardStats.jsx
import React, { useState, useEffect } from 'react';
import { databases } from '../lib/appwrite';
import { Query } from 'appwrite';
import { Grid, Card, Typography, Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Button, List, ListItem, ListItemText, Alert } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID;
const RESERVATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_RESERVATIONS_COLLECTION_ID;
const SALES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SALES_COLLECTION_ID;

const DashboardStats = () => {
    const [stats, setStats] = useState({
        orders: { new: 0, total: 0 },
        reservations: { pending: 0, total: 0 },
        loading: true,
    });
    const [open, setOpen] = useState(false);
    const [detailType, setDetailType] = useState('');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [lastReset, setLastReset] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [resetSummary, setResetSummary] = useState({ orders: 0, reservations: 0 });
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('grillease_last_reset');
        if (saved) setLastReset(saved);
    }, []);

    const fetchStats = async () => {
        try {
            const [ordersRes, reservationsRes] = await Promise.all([
                databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.equal('status', 'New')]),
                databases.listDocuments(DATABASE_ID, RESERVATIONS_COLLECTION_ID, [Query.equal('status', 'Pending')]),
            ]);

            setStats({
                orders: { new: ordersRes.total || 0, total: 0 },
                reservations: { pending: reservationsRes.total || 0, total: 0 },
                loading: false,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    const handleDailyReset = async () => {
        setIsResetting(true);
        try {
            const saveOrders = stats.orders.new;
            const saveReservations = stats.reservations.pending;

            await databases.createDocument(DATABASE_ID, SALES_COLLECTION_ID, 'unique()', {
                date: new Date().toISOString().split('T')[0],
                resetAt: new Date().toISOString(),
                reason: 'End of day reset',
                ordersReset: saveOrders,
                reservationsReset: saveReservations,
            });

            const resetTime = new Date().toLocaleString();
            localStorage.setItem('grillease_last_reset', resetTime);
            setLastReset(resetTime);
            setResetDialogOpen(false);
            setResetSummary({ orders: saveOrders, reservations: saveReservations });
            setShowSuccessDialog(true);
            fetchStats();
        } catch (err) {
            console.error('Error resetting daily stats:', err);
            setResetSummary({ orders: 0, reservations: 0 });
            setResetMessage('Error performing reset. Check console for details.');
            setShowSuccessDialog(true);
        } finally {
            setIsResetting(false);
        }
    };

    if (stats.loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
        {resetMessage && (
            <Alert severity={resetMessage.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setResetMessage('')}>
                {resetMessage}
            </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={6}>
                <Card
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        backgroundColor: '#ffebee',
                        boxShadow: '0px 4px 0px #d32f2f',
                        border: '2px solid #d32f2f',
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: '#ffcdd2',
                            transform: 'translateY(-2px)',
                            boxShadow: '0px 6px 0px #d32f2f'
                        }
                    }}
                    onClick={() => { setDetailType('orders'); setOpen(true); }}
                    >
                    <ShoppingCartIcon sx={{ fontSize: 32, mb: 1, color: '#d32f2f' }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5, color: '#d32f2f' }}>
                        {stats.orders.new}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                        NEW ORDERS
                    </Typography>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
                <Card
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        backgroundColor: '#e3f2fd',
                        boxShadow: '0px 4px 0px #1976d2',
                        border: '2px solid #1976d2',
                        textAlign: 'center',
                        '&:hover': {
                            backgroundColor: '#bbdefb',
                            transform: 'translateY(-2px)',
                            boxShadow: '0px 6px 0px #1976d2'
                        }
                    }}
                    onClick={() => { setDetailType('reservations'); setOpen(true); }}
                >
                    <EventIcon sx={{ fontSize: 32, mb: 1, color: '#1976d2' }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5, color: '#1976d2' }}>
                        {stats.reservations.pending}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                        PENDING RESERVATIONS
                    </Typography>
                </Card>
            </Grid>
        </Grid>

        {/* Daily Reset Card */}
        <Card
            sx={{
                p: 2.5,
                borderRadius: 2,
                backgroundColor: 'background.paper',
                boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid',
                borderColor: 'divider',
                mb: 4,
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        End of Day Reset
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<RefreshIcon />}
                    onClick={() => setResetDialogOpen(true)}
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                    Reset for New Day
                </Button>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                Reset all counters to 0 for a new day. This will save the current counts as a sales record.
            </Typography>
            {lastReset && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                    Last reset: {lastReset}
                </Typography>
            )}
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Daily Reset</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    You are about to end the day and reset all counters. The following data will be saved:
                </DialogContentText>
                <Box sx={{ backgroundColor: '#f5f5f5', borderRadius: 1, p: 2, mb: 2 }}>
                    <Typography sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <span>New Orders:</span>
                        <strong>{stats.orders.new}</strong>
                    </Typography>
                    <Typography sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Pending Reservations:</span>
                        <strong>{stats.reservations.pending}</strong>
                    </Typography>
                </Box>
                <Typography sx={{ fontWeight: 'bold', color: 'error.main', mb: 1 }}>
                    After reset, all counters will be set to 0.
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    This action cannot be undone. Make sure you have processed all data before proceeding.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setResetDialogOpen(false)} disabled={isResetting}>Cancel</Button>
                <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleDailyReset}
                    disabled={isResetting}
                    startIcon={isResetting ? <CircularProgress size={20} /> : <RefreshIcon />}
                >
                    {isResetting ? 'Resetting...' : 'Reset Now'}
                </Button>
            </DialogActions>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)}>
            <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: '#4caf50', display: 'block', mx: 'auto', mb: 1 }} />
                Reset Complete!
            </DialogTitle>
            <DialogContent>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Ready for a new day! 🎉
                    </Typography>
                    {resetSummary.orders > 0 || resetSummary.reservations > 0 ? (
                        <>
                            <Typography sx={{ mb: 1 }}>Data saved from previous day:</Typography>
                            <Box sx={{ backgroundColor: '#f5f5f5', borderRadius: 1, p: 1.5, display: 'inline-block' }}>
                                <Typography>Orders: <strong>{resetSummary.orders}</strong></Typography>
                                <Typography>Reservations: <strong>{resetSummary.reservations}</strong></Typography>
                            </Box>
                        </>
                    ) : (
                        <Typography>All counters were already at 0.</Typography>
                    )}
                    <Typography sx={{ mt: 2, color: '#4caf50', fontWeight: 'bold' }}>
                        All counters have been reset to 0. ✓
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                <Button 
                    variant="contained" 
                    onClick={() => setShowSuccessDialog(false)}
                    sx={{ minWidth: 120 }}
                >
                    OK
                </Button>
            </DialogActions>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>{detailType === 'orders' ? 'New Orders' : detailType === 'reservations' ? 'Pending Reservations' : 'Details'}</DialogTitle>
            <DialogContent dividers>
                <List>
                    {detailType === 'orders' && (
                        <ListItem>
                            <ListItemText 
                                primary={`New orders: ${stats.orders.new}`} 
                                secondary='Go to "Order Processing" in the menu to manage these orders.'
                            />
                        </ListItem>
                    )}
                    {detailType === 'reservations' && (
                        <ListItem>
                            <ListItemText 
                                primary={`Pending reservations: ${stats.reservations.pending}`} 
                                secondary='Go to "Reservation Management" in the menu to manage these.'
                            />
                        </ListItem>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogActions>
        </Dialog>
        </>
    );
};

export default DashboardStats;