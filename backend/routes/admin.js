const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('./auth');
const bcrypt = require('bcryptjs');

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Get all users
router.get('/users', [verifyToken, isAdmin], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID
router.get('/users/:id', [verifyToken, isAdmin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new user
router.post('/users', [verifyToken, isAdmin], async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'student'
    });

    await user.save();

    // Return the user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user
router.put('/users/:id', [verifyToken, isAdmin], async (req, res) => {
  try {
    const { name, email, role, password, rollNumber, batch } = req.body;
    const updateData = { name, email, role, rollNumber, batch };

    // If password is being updated, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Remove undefined or null fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/users/:id', [verifyToken, isAdmin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Prevent deleting another admin
    if (user.role === 'admin' && req.user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete another admin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create initial admin user (should only be used once during setup)
router.post('/setup-admin', async (req, res) => {
  try {
    // Check if an admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists. This endpoint can only be used once.' });
    }

    const { name, email, password } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();

    // Return the admin user without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      message: 'Admin user created successfully',
      user: adminResponse
    });
  } catch (error) {
    console.error('Error setting up admin:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 