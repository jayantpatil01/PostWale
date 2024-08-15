const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel'); // Adjust the path

const authenticate = async (req, res, next) => {
    const token = req.cookies.Token; // Ensure this matches the cookie name used in the login route
    if (!token) {
        return res.redirect('/login?message=Please%20log%20in%20to%20access%20this%20page');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.SecretKey);

        // Fetch user by ID
        const user = await userModel.findById(decoded.id).exec();
        
        if (!user) {
            // If user not found, redirect to login
            return res.redirect('/login?message=User%20not%20found');
        }
        // Attach user to request
        req.user = user;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return res.redirect('/login?message=Invalid%20or%20expired%20token,%20please%20log%20in%20again');
    }
};

module.exports = authenticate;
