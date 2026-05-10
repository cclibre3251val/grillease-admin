// src/components/NotificationBell.jsx
import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
    IconButton,
    Badge,
    Popover,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Button,
    Chip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const {
        notifications,
        notificationHistory,
        totalNotifications,
        clearNotifications,
        clearHistory,
    } = useNotifications();
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleViewOrders = () => {
        handleClose();
        // Navigate to orders view - you'll need to update DashboardLayout to handle this
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'orders' }));
    };

    const open = Boolean(anchorEl);
    const id = open ? 'notification-popover' : undefined;

    const getNotificationIcon = (type) => {
        return type === 'order' ? <ShoppingCartIcon /> : <EventIcon />;
    };

    const getNotificationColor = (type) => {
        return type === 'order' ? 'primary' : 'secondary';
    };

    return (
        <>
            <IconButton
                color="inherit"
                onClick={handleClick}
                sx={{
                    position: 'relative',
                    '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                }}
            >
                <Badge badgeContent={totalNotifications} color="error" max={99}>
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                sx={{
                    mt: 1.5,
                    '& .MuiPaper-root': {
                        width: { xs: '90vw', sm: 380 },
                        maxHeight: 500,
                        borderRadius: 3,
                        boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Notifications
                        </Typography>
                        {totalNotifications > 0 && (
                            <Chip
                                label={totalNotifications}
                                color="error"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                            />
                        )}
                    </Box>

                    {totalNotifications === 0 && notificationHistory.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                No new notifications
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {notifications.orders > 0 && (
                                <Box sx={{ mb: 1 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="primary"
                                        startIcon={<ShoppingCartIcon />}
                                        onClick={handleViewOrders}
                                        sx={{
                                            justifyContent: 'flex-start',
                                            mb: 1,
                                            borderRadius: 2,
                                        }}
                                    >
                                        {notifications.orders} New Order{notifications.orders > 1 ? 's' : ''}
                                    </Button>
                                </Box>
                            )}


                            {notificationHistory.length > 0 && (
                                <>
                                    <Divider sx={{ my: 1.5 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Recent
                                        </Typography>
                                        <Button
                                            size="small"
                                            onClick={clearHistory}
                                            sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                                        >
                                            Clear
                                        </Button>
                                    </Box>
                                    <List sx={{ maxHeight: 300, overflow: 'auto', p: 0 }}>
                                        {notificationHistory.slice(0, 10).map((notification, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    py: 1,
                                                    px: 1.5,
                                                    borderRadius: 1,
                                                    mb: 0.5,
                                                    backgroundColor: 'rgba(198, 40, 40, 0.05)',
                                                }}
                                            >
                                                <ListItemIcon
                                                    sx={{
                                                        color: getNotificationColor(notification.type) + '.main',
                                                        minWidth: 36,
                                                    }}
                                                >
                                                    {getNotificationIcon(notification.type)}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={notification.message}
                                                    secondary={new Date(notification.timestamp).toLocaleTimeString()}
                                                    primaryTypographyProps={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                    }}
                                                    secondaryTypographyProps={{
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </>
                            )}

                            {totalNotifications > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                        onClick={() => {
                                            clearNotifications();
                                            handleClose();
                                        }}
                                        startIcon={<ClearIcon />}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Clear All Notifications
                                    </Button>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Popover>
        </>
    );
};

export default NotificationBell;




