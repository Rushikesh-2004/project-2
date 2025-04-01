const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); 

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true, 
        sparse: true, 
        trim: true, 
        lowercase: true, 
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    mobile: {
        type: String,
        unique: true, 
        sparse: true, 
        trim: true, 
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid mobile number!`
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    resetPasswordToken: String, 
    resetPasswordExpires: Date,
    lastPasswordResetRequest: Date 
}, {
    timestamps: true 
});


userSchema.pre('save', async function (next) {
    const user = this;

    if (!user.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        user.password = hashedPassword;
        next();
    } catch (error) {
        return next(error);
    }
});


userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};


userSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex'); 
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex'); 
    this.resetPasswordExpires = Date.now() + 3600000; 
    return resetToken; 
};


userSchema.methods.generateRandomPassword = function () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};


const User = mongoose.model('User', userSchema);

module.exports = User;