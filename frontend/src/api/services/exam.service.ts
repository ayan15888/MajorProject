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
  status: 'DRAFT' | 'PUBLISHED' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'COMPLETED';
  batch: string;
  questions?: Question[];
  reviewNotes?: string;
  submissionCount?: number;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
  };
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
  getExamSubmissions: async (examId: string, isAdmin: boolean = false) => {
    try {
      console.log(`Fetching submissions for exam: ${examId}`);
      // Use admin endpoint if isAdmin is true, otherwise use teacher endpoint
      const endpoint = isAdmin ? `/results/admin/exam/${examId}` : `/results/teacher/exam/${examId}`;
      const response = await API.get(endpoint);
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
  
  // Get exam submission status (teacher only)
  getExamSubmissionStatus: async (examId: string) => {
    try {
      const response = await API.get(`/exams/${examId}/submission-status`);
      return {
        submissionCount: response.data.submissionCount,
        reviewedCount: response.data.reviewedCount,
        pendingReviewCount: response.data.pendingReviewCount
      };
    } catch (error) {
      console.error('Error getting exam submission status:', error);
      throw error;
    }
  },

  // Teacher requests admin to publish results
  requestPublishResults: async (examId: string, reviewNotes?: string) => {
    console.log('Requesting admin to publish results for exam:', examId);
    
    try {
      const response = await API.put(`/exams/${examId}/request-publish`, { reviewNotes });
      console.log('Request publish response:', response.data);

      // Return a properly formatted exam object
      const pendingExam = {
        ...response.data,
        startTime: formatDate(response.data.startTime),
        endTime: formatDate(response.data.endTime)
      };
      
      console.log('Formatted exam with pending approval:', pendingExam);
      return pendingExam;
    } catch (error) {
      console.error('Error requesting result publication:', error);
      throw error;
    }
  },
  
  // Admin approves result publication
  approvePublishResults: async (examId: string) => {
    console.log('Admin approving result publication for exam:', examId);
    
    try {
      const response = await API.put(`/exams/${examId}/approve-publish`);
      console.log('Approve publish response:', response.data);

      // Return a properly formatted exam object
      const approvedExam = {
        ...response.data,
        startTime: formatDate(response.data.startTime),
        endTime: formatDate(response.data.endTime)
      };
      
      console.log('Formatted exam with approved results:', approvedExam);
      return approvedExam;
    } catch (error) {
      console.error('Error approving result publication:', error);
      throw error;
    }
  },
  
  // Admin rejects result publication
  rejectPublishResults: async (examId: string, rejectReason?: string) => {
    console.log('Admin rejecting result publication for exam:', examId);
    
    try {
      const response = await API.put(`/exams/${examId}/reject-publish`, { rejectReason });
      console.log('Reject publish response:', response.data);

      // Return a properly formatted exam object
      const rejectedExam = {
        ...response.data,
        startTime: formatDate(response.data.startTime),
        endTime: formatDate(response.data.endTime)
      };
      
      console.log('Formatted exam with rejected publication:', rejectedExam);
      return rejectedExam;
    } catch (error) {
      console.error('Error rejecting result publication:', error);
      throw error;
    }
  },
  
  // Get pending approval exams (for admin)
  getPendingApprovalExams: async () => {
    try {
      console.log('Fetching pending approval exams');
      const response = await API.get('/exams/pending-approval');
      
      // Format dates for all exams
      const formattedExams = response.data.map((exam: any) => ({
        ...exam,
        startTime: formatDate(exam.startTime),
        endTime: formatDate(exam.endTime)
      }));
      
      console.log(`Found ${formattedExams.length} pending approval exams`);
      return formattedExams;
    } catch (error) {
      console.error('Error fetching pending approval exams:', error);
      throw error;
    }
  },

  // Cancel exam submission (admin only)
  cancelSubmission: async (submissionId: string, reason: string) => {
    try {
      console.log('Canceling submission:', submissionId);
      const response = await API.put(`/results/admin/cancel-submission/${submissionId}`, { reason });
      console.log('Submission canceled:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error canceling submission:', error);
      throw error;
    }
  },

  // Get all exams (admin only)
  getAllExams: async () => {
    try {
      console.log('Fetching all exams for admin');
      const response = await API.get('/exams/all-exams');
      
      // Format dates for all exams
      const formattedExams = response.data.map((exam: any) => ({
        ...exam,
        startTime: formatDate(exam.startTime),
        endTime: formatDate(exam.endTime)
      }));
      
      console.log(`Found ${formattedExams.length} exams`);
      return formattedExams;
    } catch (error) {
      console.error('Error fetching all exams:', error);
      throw error;
    }
  },

  verifyExamCode: async (examId: string, secureCode: string): Promise<{ verified: boolean }> => {
    try {
      const response = await API.post(`/exams/${examId}/verify-code`, { secureCode });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify exam code');
    }
  },

  reportCheatAttempt: async (examId: string, data: any): Promise<any> => {
    try {
      const response = await API.post(`/exams/${examId}/report-cheating`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to report cheat attempt:', error);
      // Don't throw error to prevent exam disruption
      return { success: false };
    }
  },

  disqualifyExam: async (examId: string, data: any): Promise<any> => {
    try {
      const response = await API.post(`/exams/${examId}/disqualify`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to disqualify exam:', error);
      throw new Error(error.response?.data?.message || 'Failed to disqualify exam');
    }
  },

  getCheatReports: async (examId: string): Promise<any[]> => {
    try {
      const response = await API.get(`/exams/${examId}/cheat-reports`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch cheat reports');
    }
  },
};

export default examService; 