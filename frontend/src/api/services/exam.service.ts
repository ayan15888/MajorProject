import API from '../config';

export interface Exam {
  _id?: string;
  title: string;
  description: string;
  subject: string;
  duration: number;
  startTime: string; // ISO string format
  endTime: string;   // ISO string format
  totalMarks: number;
  status: 'DRAFT' | 'PUBLISHED' | 'SUBMITTED' | 'COMPLETED';
  questions?: Question[];
}

export interface Question {
  _id?: string;
  examId: string;
  questionText: string;
  questionType: 'MCQ' | 'TRUE_FALSE' | 'PARAGRAPH';
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  correctAnswer?: string;
  marks: number;
}

export interface ExamSubmission {
  _id: string;
  examId: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  answers: Array<{
    questionId: string;
    selectedOption: string;
    marksObtained: number;
  }>;
  totalMarksObtained: number;
  submittedAt: string;
  status: 'completed' | 'pending-review';
}

const formatDate = (date: string | Date | undefined): string => {
  if (!date) {
    console.error('Missing date value in exam data. This may indicate a problem with the exam record.');
    // Instead of using current date, we'll use a far-future date to make it obvious there's an issue
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  }

  try {
    let finalDate: Date;

    if (typeof date === 'string') {
      // Handle empty strings
      if (!date.trim()) {
        throw new Error('Empty date string provided');
      }

      // If it's already an ISO string, parse it
      if (date.includes('T')) {
        finalDate = new Date(date);
      } else if (date.includes(' ')) {
        // If it's a date string with time (e.g., from form inputs)
        finalDate = new Date(date);
      } else {
        // Try to parse the date
        finalDate = new Date(date);
      }
    } else if (date instanceof Date) {
      finalDate = date;
    } else {
      throw new Error(`Invalid date format: ${typeof date}`);
    }

    // Validate the parsed date
    if (isNaN(finalDate.getTime())) {
      throw new Error(`Invalid date value: ${date}`);
    }

    const isoString = finalDate.toISOString();
    console.log('Date formatting successful:', {
      input: date,
      parsed: finalDate.toLocaleString(),
      output: isoString
    });

    return isoString;
  } catch (error) {
    console.error('Error formatting date:', {
      error,
      input: date,
      inputType: typeof date,
      stack: new Error().stack
    });
    // Use a far-future date to make it obvious there's an issue
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  }
};

export const examService = {
  // Exam operations
  createExam: async (examData: Omit<Exam, '_id'>) => {
    const formattedData = {
      ...examData,
      startTime: formatDate(examData.startTime),
      endTime: formatDate(examData.endTime)
    };
    console.log('Creating exam with formatted data:', formattedData);
    const response = await API.post('/exams', formattedData);
    return response.data;
  },

  getTeacherExams: async () => {
    const response = await API.get('/exams/teacher');
    return response.data.map((exam: any) => ({
      ...exam,
      startTime: formatDate(exam.startTime),
      endTime: formatDate(exam.endTime)
    }));
  },

  getStudentExams: async () => {
    const response = await API.get('/exams/student');
    return response.data.map((exam: any) => ({
      ...exam,
      startTime: formatDate(exam.startTime),
      endTime: formatDate(exam.endTime)
    }));
  },

  getExamById: async (examId: string) => {
    console.log('Fetching exam with ID:', examId);
    const response = await API.get(`/exams/${examId}`);
    const examData = response.data;
    
    console.log('Raw exam data received:', {
      examId,
      hasData: !!examData,
      fields: examData ? Object.keys(examData) : [],
      rawStartTime: examData?.startTime,
      rawEndTime: examData?.endTime,
      rawStatus: examData?.status,
      currentTime: new Date().toISOString()
    });

    if (!examData) {
      console.error('No exam data received from API');
      throw new Error('Exam not found');
    }

    if (!examData.startTime || !examData.endTime) {
      console.error('Missing required date fields:', {
        hasStartTime: !!examData.startTime,
        hasEndTime: !!examData.endTime,
        examId,
        status: examData.status
      });
    }

    // Format dates and ensure all required fields are present
    const formattedExam = {
      ...examData,
      startTime: formatDate(examData.startTime),
      endTime: formatDate(examData.endTime),
      status: examData.status || 'DRAFT',
      duration: Number(examData.duration) || 0,
      totalMarks: Number(examData.totalMarks) || 0,
      questions: Array.isArray(examData.questions) ? examData.questions : []
    };

    console.log('Formatted exam data:', {
      examId,
      status: formattedExam.status,
      startTime: formattedExam.startTime,
      endTime: formattedExam.endTime,
      currentTime: new Date().toISOString(),
      isPublished: formattedExam.status === 'PUBLISHED',
      questionCount: formattedExam.questions.length,
      timeUntilStart: Math.floor((new Date(formattedExam.startTime).getTime() - Date.now()) / 1000 / 60),
      timeUntilEnd: Math.floor((new Date(formattedExam.endTime).getTime() - Date.now()) / 1000 / 60)
    });

    return formattedExam;
  },

  updateExam: async (examId: string, examData: Partial<Exam>) => {
    const formattedData = {
      ...examData,
      startTime: formatDate(examData.startTime),
      endTime: formatDate(examData.endTime)
    };
    const response = await API.put(`/exams/${examId}`, formattedData);
    return response.data;
  },

  deleteExam: async (examId: string) => {
    const response = await API.delete(`/exams/${examId}`);
    return response.data;
  },

  publishExam: async (examId: string) => {
    console.log('Publishing exam with ID:', examId);
    
    try {
      // Use the dedicated publish endpoint
      const response = await API.put(`/exams/${examId}/publish`);
      console.log('Publish exam response:', response.data);

      if (!response.data || response.data.status !== 'PUBLISHED') {
        throw new Error('Exam status was not updated properly');
      }
      
      // Return a properly formatted exam object
      const publishedExam = {
        ...response.data,
        startTime: formatDate(response.data.startTime),
        endTime: formatDate(response.data.endTime)
      };
      
      console.log('Formatted published exam:', publishedExam);
      return publishedExam;
    } catch (error) {
      console.error('Error publishing exam:', error);
      throw error;
    }
  },

  submitExam: async (examId: string, data: { answers: Array<{ questionId: string; selectedOption: string }> }) => {
    const response = await API.post(`/exams/${examId}/submit`, data);
    return response.data;
  },

  // Question operations
  addQuestion: async (examId: string, questionData: Omit<Question, '_id' | 'examId'>) => {
    const response = await API.post(`/exams/${examId}/questions`, questionData);
    return response.data;
  },

  updateQuestion: async (examId: string, questionId: string, questionData: Partial<Question>) => {
    const response = await API.put(`/exams/${examId}/questions/${questionId}`, questionData);
    return response.data;
  },

  deleteQuestion: async (examId: string, questionId: string) => {
    const response = await API.delete(`/exams/${examId}/questions/${questionId}`);
    return response.data;
  },

  getQuestions: async (examId: string) => {
    const response = await API.get(`/exams/${examId}/questions`);
    return response.data;
  },

  // Submission operations
  getExamSubmissions: async (examId: string) => {
    try {
      console.log(`Fetching submissions for exam: ${examId}`);
      const response = await API.get(`/results/exam/${examId}`);
      console.log(`Received ${response.data.length} submissions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching exam submissions:', error);
      throw error;
    }
  },
  
  updateSubmissionReview: async (resultId: string, updatedData: {
    answers: Array<{
      questionId: string;
      selectedOption: string;
      marksObtained: number;
    }>;
    totalMarksObtained: number;
  }) => {
    const response = await API.patch(`/results/review/${resultId}`, updatedData);
    return response.data;
  },
  
  publishResults: async (examId: string) => {
    console.log('Publishing results for exam with ID:', examId);
    
    try {
      // Update exam status to COMPLETED which means results are published
      const response = await API.put(`/exams/${examId}/complete`);
      console.log('Publish results response:', response.data);

      if (!response.data || response.data.status !== 'COMPLETED') {
        throw new Error('Exam status was not updated to COMPLETED');
      }
      
      // Return a properly formatted exam object
      const completedExam = {
        ...response.data,
        startTime: formatDate(response.data.startTime),
        endTime: formatDate(response.data.endTime)
      };
      
      console.log('Formatted completed exam with published results:', completedExam);
      return completedExam;
    } catch (error) {
      console.error('Error publishing exam results:', error);
      throw error;
    }
  },
  
  // Student result operations
  getStudentExamResult: async (examId: string) => {
    try {
      console.log(`Fetching student result for exam: ${examId}`);
      const response = await API.get(`/results/student/exam/${examId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student exam result:', error);
      throw error;
    }
  },
  
  // Get submission status of an exam (for teachers)
  getExamSubmissionStatus: async (examId: string) => {
    try {
      console.log(`Fetching submission status for exam: ${examId}`);
      const response = await API.get(`/exams/${examId}/submission-status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching exam submission status:', error);
      throw error;
    }
  }
}; 