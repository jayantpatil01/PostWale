const express = require('express');
const dotenv = require('dotenv');
const app = express();
const userRoute = require('./routes/user');
const postRoute = require('./routes/post'); 
const ejs = require('ejs');
const path = require('path');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 8000; 

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");

// Use method-override middleware
app.use(methodOverride('_method'));

// Route
app.use('/', userRoute);
app.use('/', postRoute); 

app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});
