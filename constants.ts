
import { AgendaItem, Student } from './types';

export const CLASS_QUOTA = 50; 

// Updated Data from User Request
export const INITIAL_STUDENTS: Student[] = [
  // Males
  { id: 'm1', name: 'Agarao, Franco Angelo', gender: 'M', payments: {} },
  { id: 'm2', name: 'Bobares, John Marel', gender: 'M', payments: {} },
  { id: 'm3', name: 'Borrico, Ralph Syrill', gender: 'M', payments: {} },
  { id: 'm4', name: 'Espago, Mart Sandy', gender: 'M', payments: {} },
  { id: 'm5', name: 'Garopel, Symon Patrick', gender: 'M', payments: {} },
  { id: 'm6', name: 'Handog, Shane Kian', gender: 'M', payments: {} },
  { id: 'm7', name: 'Hingada, Chris Michael', gender: 'M', payments: {} },
  { id: 'm8', name: 'Ignacio, Nash Paul', gender: 'M', payments: {} },
  { id: 'm9', name: 'Libot, Jake', gender: 'M', payments: {} },
  { id: 'm10', name: 'Luna, John Paul', gender: 'M', payments: {} },
  { id: 'm11', name: 'Monterey, Mhiko', gender: 'M', payments: {} },
  { id: 'm12', name: 'Namuco, John Peter', gender: 'M', payments: {} },
  { id: 'm13', name: 'Reyes, Jose Antonio Lorenzo', gender: 'M', payments: {} },
  { id: 'm14', name: 'Sadian, John Zen', gender: 'M', payments: {} },
  { id: 'm15', name: 'Talon, Denzel', gender: 'M', payments: {} },
  // Females
  { id: 'f1', name: 'Baldespinosa, Joanah Mae', gender: 'F', payments: {} },
  { id: 'f2', name: 'Cacayuran, Zaicy', gender: 'F', payments: {} },
  { id: 'f3', name: 'Dalay, Shairah Mae', gender: 'F', payments: {} },
  { id: 'f4', name: 'Dela Cruz, Janil Jhane', gender: 'F', payments: {} },
  { id: 'f5', name: 'Espenocilla, Sally', gender: 'F', payments: {} },
  { id: 'f6', name: 'Flores, Frances Miche Janne', gender: 'F', payments: {} },
  { id: 'f7', name: 'Gayatgay, Richell', gender: 'F', payments: {} },
  { id: 'f8', name: 'Handog, Princess Jenn', gender: 'F', payments: {} },
  { id: 'f9', name: 'Herrera, Kim Caullie', gender: 'F', payments: {} },
  { id: 'f10', name: 'Napalan, Reynalin Rose', gender: 'F', payments: {} },
  { id: 'f11', name: 'Panganod, Kylle Erica', gender: 'F', payments: {} },
  { id: 'f12', name: 'Sabater, Nian Joyce', gender: 'F', payments: {} },
  { id: 'f13', name: 'Salcedo, Rosemarie', gender: 'F', payments: {} },
  { id: 'f14', name: 'Sastrillo, Eunice Christen', gender: 'F', payments: {} },
  { id: 'f15', name: 'Set, January Ross', gender: 'F', payments: {} },
  { id: 'f16', name: 'Taduran, Cedi', gender: 'F', payments: {} },
  { id: 'f17', name: 'Uylengco, Fatima', gender: 'F', payments: {} },
  { id: 'f18', name: 'Wee Sit, Jazzryl Faith', gender: 'F', payments: {} },
];

export const INITIAL_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Final Exam Schedule Posted',
    content: 'Please check the agenda for the upcoming math and science final exams.',
    date: new Date().toISOString(),
    author: 'President',
    isImportant: true,
  },
  {
    id: '2',
    title: 'Class Tee Design Submission',
    content: 'Submit your designs by Friday!',
    date: new Date(Date.now() - 86400000).toISOString(),
    author: 'Secretary',
    isImportant: false,
  }
];

export const INITIAL_AGENDA: AgendaItem[] = [
  { id: '1', title: 'Math Final', date: '2023-12-15', time: '09:00', type: 'EXAM' },
  { id: '2', title: 'History Essay Due', date: '2023-12-10', time: '23:59', type: 'HOMEWORK' },
  { id: '3', title: 'Class Potluck', date: '2023-12-20', time: '12:00', type: 'EVENT' },
];
