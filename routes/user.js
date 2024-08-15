const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const authenticate = require('../middleware/authenticate');
const upload = require('../config/multerconfig');
const userModel = require('../models/userModel');
const postModel = require('../models/postModel');
const { body, validationResult } = require('express-validator');

// User Routes

// Register Page Route
router.get('/', (req, res) => {
    res.render("Register");
});

// Register Route
router.post('/register', 
    upload.single("avatar"),
    [
        // Validate name
        body('name').notEmpty().withMessage('Name is required')
            .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
        
        // Validate email and check for uniqueness
        body('email').isEmail().withMessage('Invalid email format')
            .custom(async (email) => {
                const user = await userModel.findOne({ email });
                if (user) {
                    return Promise.reject('Email is already in use');
                }
            }),
        
        // Validate password
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
            .matches(/[a-z]/i).withMessage('Password must contain at least one letter')
            .matches(/\d/).withMessage('Password must contain at least one number'),
        
        // Validate mobile number
        body('mobile').isMobilePhone().withMessage('Invalid mobile number'),
        
        // Validate avatar file size and type
        body('avatar').custom((value, { req }) => {
            if (!req.file) {
                throw new Error('Avatar is required');
            }
            const fileSize = req.file.size / 1024 / 1024; // convert to MB
            const fileType = req.file.mimetype;
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (fileSize > 2) {
                throw new Error('Avatar size should be less than 2MB');
            }
            if (!validTypes.includes(fileType)) {
                throw new Error('Invalid file type. Only jpg, jpeg, webp, and png are allowed');
            }
            return true;
        })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('Register', { errors: errors.array() });
        }

        try {
            const { name, email, password, mobile } = req.body;
            const avatar = req.file ? req.file.filename : null;

            const salt = await bcrypt.genSalt(12);
            const hash = await bcrypt.hash(password, salt);

            const user = await userModel.create({
                name,
                email,
                mobile,
                password: hash,
                avatar
            });

            const token = jwt.sign({ email: user.email, id: user._id }, process.env.SecretKey);
            res.cookie("Token", token, { maxAge: 60 * 60 * 1000 }); // 1 hour
            res.redirect('/Home');
        } catch (error) {
            console.error("Error registering user:", error);
            res.status(500).render('Register', { errors: [{ msg: "Error registering user. Please try again." }] });
        }
    }
);


// GET Login Route
router.get('/login', (req, res) => {
    const message = req.query.message || '';
    const errors = []; // Initialize errors as an empty array
    res.render('Login', { errors, message });
});

// POST Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const errors = [];
    let message = '';

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            errors.push({ msg: "User not found" });
        } else {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                errors.push({ msg: "Invalid password" });
            }
        }

        if (errors.length > 0) {
            return res.status(400).render('Login', { errors, message, email });
        }

        const token = jwt.sign({ email: user.email, id: user._id }, process.env.SecretKey, { expiresIn: '1h' });
        res.cookie("Token", token, { maxAge: 60 * 60 * 1000 }); // 1 hour

        res.redirect('/Home');
    } catch (error) {
        console.error("Error logging in:", error);
        message = "Error logging in. Please try again.";
        res.status(500).render('Login', { message, errors, email });
    }
});




// Home Page Route
router.get('/Home', authenticate, async (req, res) => {
    try {
        const posts = await postModel.find().populate('author', 'name avatar');
        res.render('Home', { user: req.user, posts });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).render('Home', { user: req.user, posts: [], error: "Error fetching posts. Please try again later." });
    }
});

// Users Page Route
router.get('/Home/Users', authenticate, async (req, res) => {
    try {
        const users = await userModel.find();
        res.render('Users', { users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).render('Users', { users: [], error: "Error fetching users. Please try again later." });
    }
});

// Profile Page Route
router.get('/myprofile', authenticate, async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id).populate('posts');
        res.render('Profile', { user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).render('Profile', { user: {}, error: "Error fetching user profile. Please try again later." });
    }
});

// Logout Route
router.get('/logout', authenticate, (req, res) => {
    res.cookie('Token', '', { maxAge: 0 });
    res.redirect('/login');
});

module.exports = router;
