import React, { useState, useEffect } from 'react';
import { databases, storage } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { TextField, Button, Typography, Container, Box, Alert, Checkbox, FormControlLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, Chip, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, ListItemSecondaryAction, Switch, Collapse, Divider, Grid, Card, CardContent } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const MENU_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MENU_COLLECTION_ID || 'menu';
const CATEGORIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID;
const MENU_BUCKET_ID = import.meta.env.VITE_APPWRITE_MENU_BUCKET_ID;


const MenuManager = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [bestSeller, setBestSeller] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editImageFile, setEditImageFile] = useState(null);
    const [editBestSeller, setEditBestSeller] = useState(false);
    const [editSelectedCategory, setEditSelectedCategory] = useState('');
    const [selectedCategoryView, setSelectedCategoryView] = useState(''); // Navigation-based view
    const [showCategories, setShowCategories] = useState(false);

    // --- Fetch Menu Items and Categories on Load ---
    useEffect(() => {
        fetchMenuItems();
        fetchCategories();
    }, []);

    // --- Listen for category selection from DashboardLayout ---
    useEffect(() => {
        const handleCategorySelection = (e) => {
            if (e?.detail) {
                setSelectedCategory(e.detail);
            }
        };
        window.addEventListener('set-category', handleCategorySelection);
        return () => window.removeEventListener('set-category', handleCategorySelection);
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION_ID, [
                Query.limit(100)
            ]);
            const docs = (response.documents || []).map(d => ({
                $id: d.$id,
                name: d.name || '',
                color: d.color || '#2196F3',
            }));
            setCategories(docs);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const fetchMenuItems = async () => {
        try {
            console.log('🔍 Fetching menu items from collection:', MENU_COLLECTION_ID);
            const response = await databases.listDocuments(DATABASE_ID, MENU_COLLECTION_ID, [
                Query.limit(500)
            ]);
            console.log('📊 Response:', response);
            console.log('📊 Documents count:', response.documents?.length || 0);
            
            const docs = (response.documents || []).map(d => ({
                $id: d.$id,
                name: d.name || '',
                price: parseFloat(d.price || 0) || 0,
                category: d.category || 'Uncategorized',
                image_url: d.image || d.image_url || '',
                description: d.description || '',
                bestSeller: !!d.bestSeller || false,
            }));
            
            console.log('📋 Processed documents:', docs);
            setMenuItems(docs);
            
            if (docs.length === 0) {
                setMessage('No menu items found. Please add some items.');
            }
        } catch (error) {
            console.error("Error fetching menu:", error);
            setMessage('Error loading menu items. Check console for details.');
        }
    };

    // --- Group Items by Category ---
    const groupItemsByCategory = (items) => {
        const grouped = {};
        items.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });
        return grouped;
    };


    // --- Handle Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('Saving menu item...');

        try {
            let uploadedImageUrl = imageUrl;

            if (imageFile) {
                const uploadedFile = await storage.createFile(MENU_BUCKET_ID, ID.unique(), imageFile);
                uploadedImageUrl = storage.getFileView(MENU_BUCKET_ID, uploadedFile.$id).href;
            }

            const menuData = {
                name,
                price: parseFloat(price),
                description,
                image_url: uploadedImageUrl,
                bestSeller,
                category: selectedCategory || 'Uncategorized',
            };

            await databases.createDocument(DATABASE_ID, MENU_COLLECTION_ID, ID.unique(), menuData);

            setMessage('Menu item added successfully!');
            fetchMenuItems(); // Refresh the list
            // Clear form inputs
            setName('');
            setPrice('');
            setDescription('');
            setImageUrl('');
            setBestSeller(false);
            setSelectedCategory('');
            setImageFile(null);

        } catch (error) {
            console.error("Submission error:", error);
            setMessage(`Error: ${error.message || 'Failed to save item.'}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Toggle Best Seller ---
    const toggleBestSeller = async (id, currentBestSeller) => {
        try {
            await databases.updateDocument(DATABASE_ID, MENU_COLLECTION_ID, id, { bestSeller: !currentBestSeller });
            fetchMenuItems(); // Refresh the list
            setMessage('Best seller status updated successfully!');
        } catch (error) {
            console.error("Error toggling best seller:", error);
            setMessage('Error updating best seller status.');
        }
    };

    // --- Delete Menu Item ---
    const handleDelete = async () => {
        if (!itemToDelete) return;
        
        try {
            setLoading(true);
            await databases.deleteDocument(DATABASE_ID, MENU_COLLECTION_ID, itemToDelete.$id);
            setMessage('Menu item deleted successfully!');
            setShowDeleteDialog(false);
            setItemToDelete(null);
            fetchMenuItems(); // Refresh the list
        } catch (error) {
            console.error("Error deleting menu item:", error);
            setMessage('Error deleting menu item.');
        } finally {
            setLoading(false);
        }
    };

    const openDeleteDialog = (item) => {
        setItemToDelete(item);
        setShowDeleteDialog(true);
    };

    const closeDeleteDialog = () => {
        setShowDeleteDialog(false);
        setItemToDelete(null);
    };

    // --- Edit Menu Item ---
    const openEditDialog = (item) => {
        setItemToEdit(item);
        setEditName(item.name);
        setEditPrice(item.price.toString());
        setEditDescription(item.description || '');
        setEditImageUrl(item.image_url || '');
        setEditBestSeller(item.bestSeller);
        setEditImageFile(null);
        setShowEditDialog(true);
    };

    const closeEditDialog = () => {
        setShowEditDialog(false);
        setItemToEdit(null);
        setEditImageFile(null);
    };

    const handleEditSubmit = async () => {
        if (!itemToEdit) return;
        
        try {
            setLoading(true);
            let uploadedImageUrl = editImageUrl;

            if (editImageFile) {
                const uploadedFile = await storage.createFile(MENU_BUCKET_ID, ID.unique(), editImageFile);
                uploadedImageUrl = storage.getFileView(MENU_BUCKET_ID, uploadedFile.$id).href;
            }

            const menuData = {
                name: editName,
                price: parseFloat(editPrice),
                description: editDescription,
                image_url: uploadedImageUrl,
                bestSeller: editBestSeller,
                category: editSelectedCategory || itemToEdit.category || 'Uncategorized',
            };

            await databases.updateDocument(DATABASE_ID, MENU_COLLECTION_ID, itemToEdit.$id, menuData);
            setMessage('Menu item updated successfully!');
            setShowEditDialog(false);
            setItemToEdit(null);
            fetchMenuItems(); // Refresh the list
        } catch (error) {
            console.error("Error updating menu item:", error);
            setMessage('Error updating menu item.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 1, sm: 0 } }}>
                <Box
                    sx={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: 2,
                        p: 2.5,
                        mb: 3,
                        width: '100%',
                        maxWidth: { xs: '100%', sm: '600px' },
                        border: '1px solid #ddd',
                    }}
                >
                    <Typography
                        variant="h4"
                        component="h2"
                        sx={{
                            fontSize: { xs: '1.5rem', sm: '2rem' },
                            textAlign: 'center',
                            color: '#333',
                            fontWeight: 'bold',
                        }}
                    >
                        Menu Management
                    </Typography>
                </Box>

                {message && (
                    <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ width: '100%', mb: 2 }}>
                        {message}
                    </Alert>
                )}

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        mt: 1,
                        width: '100%',
                        maxWidth: { xs: '100%', sm: '600px' },
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        p: 3,
                        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography
                        variant="h6"
                        component="h3"
                        gutterBottom
                        sx={{
                            fontSize: { xs: '1.125rem', sm: '1.25rem' },
                            color: 'text.primary',
                            fontWeight: 600,
                            mb: 2,
                        }}
                    >
                        Add New Item
                    </Typography>
                    <TextField
                        label="Item Name"
                        fullWidth
                        margin="normal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                            },
                        }}
                    />
                    <TextField
                        label="Price"
                        type="number"
                        fullWidth
                        margin="normal"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        step="0.01"
                        required
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                            },
                        }}
                    />
                    <TextField
                        label="Description"
                        fullWidth
                        margin="normal"
                        multiline
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                            },
                        }}
                    />
                    <TextField
                        label="Category"
                        fullWidth
                        margin="normal"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        placeholder="Type a category name (e.g. Burgers, Drinks, etc.)"
                        helperText="You can type a new category or use an existing one"
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                            },
                        }}
                    />
                    {categories.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, mb: 1 }}>
                            {categories.map((cat) => (
                                <Chip
                                    key={cat.$id}
                                    label={cat.name}
                                    size="small"
                                    onClick={() => setSelectedCategory(cat.name)}
                                    sx={{
                                        backgroundColor: selectedCategory === cat.name ? cat.color : 'transparent',
                                        color: selectedCategory === cat.name ? '#fff' : 'text.primary',
                                        border: `1px solid ${cat.color}`,
                                        cursor: 'pointer',
                                        '&:hover': { backgroundColor: cat.color, color: '#fff' },
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={bestSeller}
                                onChange={(e) => setBestSeller(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Mark as Best Seller"
                        sx={{ mt: 1, mb: 1 }}
                    />
                    <TextField
                        label="Image URL (or upload file below)"
                        fullWidth
                        margin="normal"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                            },
                        }}
                    />
                    <Typography variant="body2" sx={{ mt: 1, mb: 1, color: 'text.secondary' }}>
                        OR
                    </Typography>
                    <Box sx={{ mt: 1, mb: 2 }}>
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="image-file"
                            type="file"
                            onChange={(e) => setImageFile(e.target.files[0])}
                        />
                        <label htmlFor="image-file">
                            <Button
                                variant="outlined"
                                component="span"
                                fullWidth
                                sx={{
                                    minHeight: { xs: 48, sm: 40 },
                                    fontSize: { xs: '1rem', sm: '1rem' },
                                }}
                            >
                                {imageFile ? imageFile.name : 'Upload Image File (Optional)'}
                            </Button>
                        </label>
                    </Box>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        sx={{
                            mt: 2,
                            mb: 2,
                            minHeight: { xs: 48, sm: 40 }, // Touch-friendly
                            fontSize: { xs: '1rem', sm: '1rem' },
                        }}
                        fullWidth
                    >
                        {loading ? 'Processing...' : 'Add Menu Item'}
                    </Button>
                </Box>

                <hr style={{ width: '100%', margin: '24px 0' }}/>

                {/* Category Toggle */}
                {/* Category Quick Selection */}
                {categories.length > 0 && (
                    <Box
                        sx={{
                            backgroundColor: 'background.paper',
                            borderRadius: 2,
                            p: 2,
                            mb: 3,
                            width: '100%',
                            maxWidth: { xs: '100%', sm: '600px' },
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography
                            variant="h6"
                            component="h3"
                            sx={{
                                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                                color: 'text.primary',
                                fontWeight: 600,
                                mb: 2,
                            }}
                        >
                            Quick Category Selection
                        </Typography>
                        <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                        }}>
                            <Button
                                variant="text"
                                onClick={() => setSelectedCategory('')}
                                sx={{
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    px: 2,
                                    py: 1,
                                    color: selectedCategory === '' ? 'primary.main' : 'text.primary',
                                    fontWeight: selectedCategory === '' ? 'bold' : 'normal',
                                    '&:hover': {
                                        color: 'primary.main',
                                        backgroundColor: 'transparent',
                                    },
                                }}
                            >
                                Uncategorized
                            </Button>
                            {categories.map((category) => (
                                <Button
                                    key={category.$id}
                                    variant="text"
                                    onClick={() => setSelectedCategory(category.name)}
                                    sx={{
                                        fontSize: '0.875rem',
                                        textTransform: 'none',
                                        px: 2,
                                        py: 1,
                                        color: selectedCategory === category.name ? category.color : 'text.primary',
                                        fontWeight: selectedCategory === category.name ? 'bold' : 'normal',
                                        '&:hover': {
                                            color: category.color,
                                            backgroundColor: 'transparent',
                                        },
                                    }}
                                >
                                    {category.name}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Categories Section */}
                {categories.length > 0 && (
                    categories.map((category) => {
                        const categoryItems = menuItems.filter(item => item.category === category.name);
                        return (
                            <Box key={category.$id} sx={{ mb: 4 }}>
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
                                        <Box
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                backgroundColor: category.color,
                                                border: '2px solid rgba(0,0,0,0.2)',
                                            }}
                                        />
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                            {category.name.toUpperCase()}
                                        </Typography>
                                        <Chip
                                            label={`${categoryItems.length} items`}
                                            variant="outlined"
                                            size="small"
                                        />
                                    </Box>
                                </Box>
                                <Grid container spacing={2}>
                                    {categoryItems.map((item) => (
                                        <Grid item xs={12} sm={6} md={4} key={item.$id}>
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
                                                    {item.image_url && (
                                                        <Box
                                                            sx={{
                                                                borderRadius: 2,
                                                                overflow: 'hidden',
                                                                mb: 1.5,
                                                                boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
                                                            }}
                                                        >
                                                            <img
                                                                src={item.image_url}
                                                                alt={item.name}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '150px',
                                                                    objectFit: 'cover',
                                                                    display: 'block',
                                                                }}
                                                            />
                                                        </Box>
                                                    )}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                        <Typography
                                                            variant="h6"
                                                            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 'bold' }}
                                                        >
                                                            {item.name}
                                                        </Typography>
                                                        {item.bestSeller && (
                                                            <Chip
                                                                label="Best Seller"
                                                                color="warning"
                                                                size="small"
                                                                icon={<span style={{ fontSize: '1rem' }}>⭐</span>}
                                                            />
                                                        )}
                                                    </Box>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 'bold', color: 'primary.main' }}
                                                    >
                                                        ₱ {parseFloat(item.price).toFixed(2)}
                                                    </Typography>
                                                    {item.description && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.875rem' }, color: 'text.secondary', minHeight: 40 }}
                                                        >
                                                            {item.description}
                                                        </Typography>
                                                    )}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        flexDirection: { xs: 'column', sm: 'row' },
                                                        gap: 1,
                                                        mt: 2,
                                                    }}>
                                                        <Button
                                                            variant="outlined"
                                                            color="primary"
                                                            size="medium"
                                                            sx={{
                                                                minHeight: { xs: 44, sm: 36 },
                                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                                flex: 1,
                                                            }}
                                                            onClick={() => openEditDialog(item)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            color={item.bestSeller ? "secondary" : "primary"}
                                                            size="medium"
                                                            sx={{
                                                                minHeight: { xs: 44, sm: 36 },
                                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                                flex: 1,
                                                            }}
                                                            onClick={() => toggleBestSeller(item.$id, item.bestSeller)}
                                                        >
                                                            {item.bestSeller ? 'Remove Best Seller' : 'Mark as Best Seller'}
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
                                                            onClick={() => openDeleteDialog(item)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                    {categoryItems.length === 0 && (
                                        <Grid item xs={12}>
                                            <Card sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                                <Typography color="text.secondary">
                                                    No items in this category yet.
                                                </Typography>
                                            </Card>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        );
                    })
                )}

                {/* Items with categories not in the categories collection */}
                {(() => {
                    const categoryNames = categories.map(c => c.name);
                    const otherItems = menuItems.filter(item => {
                        const cat = item.category || '';
                        return cat !== '' && cat !== 'Uncategorized' && !categoryNames.includes(cat);
                    });
                    if (otherItems.length === 0) return null;
                    return (
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
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                        OTHER ITEMS
                                    </Typography>
                                    <Chip
                                        label={`${otherItems.length} items`}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                            <Grid container spacing={2}>
                                {otherItems.map((item) => (
                                    <Grid item xs={12} sm={6} md={4} key={item.$id}>
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
                                                {item.image_url && (
                                                    <Box
                                                        sx={{
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            mb: 1.5,
                                                            boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
                                                        }}
                                                    >
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.name}
                                                            style={{
                                                                width: '100%',
                                                                height: '150px',
                                                                objectFit: 'cover',
                                                                display: 'block',
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 'bold' }}
                                                    >
                                                        {item.name}
                                                    </Typography>
                                                    {item.bestSeller && (
                                                        <Chip
                                                            label="Best Seller"
                                                            color="warning"
                                                            size="small"
                                                            icon={<span style={{ fontSize: '1rem' }}>⭐</span>}
                                                        />
                                                    )}
                                                </Box>
                                                <Typography
                                                    variant="body1"
                                                    sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 'bold', color: 'primary.main' }}
                                                >
                                                    ₱ {parseFloat(item.price).toFixed(2)}
                                                </Typography>
                                                {item.description && (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.875rem' }, color: 'text.secondary', minHeight: 40 }}
                                                    >
                                                        {item.description}
                                                    </Typography>
                                                )}
                                                <Box sx={{
                                                    display: 'flex',
                                                    flexDirection: { xs: 'column', sm: 'row' },
                                                    gap: 1,
                                                    mt: 2,
                                                }}>
                                                    <Button
                                                        variant="outlined"
                                                        color="primary"
                                                        size="medium"
                                                        sx={{
                                                            minHeight: { xs: 44, sm: 36 },
                                                            fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                            flex: 1,
                                                        }}
                                                        onClick={() => openEditDialog(item)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        color={item.bestSeller ? "secondary" : "primary"}
                                                        size="medium"
                                                        sx={{
                                                            minHeight: { xs: 44, sm: 36 },
                                                            fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                            flex: 1,
                                                        }}
                                                        onClick={() => toggleBestSeller(item.$id, item.bestSeller)}
                                                    >
                                                        {item.bestSeller ? 'Remove Best Seller' : 'Mark as Best Seller'}
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
                                                        onClick={() => openDeleteDialog(item)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    );
                })()}

                {/* Uncategorized Section - Always show this section */}
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
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                UNCATEGORIZED ITEMS
                            </Typography>
                            {(() => {
                                const uncategorizedItems = menuItems.filter(item => !item.category || item.category === '' || item.category === 'Uncategorized');
                                return (
                                    <Chip
                                        label={`${uncategorizedItems.length} items`}
                                        variant="outlined"
                                        size="small"
                                    />
                                );
                            })()}
                        </Box>
                    </Box>
                    <Grid container spacing={2}>
                        {(() => {
                            const uncategorizedItems = menuItems.filter(item => !item.category || item.category === '' || item.category === 'Uncategorized');
                            return uncategorizedItems.map((item) => (
                                <Grid item xs={12} sm={6} md={4} key={item.$id}>
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
                                            {item.image_url && (
                                                <Box
                                                    sx={{
                                                        borderRadius: 2,
                                                        overflow: 'hidden',
                                                        mb: 1.5,
                                                        boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
                                                    }}
                                                >
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        style={{
                                                            width: '100%',
                                                            height: '150px',
                                                            objectFit: 'cover',
                                                            display: 'block',
                                                        }}
                                                    />
                                                </Box>
                                            )}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Typography
                                                    variant="h6"
                                                    sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 'bold' }}
                                                >
                                                    {item.name}
                                                </Typography>
                                                {item.bestSeller && (
                                                    <Chip
                                                        label="Best Seller"
                                                        color="warning"
                                                        size="small"
                                                        icon={<span style={{ fontSize: '1rem' }}>⭐</span>}
                                                    />
                                                )}
                                            </Box>
                                            <Typography
                                                variant="body1"
                                                sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 'bold', color: 'primary.main' }}
                                            >
                                                ₱ {parseFloat(item.price).toFixed(2)}
                                            </Typography>
                                            {item.description && (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.875rem' }, color: 'text.secondary', minHeight: 40 }}
                                                >
                                                    {item.description}
                                                </Typography>
                                            )}
                                            <Box sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 1,
                                                mt: 2,
                                            }}>
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    size="medium"
                                                    sx={{
                                                        minHeight: { xs: 44, sm: 36 },
                                                        fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                        flex: 1,
                                                    }}
                                                    onClick={() => openEditDialog(item)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    color={item.bestSeller ? "secondary" : "primary"}
                                                    size="medium"
                                                    sx={{
                                                        minHeight: { xs: 44, sm: 36 },
                                                        fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                                        flex: 1,
                                                    }}
                                                    onClick={() => toggleBestSeller(item.$id, item.bestSeller)}
                                                >
                                                    {item.bestSeller ? 'Remove Best Seller' : 'Mark as Best Seller'}
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
                                                    onClick={() => openDeleteDialog(item)}
                                                >
                                                    Delete
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ));
                        })()}
                        {(() => {
                            const uncategorizedItems = menuItems.filter(item => !item.category || item.category === '' || item.category === 'Uncategorized');
                            if (uncategorizedItems.length === 0) {
                                return (
                                    <Grid item xs={12}>
                                        <Card sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                            <Typography color="text.secondary">
                                                No uncategorized items.
                                            </Typography>
                                        </Card>
                                    </Grid>
                                );
                            }
                            return null;
                        })()}
                    </Grid>
                </Box>
            </Box>

            {/* Edit Menu Item Dialog */}
            <Dialog open={showEditDialog} onClose={closeEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Menu Item</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Item Name"
                        fullWidth
                        margin="normal"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '1rem',
                            },
                        }}
                    />
                    <TextField
                        label="Price"
                        type="number"
                        fullWidth
                        margin="normal"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        step="0.01"
                        required
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '1rem',
                            },
                        }}
                    />
                    <TextField
                        label="Description"
                        fullWidth
                        margin="normal"
                        multiline
                        rows={4}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '1rem',
                            },
                        }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="edit-category-label">Category</InputLabel>
                        <Select
                            labelId="edit-category-label"
                            value={editSelectedCategory || itemToEdit?.category || ''}
                            onChange={(e) => setEditSelectedCategory(e.target.value)}
                            label="Category"
                            sx={{
                                '& .MuiInputBase-root': {
                                    fontSize: '1rem',
                                },
                            }}
                        >
                            <MenuItem value="">
                                <em>Uncategorized</em>
                            </MenuItem>
                            {categories.map((category) => (
                                <MenuItem key={category.$id} value={category.name}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box
                                            sx={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                backgroundColor: category.color,
                                                border: '1px solid rgba(0,0,0,0.2)',
                                            }}
                                        />
                                        {category.name}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={editBestSeller}
                                onChange={(e) => setEditBestSeller(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Mark as Best Seller"
                        sx={{ mt: 1, mb: 1 }}
                    />
                    <TextField
                        label="Image URL (or upload file below)"
                        fullWidth
                        margin="normal"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '1rem',
                            },
                        }}
                    />
                    <Typography variant="body2" sx={{ mt: 1, mb: 1, color: 'text.secondary' }}>
                        OR
                    </Typography>
                    <Box sx={{ mt: 1, mb: 2 }}>
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="edit-image-file"
                            type="file"
                            onChange={(e) => setEditImageFile(e.target.files[0])}
                        />
                        <label htmlFor="edit-image-file">
                            <Button
                                variant="outlined"
                                component="span"
                                fullWidth
                                sx={{
                                    minHeight: 40,
                                    fontSize: '1rem',
                                }}
                            >
                                {editImageFile ? editImageFile.name : 'Upload New Image File (Optional)'}
                            </Button>
                        </label>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEditDialog} disabled={loading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleEditSubmit} 
                        color="primary" 
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update Item'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onClose={closeDeleteDialog}>
                <DialogTitle>Delete Menu Item</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Are you sure you want to delete "{itemToDelete?.name}"?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteDialog} disabled={loading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDelete} 
                        color="error" 
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MenuManager;
