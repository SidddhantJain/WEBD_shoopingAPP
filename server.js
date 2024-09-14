require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

// CORS configuration - Allow specific origins and methods
app.use(cors({
    origin: ['http://localhost:5501', 'http://127.0.0.1:5501'], // Update as per your frontend setup
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Allow cookies and other credentials
}));

// Middleware to set CORS headers for all responses, ensuring proper CORS handling
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5501'); // Set allowed origin
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Set allowed methods
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Set allowed headers
    if (req.method === 'OPTIONS') {
        // Handle preflight requests
        res.sendStatus(204); // No Content
    } else {
        next();
    }
});

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'siddhant',
    database: process.env.DB_NAME || 'myappdata'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Middleware for token verification
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: 'Bearer <token>'
    if (!token) return res.sendStatus(401); // No token found

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next();
    });
}

// Signup Route
app.post('/signup', async (req, res) => {
    const { username, password, role, name, email, contact } = req.body;

    // Validation for contact number
    if (contact.length !== 10 || isNaN(contact)) {
        return res.status(400).json({ message: 'Invalid contact number. Must be 10 digits.' });
    }

    // Check if the username already exists
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error during user check.' });
        }
        if (result.length > 0) {
            return res.status(400).json({ message: 'Username already exists. Choose another one.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query(
                'INSERT INTO users (name, email, contact, username, password, role) VALUES (?, ?, ?, ?, ?, ?)', 
                [name, email, contact, username, hashedPassword, role], 
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Error saving user to database.' });
                    }
                    res.status(201).json({ message: 'User created successfully.' });
                }
            );
        } catch (error) {
            return res.status(500).json({ message: 'Error during account creation process.' });
        }
    });
});

// Login Route with JWT
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check user credentials
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error during login.' });
        }
        if (result.length === 0) {
            return res.status(400).json({ message: 'User not found. Please sign up first.' });
        }

        const user = result[0];
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials. Please try again.' });
            }

            // Generate JWT token
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ message: 'Login successful', token, role: user.role });
        } catch (error) {
            return res.status(500).json({ message: 'Error during login process.' });
        }
    });
});

// Add Product Route (Admin Only)
app.post('/admin/product', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { name, price, description, image_url } = req.body;

    if (!name || !price || !description || !image_url) {
        return res.status(400).json({ message: 'All fields are required to add a product.' });
    }

    db.query(
        'INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)', 
        [name, price, description, image_url], 
        (err) => {
            if (err) {
                return res.status(500).json({ message: 'Database error while adding product.' });
            }
            res.json({ message: 'Product added successfully.' });
        }
    );
});

// Get Products Route
app.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error retrieving products from database.' });
        }
        res.json(result);
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
