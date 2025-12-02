
import React from 'react';

export enum Role {
  OFFICER = 'OFFICER',
  STUDENT = 'STUDENT'
}

export enum Tab {
  DASHBOARD = 'DASHBOARD',
  FUNDS = 'FUNDS',
  AGENDA = 'AGENDA',
}

export interface User {
  id: string;
  username: string;
  role: Role;
  avatar?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  tags?: string[];
  isImportant: boolean;
}

export interface Student {
  id: string;
  name: string;
  gender: 'M' | 'F';
  // Ledger: Date (YYYY-MM-DD) -> Amount Paid
  payments: Record<string, number>; 
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: 'EXPENSE' | 'INCOME'; 
  category?: string;
  status?: 'PAID' | 'PENDING'; // Paid = Actual spending, Pending = Debt/Promise
}

export interface PlannedExpense {
  id: string;
  item: string;
  estimatedCost: number;
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
}

export interface AppSettings {
  dailyQuota: number;
  customQuotas: Record<string, number>; // Date -> Quota Amount
  collectionDays: Record<string, boolean>; // Date -> Is Collection Active?
  currencySymbol: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'HOMEWORK' | 'EXAM' | 'EVENT';
}
