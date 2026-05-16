// src/components/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Components to be imported
import OrderManager from './OrderManager.jsx';
import DashboardStats from './DashboardStats.jsx';
import ReservationManager from './ReservationManager.jsx';
import MenuManager from './MenuManager.jsx';
import {
    AppBar, Toolbar, Typography, Button, Drawer, List, ListItem,
    ListItemText, Box, IconButton
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import NotificationBell from './NotificationBell.jsx';
import { useThemeMode } from '../context/ThemeModeContext.jsx';

const DRAWER_WIDTH = 200;

const DashboardLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const { mode, setMode } = useThemeMode();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        const handler = (e) => {
            const detail = e?.detail || {};
            if (!detail.message) return;
            setToast({ open: true, message: detail.message, severity: detail.severity || 'info' });
        };
        window.addEventListener('app:toast', handler);
        return () => window.removeEventListener('app:toast', handler);
    }, []);

    const handleCloseToast = () => setToast(t => ({ ...t, open: false }));

    // Define nav items
    const baseNavItems = [
        { name: 'Order Processing', path: '/admin/dashboard/orders' },
        { name: 'Reservation Management', path: '/admin/dashboard/reservations' },
        { name: 'Menu Management', path: '/admin/dashboard/menu' },
    ];

    const drawer = (
        <Box onClick={() => setMobileOpen(false)}>
            <Toolbar /> {/* Spacer for AppBar height */}
            <List>
                {baseNavItems.map((item) => (
                    <ListItem button key={item.name} onClick={() => navigate(item.path)}>
                        <ListItemText
                            primary={item.name}
                            sx={{
                                '& .MuiListItemText-primary': {
                                    fontSize: '0.9rem',
                                    fontWeight: 500
                                }
                            }}
                        />
                    </ListItem>
                ))}
                <ListItem button onClick={() => { logout(); navigate('/admin/login'); }}>
                    <ListItemText
                        primary="Logout"
                        sx={{
                            color: 'error.main',
                            '& .MuiListItemText-primary': { fontSize: '0.9rem' }
                        }}
                    />
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>

            {/* --- Header/AppBar --- */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar sx={{ minHeight: { xs: 48, sm: 56 }, px: { xs: 1, sm: 2 } }}>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={() => setMobileOpen(true)}
                        sx={{ mr: 0.5, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    {/* Grillease Logo - clickable home button */}
                    <Button
                        color="inherit"
                        onClick={() => window.open('https://grillease-admin-app.vercel.app', '_blank')}
                        sx={{
                            textTransform: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3,
                            mr: 0.5,
                            px: 0.5,
                            minWidth: 'auto',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        <HomeIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>
                            Grillease
                        </Typography>
                    </Button>

                    {/* Staff label next to Grillease */}
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: { xs: '0.75rem', sm: '0.85rem' },
                            borderLeft: '1px solid rgba(255,255,255,0.3)',
                            pl: 1,
                            mr: 1,
                        }}
                    >
                        Staff
                    </Typography>

                    {/* Spacer to push items right */}
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Theme toggle */}
                    <IconButton
                        size="small"
                        color="inherit"
                        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
                        sx={{ ml: 0.5 }}
                    >
                        {mode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
                    </IconButton>

                    {/* Notification bell */}
                    <NotificationBell />

                    <Button
                        color="inherit"
                        size="small"
                        startIcon={<LogoutIcon />}
                        onClick={() => { logout(); navigate('/admin/login'); }}
                        sx={{ display: { xs: 'none', sm: 'flex' }, ml: 0.5, fontSize: '0.8rem' }}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer (temporary) */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                }}
            >
                {drawer}
            </Drawer>

            {/* Desktop Drawer (permanent) */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                }}
                open
            >
                {drawer}
            </Drawer>

            {/* --- Main Content Area --- */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { sm: `${DRAWER_WIDTH}px` },
                    mt: { xs: 6, sm: 7 },
                    minHeight: 'calc(100vh - 56px)',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ width: '100%', maxWidth: '1200px' }}>
                    <Routes>
                        <Route path="/" element={<DashboardStats />} />
                        <Route path="/orders" element={<OrderManager />} />
                        <Route path="/reservations" element={<ReservationManager />} />
                        <Route path="/menu" element={<MenuManager />} />
                    </Routes>
                </Box>
            </Box>

            <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <MuiAlert elevation={6} variant="filled" onClose={handleCloseToast} severity={toast.severity}>{toast.message}</MuiAlert>
            </Snackbar>
        </Box>
    );
};

export default DashboardLayout;