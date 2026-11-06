const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 40,
    unique: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    unique: true
  },
  password: { type: String, required: true, select: false },
  age: { type: Number, min: 0, max: 100, default: null }
}, { timestamps: true })

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  password: { type: String, required: true, select: false },
  adminID: { type: String, required: true, unique: true, immutable: true }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)

module.exports = { Admin, User }
