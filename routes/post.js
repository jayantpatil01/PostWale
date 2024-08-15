const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const upload = require('../config/multerconfig');
const postModel = require('../models/postModel');
const userModel = require('../models/userModel');

// Post Routes
router.get('/Home/creatpost', authenticate, (req, res) => {
    res.render('Createpost');
});

router.post('/createpost', authenticate, upload.single("image"), async (req, res) => {
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

// Edit Post Route - GET (Render the edit form)
router.get('/editpost/:id', authenticate, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this post" });
        }
        res.render('Edit', { post });
    } catch (error) {
        res.status(500).json({ message: "Error fetching post", error });
    }
});

// Edit Post Route - POST (Update the post)
router.post('/editpost/:id', authenticate, upload.single("image"), async (req, res) => {
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

module.exports = router;
