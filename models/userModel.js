const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MongoUri;
if (!uri) {
    console.error('MongoUri is not defined in the environment variables');
    process.exit(1); 
}
mongoose.connect(uri).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Failed to connect to MongoDB', err);
});


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, 
    },
    email: {
        type: String,
        required: true, 
        unique: true,   
    },
    password: {
        type: String,
        required: true, 
    },
    mobile: {
        type: String,
        required: true, //
    },
    avatar: {
        type: String,
        default: 'Default.png', 
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post', // Ensure this matches the model name
    }]
});

module.exports = mongoose.model('User', userSchema);
