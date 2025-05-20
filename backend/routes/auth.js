const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Register User
router.post('/register', async (req, res) => {
  try {
    // Validate request
    const { name, email, password, role, rollNumber, batch } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    
    // Role-specific validation
    if (role === 'student') {
      if (!rollNumber || !batch) {
        return res.status(400).json({ message: 'Roll number and batch are required for student registration' });
      }
    } else if (!email) {
      return res.status(400).json({ message: 'Email is required for non-student registration' });
    }

    // Check for email uniqueness (only for non-students)
    if (role !== 'student' && email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Check for roll number uniqueness (only for students)
    if (role === 'student' && rollNumber) {
      const rollNumberExists = await User.findOne({ rollNumber });
      if (rollNumberExists) {
        return res.status(400).json({ message: 'Roll number already exists' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user object based on role
    const userData = {
      name,
      password: hashedPassword,
      role: role || 'student'
    };
    
    // Add appropriate fields based on role
    if (role === 'student') {
      userData.rollNumber = rollNumber;
      userData.batch = batch;
      // For students, don't add email field at all
    } else {
      userData.email = email;
    }

    // Create user
    const user = new User(userData);
    await user.save();

    // Create and assign token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Return user data without sensitive information
    const userResponse = {
      _id: user._id,
      name: user.name,
      role: user.role
    };
    
    // Only add fields that exist
    if (user.email) userResponse.email = user.email;
    if (user.rollNumber) userResponse.rollNumber = user.rollNumber;
    if (user.batch) userResponse.batch = user.batch;

    res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Login User
router.post('/login', [
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('rollNumber').optional().notEmpty().withMessage('Roll number is required for students'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, rollNumber, password } = req.body;

    // Find user by email or roll number
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (rollNumber) {
      user = await User.findOne({ rollNumber });
    } else {
      return res.status(400).json({ message: 'Please provide either email or roll number' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and assign token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        batch: user.batch,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fix exports to ensure router is properly exported
module.exports = { router, verifyToken, isAdmin }; 