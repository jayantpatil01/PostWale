const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const upload = require('../config/multerconfig');
const postModel = require('../models/postModel');
const userModel = require('../models/userModel');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Render the Create Post Page
router.get('/Home/creatpost', authenticate, (req, res) => {
    res.render('Createpost', { errors: [], title: '', content: '' });
});

// Create Post Route with Validation
router.post('/createpost', authenticate, upload.single("image"), [
    // Validate title
    body('title').notEmpty().withMessage('Title is required')
        .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),

    // Validate content
    body('content').notEmpty().withMessage('Content is required')
        .isLength({ min: 10 }).withMessage('Content must be at least 10 characters long'),

    // Validate image file size and type
    body('image').custom((value, { req }) => {
        if (!req.file) {
            throw new Error('Image is required');
        }
        const fileSize = req.file.size / 1024 / 1024; // Convert to MB
        const fileType = req.file.mimetype;
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

        // Adjusted size validation to allow images between 1 MB and 6 MB
        if (fileSize < 1 || fileSize > 6) {
            throw new Error('Image size must be between 1-6 MB');
        }
        if (!validTypes.includes(fileType)) {
            throw new Error('Invalid file type. Only jpg, jpeg, webp, and png are allowed');
        }
        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('Createpost', { 
            errors: errors.array(), 
            title: req.body.title || '', 
            content: req.body.content || '' 
        });
    }

    try {
        const userId = req.user._id;
        const { title, content } = req.body;
        const image = req.file ? req.file.filename : null;

        const post = await postModel.create({
            title,
            content,
            image,
            author: userId,
        });

        const user = await userModel.findById(userId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        } else {
            return res.status(404).json({ message: "User not found" });
        }

        res.redirect('/Home');
    } catch (error) {
        res.status(500).json({ message: "Error creating post", error });
    }
});



// Like Post Route
router.get('/like/:id', authenticate, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            console.error('Post not found');
            return res.status(404).send('Post not found');
        }
        const userId = req.user._id;
        const hasLiked = post.likes.includes(userId);

        if (hasLiked) {
            post.likes.pull(userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();
        res.redirect('/Home');
    } catch (error) {
        console.error('Error processing like request:', error);
        res.status(500).send('Server error');
    }
});

// Render Edit Post Page
router.get('/editpost/:id', authenticate, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this post" });
        }
        res.render('Edit', { post, errors: [] });
    } catch (error) {
        res.status(500).json({ message: "Error fetching post", error });
    }
});

// Update Post Route with Validation
router.post('/editpost/:id', authenticate, upload.single("image"), [
    // Validate title
    body('title').optional().isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),

    // Validate content
    body('content').optional().isLength({ min: 10 }).withMessage('Content must be at least 10 characters long'),

    // Validate image file size and type
    body('image').custom((value, { req }) => {
        if (req.file) {
            const fileSize = req.file.size / 1024 / 1024; // Convert to MB
            const fileType = req.file.mimetype;
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (fileSize < 5 || fileSize > 6) {
                throw new Error('Image size must be between 5-6 MB');
            }
            if (!validTypes.includes(fileType)) {
                throw new Error('Invalid file type. Only jpg, jpeg, webp, and png are allowed');
            }
        }
        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('Edit', { 
            post: req.body, 
            errors: errors.array() 
        });
    }

    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this post" });
        }
        post.title = req.body.title || post.title;
        post.content = req.body.content || post.content;
        if (req.file) {
            post.image = req.file.filename;
        }
        await post.save();
        res.redirect('/Home');
    } catch (error) {
        res.status(500).json({ message: "Error updating post", error });
    }
});

// Delete Post Route
router.post('/deletepost/:id', authenticate, async (req, res) => {
    try {
        const postId = req.params.id;

        // Check if the post exists
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if the user is authorized to delete the post
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this post" });
        }

        // Remove post from user's posts array
        const user = await userModel.findById(req.user._id);
        if (user) {
            user.posts.pull(postId);
            await user.save();
        } else {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete the image file from local storage
        if (post.image) {
            const imagePath = path.join(__dirname, '..', 'public', 'images', 'uploads', post.image);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Error deleting image file:", err);
                }
            });
        }

        // Delete the post
        await postModel.deleteOne({ _id: postId });
        res.redirect('/Home');
    } catch (error) {
        console.error("Error details:", error);
        res.status(500).json({ message: "Error deleting post", error: error.message });
    }
});

module.exports = router;
