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

async function updateCompletedExams() {
  try {
    const now = new Date();
    
    // Find all exams with SUBMITTED status where end time has passed
    const examsToUpdate = await Exam.find({
      status: 'SUBMITTED',
      endTime: { $lt: now }
    });
    
    console.log(`Found ${examsToUpdate.length} submitted exams that have ended and need to be marked as completed.`);
    
    if (examsToUpdate.length > 0) {
      // Update all these exams to COMPLETED status
      const updateResult = await Exam.updateMany(
        { 
          status: 'SUBMITTED',
          endTime: { $lt: now }
        },
        { status: 'COMPLETED' }
      );
      
      console.log(`Updated ${updateResult.modifiedCount} exams to COMPLETED status.`);
      
      // Log details of the updated exams
      examsToUpdate.forEach((exam, index) => {
        console.log(`\n${index + 1}. ${exam.title} (ID: ${exam._id})`);
        console.log(`   Subject: ${exam.subject}`);
        console.log(`   End Time: ${exam.endTime}`);
        console.log(`   Status changed from SUBMITTED to COMPLETED`);
      });
    } else {
      console.log('No exams need to be updated at this time.');
    }
  } catch (error) {
    console.error('Error updating exam statuses:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the function
updateCompletedExams(); 