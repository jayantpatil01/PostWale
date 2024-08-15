const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const authenticate = require('../middleware/authenticate');
const upload = require('../config/multerconfig');
const userModel = require('../models/userModel');
const postModel = require('../models/postModel');

// User Routes
router.get('/', (req, res) => {
    res.render("Register");
});

router.post('/register', upload.single("avatar"), async (req, res) => {
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
        res.cookie("Token", token);
        res.redirect('/Home');
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).render('Register', { error: "Error registering user. Please try again." });
    }
});




router.get('/login', (req, res) => {
    const message = req.query.message || '';
    res.render('Login', { message });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).render('Login', { message: "User not found" });
        }

        const result = await bcrypt.compare(password, user.password);
        if (result) {
            const token = jwt.sign({ email: user.email, id: user._id }, process.env.SecretKey);
            res.cookie("Token", token);
            res.redirect('/Home');
        } else {
            res.status(400).render('Login', { message: "Invalid password" });
        }
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).render('Login', { message: "Error logging in. Please try again." });
    }
});


router.get('/Home', authenticate, async (req, res) => {
    try {
        const posts = await postModel.find().populate('author', 'name avatar');
        res.render('Home', { user: req.user, posts });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).render('Home', { user: req.user, posts: [], error: "Error fetching posts. Please try again later." });
    }
});


router.get('/Home/Users', authenticate, async (req, res) => {
    try {
        const users = await userModel.find();
        res.render('Users', { users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).render('Users', { users: [], error: "Error fetching users. Please try again later." });
    }
});


router.get('/myprofile', authenticate, async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id).populate('posts');
        res.render('Profile', { user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).render('Profile', { user: {}, error: "Error fetching user profile. Please try again later." });
    }
});

router.get('/logout', authenticate, (req, res) => {
    res.cookie('Token', '', { maxAge: 0 });
    res.redirect('/login');
});

module.exports = router;


