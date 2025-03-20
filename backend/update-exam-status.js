const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch((err) => console.error('MongoDB Connection Error:', err));

// Import Exam model
const Exam = require('./models/Exam');

async function updateExamStatus(examId) {
  try {
    if (!examId) {
      console.log('Please provide an exam ID as a command-line argument.');
      console.log('Usage: node update-exam-status.js EXAM_ID');
      return;
    }
    
    // Update the exam status to PUBLISHED
    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      { status: 'PUBLISHED' },
      { new: true } // Return the updated document
    );
    
    if (updatedExam) {
      console.log('Exam updated successfully!');
      console.log('Updated exam details:');
      console.log({
        id: updatedExam._id,
        title: updatedExam.title,
        status: updatedExam.status,
        startTime: updatedExam.startTime,
        endTime: updatedExam.endTime
      });
    } else {
      console.log('Exam not found. Please check the ID.');
    }
  } catch (error) {
    console.error('Error updating exam:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Get exam ID from command-line argument or use the default one
const examId = process.argv[2] || '67dc4784d2fa8b61d0ca77f7';

// Run the update function
updateExamStatus(examId); 