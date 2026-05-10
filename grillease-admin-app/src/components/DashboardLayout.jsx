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
    ListItemText, Container, Box, IconButton, BottomNavigation, BottomNavigationAction
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventIcon from '@mui/icons-material/Event';
import NotificationBell from './NotificationBell.jsx';
import { useThemeMode } from '../context/ThemeModeContext.jsx';

const drawerWidth = 240;

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

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // Define nav items based on role
    const baseNavItems = [
        { name: 'Dashboard Home', path: '/admin/dashboard' },
        { name: 'Order Processing', path: '/admin/dashboard/orders' },
        { name: 'Reservation Management', path: '/admin/dashboard/reservations' },
        { name: 'Menu Management', path: '/admin/dashboard/menu' },
    ];

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                Grillease Staff
            </Typography>
            <List>
                {baseNavItems.map((item) => (
                    <ListItem button key={item.name} onClick={() => navigate(item.path)}>
                        <ListItemText primary={item.name} />
                    </ListItem>
                ))}
                <ListItem button onClick={() => window.open('https://grillease-admin-app.vercel.app', '_blank')}>
                    <ListItemText primary="🏠 Grillease Home" sx={{ color: 'primary.main' }} />
                </ListItem>
                <ListItem button onClick={() => { logout(); navigate('/admin/login'); }}>
                    <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>

            {/* --- Header/AppBar --- */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    {/* Logo Space */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                            Grillease
                        </Typography>
                    </Box>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Staff Dashboard
                    </Typography>

                    {/* Notification bell */}
                    <NotificationBell />

                    {/* Theme toggle */}
                    <IconButton
                        sx={{ ml: 1 }}
                        color="inherit"
                        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
                    >
                        {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                    </IconButton>

                    <Button
                        color="inherit"
                        startIcon={<LogoutIcon />}
                        onClick={() => { logout(); navigate('/admin/login'); }}
                        sx={{ display: { xs: 'none', sm: 'flex' } }}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            {/* --- Sidebar/Drawer --- */}
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                {/* Mobile Drawer */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                {/* Desktop Drawer */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* --- Main Content Area --- */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: 8 // Space for the fixed AppBar
                }}
            >
                <Container maxWidth="lg">
                    <Routes>
                        {/* Default path (homepage of the dashboard) */}
                        <Route path="/" element={<DashboardStats />} />

                        {/* The core management views */}
                        <Route path="/orders" element={<OrderManager />} />
                        <Route path="/reservations" element={<ReservationManager />} />
                        <Route path="/menu" element={<MenuManager />} />
                    </Routes>
                </Container>
            </Box>

            {/* Bottom navigation for small screens */}
            {/** Show only on xs/small screens */}
            <MobileBottomNav navigate={navigate} />
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <MuiAlert elevation={6} variant="filled" onClose={handleCloseToast} severity={toast.severity}>{toast.message}</MuiAlert>
            </Snackbar>
        </Box>
    );
};

const MobileBottomNav = ({ navigate }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [value, setValue] = useState('/admin/dashboard');

    useEffect(() => {
        const handler = (e) => {
            if (!e?.detail) return;
            const detail = e.detail;
            if (detail === 'orders') navigate('/admin/dashboard/orders');
            if (detail === 'reservations') navigate('/admin/dashboard/reservations');
        };
        window.addEventListener('navigate', handler);
        return () => window.removeEventListener('navigate', handler);
    }, [navigate]);

    if (!isMobile) return null;

    return (
        <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar }}>
            <BottomNavigation
                showLabels
                value={value}
                onChange={(event, newValue) => {
                    setValue(newValue);
                    navigate(newValue);
                }}
            >
                <BottomNavigationAction label="Stats" value="/admin/dashboard" icon={<MenuBookIcon />} />
                <BottomNavigationAction label="Order Processing" value="/admin/dashboard/orders" icon={<ShoppingCartIcon />} />
                <BottomNavigationAction label="Reservation Management" value="/admin/dashboard/reservations" icon={<EventIcon />} />
                <BottomNavigationAction label="Menu Management" value="/admin/dashboard/menu" icon={<MenuBookIcon />} />
            </BottomNavigation>
        </Box>
    );
};

export default DashboardLayout;