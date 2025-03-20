const axios = require('axios');

// Replace with a valid JWT token from localStorage after login
const token = 'YOUR_VALID_TOKEN_HERE'; 

async function testStudentExamsAPI() {
  try {
    const response = await axios.get('http://localhost:5000/api/exams/student', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('Student Exams:', response.data);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

testStudentExamsAPI(); 