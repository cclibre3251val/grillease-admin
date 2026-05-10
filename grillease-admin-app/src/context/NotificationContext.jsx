// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { databases, realtime } from '../lib/appwrite';
import { Query } from 'appwrite';

const NotificationContext = createContext();

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID;
const RESERVATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_RESERVATIONS_COLLECTION_ID;

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState({
        orders: 0,
        reservations: 0,
    });
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [isPolling, setIsPolling] = useState(true);

    const playNotificationSound = useCallback(() => {
        // ... (sound implementation remains the same)
    }, []);

    // Realtime subscription: prefer realtime events when available
    useEffect(() => {
        if (!realtime || !DATABASE_ID || !ORDERS_COLLECTION_ID || !RESERVATIONS_COLLECTION_ID) return;

        let sub = null;
        try {
            sub = realtime.subscribe([
                `databases.${DATABASE_ID}.collections.${ORDERS_COLLECTION_ID}.documents`,
                `databases.${DATABASE_ID}.collections.${RESERVATIONS_COLLECTION_ID}.documents`,
            ], (response) => {
                try {
                    const events = response?.events || [];
                    // We're interested in create events
                    const isCreate = events.some(e => /\.create$/.test(e) || /documents.create/.test(e));
                    if (!isCreate) return;

                    const payload = response?.payload || response?.document || {};
                    const collectionId = payload?.$collectionId || payload?.collectionId || null;

                    if (collectionId === ORDERS_COLLECTION_ID) {
                        // new order
                        const notification = {
                            type: 'order',
                            message: `1 new order received!`,
                            timestamp: new Date(),
                            count: 1,
                        };
                        setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                        setNotifications((prev) => ({ ...prev, orders: prev.orders + 1 }));
                        playNotificationSound();
                        try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'New order received', severity: 'info' } })); } catch(e) {}
                    }

                    if (collectionId === RESERVATIONS_COLLECTION_ID) {
                        const notification = {
                            type: 'reservation',
                            message: `1 new reservation received!`,
                            timestamp: new Date(),
                            count: 1,
                        };
                        setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                        setNotifications((prev) => ({ ...prev, reservations: prev.reservations + 1 }));
                        playNotificationSound();
                        try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'New reservation received', severity: 'info' } })); } catch(e) {}
                    }
                } catch (err) {
                    console.warn('Realtime handler error:', err);
                }
            });
        } catch (err) {
            console.warn('Realtime subscribe failed, falling back to polling', err);
        }

        return () => {
            try {
                if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
            } catch (err) {
                // ignore
            }
        };
    }, [playNotificationSound]);

    const checkNotifications = useCallback(async () => {
        if (!isPolling) return;

        try {
            // Check for new orders
            const ordersResponse = await databases.listDocuments(
                DATABASE_ID,
                ORDERS_COLLECTION_ID,
                [Query.equal('status', 'new')]
            );
            const ordersCount = ordersResponse.total || 0;

            // Check for new reservations
            const reservationsResponse = await databases.listDocuments(
                DATABASE_ID,
                RESERVATIONS_COLLECTION_ID,
                [Query.equal('status', 'new')]
            );
            const reservationsCount = reservationsResponse.total || 0;

            setNotifications((prev) => {
                const prevOrders = prev.orders;
                const prevReservations = prev.reservations;

                // Add to history if there are new notifications
                if (ordersCount > prevOrders) {
                    const newOrders = ordersCount - prevOrders;
                    const notification = {
                        type: 'order',
                        message: `${newOrders} new order${newOrders > 1 ? 's' : ''} received!`,
                        timestamp: new Date(),
                        count: newOrders,
                    };
                    setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                    playNotificationSound();
                }

                if (reservationsCount > prevReservations) {
                    const newReservations = reservationsCount - prevReservations;
                    const notification = {
                        type: 'reservation',
                        message: `${newReservations} new reservation${newReservations > 1 ? 's' : ''} received!`,
                        timestamp: new Date(),
                        count: newReservations,
                    };
                    setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                    playNotificationSound();
                }

                return {
                    orders: ordersCount,
                    reservations: reservationsCount,
                };
            });
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }, [isPolling, playNotificationSound]);

    const clearNotifications = (type = null) => {
        // ... (implementation remains the same)
    };

    const clearHistory = () => {
        setNotificationHistory([]);
    };

    useEffect(() => {
        if (!isPolling) return;

        checkNotifications();
        const interval = setInterval(checkNotifications, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [checkNotifications, isPolling]);

    const totalNotifications = notifications.orders + notifications.reservations;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                notificationHistory,
                totalNotifications,
                clearNotifications,
                clearHistory,
                setIsPolling,
                isPolling,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);

