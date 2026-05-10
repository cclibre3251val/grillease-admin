// src/api/authService.js
import { account } from '../lib/appwrite';
import { ID } from 'appwrite';

export const authService = {
    login: async (email, password) => {
        try {
            // Try the most common method first
            if (typeof account.createEmailSession === 'function') {
                return await account.createEmailSession(email, password);
            }
            
            // Try alternative method names
            if (typeof account.createEmailPasswordSession === 'function') {
                return await account.createEmailPasswordSession(email, password);
            }
            
            if (typeof account.createSession === 'function') {
                return await account.createSession(email, password);
            }
            
            throw new Error('No suitable login method found in Appwrite SDK');
        } catch (error) {
            console.error('Login failed:', error);
            // Handle specific Appwrite error codes
            if (error.code === 422) {
                throw new Error('Invalid email or password. Please check your credentials.');
            } else if (error.code === 409) {
                throw new Error('A session already exists. Please try logging in again.');
            } else if (error.code === 400) {
                throw new Error('Invalid request. Please check your input and try again.');
            } else if (error.code === 401) {
                throw new Error('Authentication failed. Please check your credentials.');
            }
            throw new Error(error.message || 'Login failed. Please check your credentials.');
        }
    },

    logout: async () => {
        try {
            // Try the most common method first
            if (typeof account.deleteSession === 'function') {
                return await account.deleteSession('current');
            }
            
            // Try alternative method names
            if (typeof account.deleteSessions === 'function') {
                return await account.deleteSessions();
            }
            
            if (typeof account.getSession === 'function') {
                // If we can't delete, at least clear local storage
                localStorage.removeItem('appwrite_session');
                return;
            }
            
            throw new Error('No suitable logout method found in Appwrite SDK');
        } catch (error) {
            console.error('Logout error:', error);
            // Even if logout fails, clear local storage
            localStorage.removeItem('appwrite_session');
        }
    },

    getCurrentUser: async () => {
        try {
            // Try the most common method first
            if (typeof account.get === 'function') {
                return await account.get();
            }
            
            // Try alternative method names
            if (typeof account.getAccount === 'function') {
                return await account.getAccount();
            }
            
            if (typeof account.getSession === 'function') {
                return await account.getSession('current');
            }
            
            throw new Error('No suitable method to get current user found in Appwrite SDK');
        } catch (error) {
            console.error('Get current user failed:', error);
            if (error.code === 401 || error.message.includes('401')) {
                return null;
            }
            throw error;
        }
    },
};
