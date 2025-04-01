const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); 
const User = require('./models/usermodel');

const app = express();
const port = 3000;

// const MONGO_URL = "mongodb://127.0.0.1:27017/project2";
const MONGO_URL = process.env.MONGO_URL;

main().then(() => {
    console.log("Connected to MongoDB successfully");
}).catch(err => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}


app.use(express.urlencoded({ extended: true }));


app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));


app.set('view engine', 'ejs');


app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    const message = req.query.message;
    res.render('index', { message });
});

app.post('/login', async (req, res) => {
    const { email, mobile, password } = req.body;

    if (!email && !mobile) {
        return res.status(400).send('Email or mobile number is required');
    }

    try {
        const user = new User({ email, mobile, password });
        await user.save();

        req.session.user = user;

        res.redirect('/dashboard'); 
    } catch (error) {
        console.error('Error registering user:', error.message);

        res.send("user already exists");
    }
});


app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/'); 
    }

    res.render('dashboard', { user: req.session.user });
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/'); 
    });
});


app.get('/forgot-password', (req, res) => {
    const message = req.query.message;
    res.render('reset-password', { message });
});


app.post('/send-reset-link', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.redirect('/forgot-password?message=User not found');
        }

        // Check if the user has already requested a password reset within the last 24 hours
        if (user.lastPasswordResetRequest && (Date.now() - user.lastPasswordResetRequest.getTime()) < 24 * 60 * 60 * 1000) {
            return res.redirect('/forgot-password?message=You can only request a password reset once per day');
        }

        // Generate a random password
        const newPassword = user.generateRandomPassword();
        user.password = newPassword;
        user.lastPasswordResetRequest = Date.now();
        await user.save();

        // Send the new password to the user's email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'prasadbhakare.5@gmail.com', 
                pass: 'csth lvie sjdr jzlk' 
            }
        });

        const mailOptions = {
            from: 'rushikeshkokate118@gmail.com',
            to: user.email,
            subject: 'Your New Password',
            text: `Your new password is: ${newPassword}`
        };

        await transporter.sendMail(mailOptions);
        res.redirect('/forgot-password?message=New password sent to your email');
    } catch (error) {
        console.error('Error sending reset link:', error.message);
        res.redirect('/forgot-password?message=Error sending reset link');
    }
});


app.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect('/forgot-password?message=Invalid or expired reset link');
        }

        res.render('reset-password-form', { token });
    } catch (error) {
        console.error('Error resetting password:', error.message);
        res.redirect('/forgot-password?message=Error resetting password');
    }
});


app.post('/update-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect('/forgot-password?message=Invalid or expired reset link');
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.redirect('/?message=Password updated successfully');
    } catch (error) {
        console.error('Error updating password:', error.message);
        res.redirect('/forgot-password?message=Error updating password');
    }
}); 


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});