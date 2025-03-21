const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow both React and Vite default ports
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected Successfully'))
.catch((err) => console.error('MongoDB Connection Error:', err));

// Import Exam model for status updates
const Exam = require('./models/Exam');

// Scheduled task to update exam statuses
const updateExamStatuses = async () => {
  try {
    const now = new Date();
    
    // Find all exams with SUBMITTED status where end time has passed
    const examsToUpdate = await Exam.find({
      status: 'SUBMITTED',
      endTime: { $lt: now }
    });
    
    if (examsToUpdate.length > 0) {
      // Update all these exams to COMPLETED status
      const updateResult = await Exam.updateMany(
        { 
          status: 'SUBMITTED',
          endTime: { $lt: now }
        },
        { status: 'COMPLETED' }
      );
      
      console.log(`[${new Date().toISOString()}] Updated ${updateResult.modifiedCount} exams from SUBMITTED to COMPLETED status.`);
    }
  } catch (error) {
    console.error('Error in scheduled exam status update:', error);
  }
};

// Run the status update task every minute
setInterval(updateExamStatuses, 60000);

// Routes
const { router: authRouter } = require('./routes/auth');
app.use('/api/auth', authRouter);
app.use('/api/exams', require('./routes/exam'));
app.use('/api/results', require('./routes/results'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Online Examination System API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Log available routes for debugging
  console.log('Available API routes:');
  console.log('- Authentication routes: /api/auth/*');
  console.log('- Exam routes: /api/exams/*');
  console.log('- Results routes: /api/results/*');
  
  // Run the status update task on server start
  updateExamStatuses();
}); 