import { QuizState, Participant, Question } from '../types';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  includeAnswerDetails: boolean;
  includeQuestionAnalytics: boolean;
  includeTimestamp: boolean;
}

export interface ExportData {
  quizSummary: {
    title: string;
    description: string;
    exportDate: string;
    totalQuestions: number;
    totalParticipants: number;
    averageScore: number;
    highestScore: number;
    participationRate: number;
    quizDuration: string;
  };
  participants: {
    rank: number;
    name: string;
    mobile: string;
    institute: string;
    finalScore: number;
    correctAnswers: number;
    totalQuestions: number;
    accuracy: number;
    averageTimePerQuestion: number;
    totalAnswerTime: number;
    bestStreak: number;
    badgesEarned: string;
    joinTime: string;
    lastSeen: string;
    pointsBreakdown: string;
  }[];
  questionAnalytics: {
    questionNumber: number;
    questionText: string;
    correctAnswer: string;
    totalResponses: number;
    correctResponses: number;
    accuracy: number;
    averageResponseTime: number;
    difficulty: string;
    points: number;
    categoryDistribution: string;
  }[];
  answerDetails?: {
    participantName: string;
    participantInstitute: string;
    questionNumber: number;
    questionText: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeToAnswer: number;
    pointsEarned: number;
    answeredAt: string;
  }[];
}

export class EnhancedExportManager {
  private quizState: QuizState;

  constructor(quizState: QuizState) {
    this.quizState = quizState;
  }

  private generateExportData(includeAnswerDetails: boolean = true): ExportData {
    const sortedParticipants = [...this.quizState.participants].sort((a, b) => b.score - a.score);
    const highestScore = Math.max(...sortedParticipants.map(p => p.score), 0);
    
    // Quiz Summary
    const quizSummary = {
      title: this.quizState.quizSettings.title,
      description: this.quizState.quizSettings.description,
      exportDate: new Date().toLocaleString(),
      totalQuestions: this.quizState.questions.length,
      totalParticipants: this.quizState.participants.length,
      averageScore: Math.round(this.quizState.statistics.averageScore),
      highestScore,
      participationRate: Math.round(this.quizState.statistics.participationRate),
      quizDuration: this.calculateQuizDuration(),
    };

    // Participant Data
    const participants = sortedParticipants.map((participant, index) => {
      const answers = Object.values(participant.answers);
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const totalAnswerTime = answers.reduce((sum, a) => sum + a.timeToAnswer, 0);
      const averageTimePerQuestion = answers.length > 0 ? totalAnswerTime / answers.length : 0;
      const accuracy = answers.length > 0 ? (correctAnswers / answers.length) * 100 : 0;
      
      return {
        rank: index + 1,
        name: participant.name,
        mobile: participant.mobile,
        institute: (participant as any).institute || 'Not specified',
        finalScore: participant.score,
        correctAnswers,
        totalQuestions: this.quizState.questions.length,
        accuracy: Math.round(accuracy * 10) / 10,
        averageTimePerQuestion: Math.round(averageTimePerQuestion * 10) / 10,
        totalAnswerTime: Math.round(totalAnswerTime * 10) / 10,
        bestStreak: participant.streak,
        badgesEarned: participant.badges.join('; '),
        joinTime: new Date(participant.joinedAt).toLocaleString(),
        lastSeen: new Date(participant.lastSeen).toLocaleString(),
        pointsBreakdown: this.generatePointsBreakdown(participant),
      };
    });

    // Question Analytics
    const questionAnalytics = this.quizState.questions.map((question, index) => {
      const questionAnswers = sortedParticipants
        .map(p => p.answers[question.id])
        .filter(a => a);
      
      const correctCount = questionAnswers.filter(a => a.isCorrect).length;
      const totalResponses = questionAnswers.length;
      const accuracy = totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0;
      const avgResponseTime = questionAnswers.length > 0 
        ? questionAnswers.reduce((sum, a) => sum + a.timeToAnswer, 0) / questionAnswers.length 
        : 0;

      return {
        questionNumber: index + 1,
        questionText: question.question,
        correctAnswer: question.options[question.correctAnswer],
        totalResponses,
        correctResponses: correctCount,
        accuracy: Math.round(accuracy * 10) / 10,
        averageResponseTime: Math.round(avgResponseTime * 10) / 10,
        difficulty: question.difficulty || 'medium',
        points: question.points || this.quizState.quizSettings.pointsPerQuestion,
        categoryDistribution: this.generateCategoryDistribution(question),
      };
    });

    const exportData: ExportData = {
      quizSummary,
      participants,
      questionAnalytics,
    };

    // Add detailed answer data if requested
    if (includeAnswerDetails) {
      exportData.answerDetails = this.generateAnswerDetails(sortedParticipants);
    }

    return exportData;
  }

  private calculateQuizDuration(): string {
    // Calculate approximate quiz duration based on questions and time limits
    const totalTimeLimit = this.quizState.questions.reduce((sum, q) => sum + (q.timeLimit || 30), 0);
    const minutes = Math.floor(totalTimeLimit / 60);
    const seconds = totalTimeLimit % 60;
    return `${minutes}m ${seconds}s`;
  }

  private generatePointsBreakdown(participant: Participant): string {
    const answers = Object.entries(participant.answers);
    const breakdown = answers.map(([questionId, answer]) => {
      const question = this.quizState.questions.find(q => q.id === questionId);
      return `Q${(question?.orderIndex ?? 0) + 1}: ${answer.pointsEarned}pts`;
    });
    return breakdown.join(', ');
  }

  private generateCategoryDistribution(question: Question): string {
    const category = question.category || 'General';
    const categoryQuestions = this.quizState.questions.filter(q => (q.category || 'General') === category);
    return `${category} (${categoryQuestions.length} questions)`;
  }

  private generateAnswerDetails(sortedParticipants: Participant[]) {
    const answerDetails: ExportData['answerDetails'] = [];

    sortedParticipants.forEach(participant => {
      Object.entries(participant.answers).forEach(([questionId, answer]) => {
        const question = this.quizState.questions.find(q => q.id === questionId);
        if (!question) return;

        answerDetails!.push({
          participantName: participant.name,
          participantInstitute: (participant as any).institute || 'Not specified',
          questionNumber: (question.orderIndex ?? 0) + 1,
          questionText: question.question,
          selectedAnswer: question.options[answer.answerIndex] || 'No answer',
          correctAnswer: question.options[question.correctAnswer],
          isCorrect: answer.isCorrect,
          timeToAnswer: Math.round(answer.timeToAnswer * 10) / 10,
          pointsEarned: answer.pointsEarned,
          answeredAt: new Date(answer.answeredAt).toLocaleString(),
        });
      });
    });

    return answerDetails.sort((a, b) => a.questionNumber - b.questionNumber);
  }

  public exportToCSV(options: Partial<ExportOptions> = {}): void {
    const opts: ExportOptions = {
      format: 'csv',
      includeAnswerDetails: true,
      includeQuestionAnalytics: true,
      includeTimestamp: true,
      ...options,
    };

    const exportData = this.generateExportData(opts.includeAnswerDetails);
    const csvData: string[][] = [];

    // Quiz Summary
    csvData.push(['=== QUIZ RESULTS EXPORT ===']);
    csvData.push(['Quiz Title:', exportData.quizSummary.title]);
    csvData.push(['Description:', exportData.quizSummary.description]);
    csvData.push(['Export Date:', exportData.quizSummary.exportDate]);
    csvData.push(['Total Questions:', exportData.quizSummary.totalQuestions.toString()]);
    csvData.push(['Total Participants:', exportData.quizSummary.totalParticipants.toString()]);
    csvData.push(['Average Score:', exportData.quizSummary.averageScore.toString()]);
    csvData.push(['Highest Score:', exportData.quizSummary.highestScore.toString()]);
    csvData.push(['Participation Rate:', `${exportData.quizSummary.participationRate}%`]);
    csvData.push(['Quiz Duration:', exportData.quizSummary.quizDuration]);
    csvData.push(['']); // Empty row

    // Participant Results
    csvData.push(['=== PARTICIPANT RESULTS ===']);
    csvData.push([
      'Rank', 'Name', 'Mobile', 'Institute/Organization', 'Final Score', 
      'Correct Answers', 'Total Questions', 'Accuracy %', 'Avg Time/Question (s)',
      'Total Answer Time (s)', 'Best Streak', 'Badges Earned', 'Join Time', 'Last Seen'
    ]);

    exportData.participants.forEach(participant => {
      csvData.push([
        participant.rank.toString(),
        participant.name,
        participant.mobile,
        participant.institute,
        participant.finalScore.toString(),
        participant.correctAnswers.toString(),
        participant.totalQuestions.toString(),
        `${participant.accuracy}%`,
        participant.averageTimePerQuestion.toString(),
        participant.totalAnswerTime.toString(),
        participant.bestStreak.toString(),
        participant.badgesEarned,
        participant.joinTime,
        participant.lastSeen,
      ]);
    });

    if (opts.includeQuestionAnalytics) {
      csvData.push(['']); // Empty row
      csvData.push(['=== QUESTION ANALYTICS ===']);
      csvData.push([
        'Question #', 'Question Text', 'Correct Answer', 'Total Responses',
        'Correct Responses', 'Accuracy %', 'Avg Response Time (s)', 'Difficulty', 'Points'
      ]);

      exportData.questionAnalytics.forEach(question => {
        csvData.push([
          question.questionNumber.toString(),
          question.questionText,
          question.correctAnswer,
          question.totalResponses.toString(),
          question.correctResponses.toString(),
          `${question.accuracy}%`,
          question.averageResponseTime.toString(),
          question.difficulty,
          question.points.toString(),
        ]);
      });
    }

    if (opts.includeAnswerDetails && exportData.answerDetails) {
      csvData.push(['']); // Empty row
      csvData.push(['=== DETAILED ANSWER LOG ===']);
      csvData.push([
        'Participant', 'Institute', 'Question #', 'Question Text', 'Selected Answer',
        'Correct Answer', 'Is Correct', 'Time to Answer (s)', 'Points Earned', 'Answered At'
      ]);

      exportData.answerDetails.forEach(answer => {
        csvData.push([
          answer.participantName,
          answer.participantInstitute,
          answer.questionNumber.toString(),
          answer.questionText,
          answer.selectedAnswer,
          answer.correctAnswer,
          answer.isCorrect ? 'Yes' : 'No',
          answer.timeToAnswer.toString(),
          answer.pointsEarned.toString(),
          answer.answeredAt,
        ]);
      });
    }

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    this.downloadFile(csvString, 'text/csv', 'csv');
  }

  public exportToJSON(options: Partial<ExportOptions> = {}): void {
    const opts: ExportOptions = {
      format: 'json',
      includeAnswerDetails: true,
      includeQuestionAnalytics: true,
      includeTimestamp: true,
      ...options,
    };

    const exportData = this.generateExportData(opts.includeAnswerDetails);
    const jsonString = JSON.stringify(exportData, null, 2);

    this.downloadFile(jsonString, 'application/json', 'json');
  }

  public exportToExcel(options: Partial<ExportOptions> = {}): void {
    // For now, export as enhanced CSV that Excel can handle well
    // Could be enhanced with a library like xlsx in the future
    this.exportToCSV({
      ...options,
      format: 'excel' as any,
    });
  }

  private downloadFile(content: string, mimeType: string, extension: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedTitle = this.quizState.quizSettings.title.replace(/[^a-zA-Z0-9]/g, '-');
    
    link.href = url;
    link.download = `purplehat-quiz-export-${sanitizedTitle}-${timestamp}.${extension}`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  // Quick export methods for common use cases
  public quickExportResults(): void {
    this.exportToCSV({
      includeAnswerDetails: false,
      includeQuestionAnalytics: true,
    });
  }

  public fullExportWithDetails(): void {
    this.exportToCSV({
      includeAnswerDetails: true,
      includeQuestionAnalytics: true,
    });
  }

  public exportParticipantsOnly(): void {
    this.exportToCSV({
      includeAnswerDetails: false,
      includeQuestionAnalytics: false,
    });
  }

  public exportQuestionAnalytics(): void {
    const exportData = this.generateExportData(false);
    const csvData: string[][] = [];

    csvData.push(['=== QUESTION ANALYTICS REPORT ===']);
    csvData.push(['Quiz:', exportData.quizSummary.title]);
    csvData.push(['Export Date:', exportData.quizSummary.exportDate]);
    csvData.push(['']); // Empty row

    csvData.push([
      'Question #', 'Question Text', 'Correct Answer', 'Total Responses',
      'Correct Responses', 'Accuracy %', 'Avg Response Time (s)', 'Difficulty', 'Points'
    ]);

    exportData.questionAnalytics.forEach(question => {
      csvData.push([
        question.questionNumber.toString(),
        question.questionText,
        question.correctAnswer,
        question.totalResponses.toString(),
        question.correctResponses.toString(),
        `${question.accuracy}%`,
        question.averageResponseTime.toString(),
        question.difficulty,
        question.points.toString(),
      ]);
    });

    const csvString = csvData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    this.downloadFile(csvString, 'text/csv', 'csv');
  }
}

// Export utility functions for backwards compatibility
export const exportQuizResults = (quizState: QuizState) => {
  const exporter = new EnhancedExportManager(quizState);
  exporter.quickExportResults();
};

export const exportFullQuizData = (quizState: QuizState) => {
  const exporter = new EnhancedExportManager(quizState);
  exporter.fullExportWithDetails();
}; 