
import { Student, Transaction, Announcement, AgendaItem, User, Role, AppSettings, PlannedExpense } from '../types';
import { INITIAL_ANNOUNCEMENTS, INITIAL_AGENDA, INITIAL_STUDENTS } from '../constants';

const DB_PREFIX = 'classroom_hq_final_'; 

const TABLES = {
  USERS: 'users',
  SESSION: 'session',
  STUDENTS: 'students',
  TRANSACTIONS: 'transactions',
  PLANNED_EXPENSES: 'planned_expenses',
  ANNOUNCEMENTS: 'announcements',
  AGENDA: 'agenda',
  SETTINGS: 'settings'
};

const DEFAULT_SETTINGS: AppSettings = {
    dailyQuota: 5,
    currencySymbol: '₱',
    customQuotas: {},
    collectionDays: {}
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockDatabase {
  private get<T>(table: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`${DB_PREFIX}${table}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set(table: string, data: any): void {
    try {
      localStorage.setItem(`${DB_PREFIX}${table}`, JSON.stringify(data));
    } catch (e) {
      console.error('DB Write Error', e);
    }
  }

  // --- Auth ---
  async login(username: string): Promise<User> {
    await delay(500);
    const user: User = {
      id: username.toLowerCase().replace(/\s/g, '_'),
      username,
      role: username.toLowerCase().includes('officer') || username.toLowerCase() === 'admin' ? Role.OFFICER : Role.STUDENT,
      avatar: `https://ui-avatars.com/api/?name=${username}&background=4F46E5&color=fff`
    };
    this.set(TABLES.SESSION, user);
    return user;
  }

  async logout(): Promise<void> {
    await delay(200);
    localStorage.removeItem(`${DB_PREFIX}${TABLES.SESSION}`);
  }

  getCurrentUser(): User | null {
    return this.get<User | null>(TABLES.SESSION, null);
  }

  // --- Settings ---
  getSettings(): AppSettings {
      const settings = this.get(TABLES.SETTINGS, DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS, ...settings };
  }

  saveSettings(settings: AppSettings): void {
      this.set(TABLES.SETTINGS, settings);
  }

  // --- Students ---
  getStudents(): Student[] {
    return this.get(TABLES.STUDENTS, INITIAL_STUDENTS);
  }
  
  saveStudents(data: Student[]): void {
    this.set(TABLES.STUDENTS, data);
  }

  addStudent(name: string, gender: 'M' | 'F' = 'M'): Student {
      const students = this.getStudents();
      const newStudent: Student = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name,
          gender, 
          payments: {}
      };
      this.saveStudents([...students, newStudent]);
      return newStudent;
  }

  deleteStudent(id: string): void {
      const students = this.getStudents().filter(s => s.id !== id);
      this.saveStudents(students);
  }

  importStudentsFromText(text: string): number {
      const lines = text.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
      const currentStudents = this.getStudents();
      const newStudents = lines.map(line => {
          // Try to parse Gender from line if format is "M, Name" or "Name (M)"
          let gender: 'M' | 'F' = 'M';
          let name = line;
          
          if (line.toUpperCase().startsWith('F ') || line.toUpperCase().startsWith('F,')) { gender = 'F'; name = line.substring(2).replace(/[,]/g, '').trim(); }
          else if (line.toUpperCase().startsWith('M ') || line.toUpperCase().startsWith('M,')) { gender = 'M'; name = line.substring(2).replace(/[,]/g, '').trim(); }
          
          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name,
            gender,
            payments: {}
          };
      });
      this.saveStudents([...currentStudents, ...newStudents]);
      return newStudents.length;
  }

  // --- Transactions ---
  getTransactions(): Transaction[] {
    return this.get(TABLES.TRANSACTIONS, []);
  }

  saveTransactions(data: Transaction[]): void {
    this.set(TABLES.TRANSACTIONS, data);
  }

  addExpense(amount: number, description: string, category: string): void {
      const txs = this.getTransactions();
      const newTx: Transaction = {
          id: Date.now().toString(),
          amount,
          description,
          date: new Date().toISOString(),
          type: 'EXPENSE',
          category,
          status: 'PAID'
      };
      this.saveTransactions([...txs, newTx]);
  }

  deleteTransaction(id: string): void {
      const txs = this.getTransactions().filter(t => t.id !== id);
      this.saveTransactions(txs);
  }

  // --- Planned Expenses ---
  getPlannedExpenses(): PlannedExpense[] {
      return this.get(TABLES.PLANNED_EXPENSES, []);
  }

  savePlannedExpenses(data: PlannedExpense[]): void {
      this.set(TABLES.PLANNED_EXPENSES, data);
  }

  addPlannedExpense(item: string, estimatedCost: number, priority: PlannedExpense['priority']): void {
      const plans = this.getPlannedExpenses();
      const newPlan: PlannedExpense = {
          id: Date.now().toString(),
          item,
          estimatedCost,
          priority
      };
      this.savePlannedExpenses([...plans, newPlan]);
  }

  deletePlannedExpense(id: string): void {
      const plans = this.getPlannedExpenses().filter(p => p.id !== id);
      this.savePlannedExpenses(plans);
  }

  // --- Announcements & Agenda ---
  getAnnouncements(): Announcement[] {
    return this.get(TABLES.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  }

  saveAnnouncements(data: Announcement[]): void {
    this.set(TABLES.ANNOUNCEMENTS, data);
  }

  getAgenda(): AgendaItem[] {
    return this.get(TABLES.AGENDA, INITIAL_AGENDA);
  }

  saveAgenda(data: AgendaItem[]): void {
    this.set(TABLES.AGENDA, data);
  }
}

export const db = new MockDatabase();
