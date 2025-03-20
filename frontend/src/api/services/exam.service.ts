import API from '../config';

export interface Exam {
  _id?: string;
  title: string;
  description: string;
  subject: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  totalMarks: number;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
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

export const examService = {
  // Exam operations
  createExam: async (examData: Omit<Exam, '_id'>) => {
    const response = await API.post('/exams', examData);
    return response.data;
  },

  getTeacherExams: async () => {
    const response = await API.get('/exams/teacher');
    return response.data;
  },

  getExamById: async (examId: string) => {
    const response = await API.get(`/exams/${examId}`);
    return response.data;
  },

  updateExam: async (examId: string, examData: Partial<Exam>) => {
    const response = await API.put(`/exams/${examId}`, examData);
    return response.data;
  },

  deleteExam: async (examId: string) => {
    const response = await API.delete(`/exams/${examId}`);
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
  }
}; 