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

async function listDraftExams() {
  try {
    // Find all exams with DRAFT status
    const draftExams = await Exam.find({ status: 'DRAFT' });
    
    console.log(`Found ${draftExams.length} exams in DRAFT status:`);
    
    if (draftExams.length > 0) {
      draftExams.forEach((exam, index) => {
        console.log(`\n${index + 1}. ${exam.title} (ID: ${exam._id})`);
        console.log(`   Subject: ${exam.subject}`);
        console.log(`   Start Time: ${exam.startTime}`);
        console.log(`   End Time: ${exam.endTime}`);
      });
      
      console.log('\nTo publish these exams, you can run:');
      console.log('\nnode update-exam-status.js EXAM_ID');
    }
  } catch (error) {
    console.error('Error listing draft exams:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the function
listDraftExams(); 