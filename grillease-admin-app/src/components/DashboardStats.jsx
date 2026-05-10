// src/components/DashboardStats.jsx
import React, { useState, useEffect } from 'react';
import { databases } from '../lib/appwrite';
import { Query } from 'appwrite';
import { Grid, Card, Typography, Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Alert, IconButton } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventIcon from '@mui/icons-material/Event';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID;
const RESERVATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_RESERVATIONS_COLLECTION_ID;

const DashboardStats = () => {
    console.log('📊 DashboardStats component rendering');
    console.log('📊 Env vars:', {
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        RESERVATIONS_COLLECTION_ID
    });
    const [stats, setStats] = useState({
        orders: { new: 0, total: 0 },
        reservations: { pending: 0, total: 0 },
        loading: true,
    });
    const [open, setOpen] = useState(false);
    const [detailType, setDetailType] = useState('');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [lastReset, setLastReset] = useState('');

    useEffect(() => {
        console.log('📊 DashboardStats useEffect triggered');
        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        console.log('📊 fetchStats called');
        try {
            console.log('📊 Fetching from DB:', DATABASE_ID, ORDERS_COLLECTION_ID);
            const [ordersRes, reservationsRes] = await Promise.all([
                databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.equal('status', 'New')]),
                databases.listDocuments(DATABASE_ID, RESERVATIONS_COLLECTION_ID, [Query.equal('status', 'Pending')]),
            ]);

            console.log('📊 Fetched results:', ordersRes.total, reservationsRes.total);
            const orders = ordersRes.total || 0;
            const reservations = reservationsRes.total || 0;

            setStats({
                orders: { new: orders, total: 0 },
                reservations: { pending: reservations, total: 0 },
                loading: false,
            });
            console.log('📊 Stats set successfully');
        } catch (error) {
            console.error('❌ Error fetching stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    const handleDailyReset = async () => {
        try {
            // Create a daily reset record
            await databases.createDocument(DATABASE_ID, RESERVATIONS_COLLECTION_ID, 'unique()', {
                type: 'daily_reset',
                resetAt: new Date().toISOString(),
                reason: 'New day reset by admin'
            });
            
            setResetDialogOpen(false);
            setLastReset(new Date().toLocaleString());
            fetchStats();
        } catch (err) {
            console.error('Error resetting daily stats:', err);
        }
    };

    if (stats.loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    console.log('📊 DashboardStats rendering with stats:', stats);
    return (
        <>
        {/* Header with Home Button */}
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'background.paper',
            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid',
            borderColor: 'divider'
        }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                🍔 GrillEase Admin Dashboard
            </Typography>
            <IconButton
                color="primary"
                size="large"
                onClick={() => window.location.href = '/'}
                sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                        backgroundColor: 'primary.dark',
                    },
                    width: 48,
                    height: 48,
                    borderRadius: 1
                }}
            >
                <HomeIcon />
            </IconButton>
        </Box>

        <Grid container spacing={2} sx={{ mt: 2, mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
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

        {/* Daily Reset Section */}
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
                        Daily Reset
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
                Reset reservation counters for a new day. This will create a reset record in the system.
            </Typography>
            {lastReset && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                    Last reset: {lastReset}
                </Typography>
            )}
        </Card>

        {/* Daily Reset Dialog */}
        <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
            <DialogTitle>Daily Reset</DialogTitle>
            <DialogContent>
                <Typography sx={{ mb: 2 }}>
                    This will reset the daily reservation counters and create a reset record in the system.
                </Typography>
                <Typography sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    Are you sure you want to reset for a new day?
                </Typography>
                <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                    This action cannot be undone. Make sure you have recorded any important reservation data before proceeding.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleDailyReset}
                >
                    Reset Now
                </Button>
            </DialogActions>
        </Dialog>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>{detailType === 'orders' ? 'Recent Orders' : detailType === 'reservations' ? 'Recent Reservations' : 'Details'}</DialogTitle>
            <DialogContent dividers>
                {/* Placeholder: show basic breakdown using stats */}
                <List>
                    {detailType === 'orders' && (
                        <ListItem>
                            <ListItemText primary={`New orders: ${stats.orders.new}`} secondary={`Total orders: ${stats.orders.total || 'n/a'}`} />
                        </ListItem>
                    )}

                    {detailType === 'reservations' && (
                        <ListItem>
                            <ListItemText primary={`Pending reservations: ${stats.reservations.pending}`} secondary={`Total reservations: ${stats.reservations.total || 'n/a'}`} />
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
