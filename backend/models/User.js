const mongoose = require('mongoose');

// Create separate schemas for student and non-student users
const baseSchema = {
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
};

// Add email field only for non-student users
const nonStudentSchema = {
  ...baseSchema,
  email: {
    type: String,
    required: function() {
      return this.role !== 'student';
    },
    unique: true,
    sparse: true
  }
};

// Add student-specific fields
const studentSchema = {
  ...baseSchema,
  rollNumber: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    unique: true,
    sparse: true
  },
  batch: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    set: function(value) {
      // Only transform if value exists and user is a student
      if (value && this.role === 'student') {
        return value.trim().toUpperCase();
      }
      return value;
    }
  }
};

// Combine all fields into one schema
const userSchema = new mongoose.Schema({
  ...nonStudentSchema,
  ...studentSchema
});

// Pre-save middleware to handle role-specific validation
userSchema.pre('save', function(next) {
  if (this.isModified('role') || this.isNew) {
    if (this.role === 'student') {
      // For students: require roll number and batch, remove email
      if (!this.rollNumber) {
        return next(new Error('Roll number is required for students'));
      }
      if (!this.batch) {
        return next(new Error('Batch is required for students'));
      }
      // Remove email field for students
      this.email = undefined;
    } else {
      // For non-students: require email, remove student fields
      if (!this.email) {
        return next(new Error('Email is required for non-students'));
      }
      // Remove student-specific fields for non-students
      this.rollNumber = undefined;
      this.batch = undefined;
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema); 