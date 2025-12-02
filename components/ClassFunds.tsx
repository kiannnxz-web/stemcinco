
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Role, Student, Transaction, AppSettings, PlannedExpense } from '../types';
import { db } from '../services/db';
import { 
  BanknotesIcon, ChartPieIcon, TrashIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon,
  PlusIcon, Cog6ToothIcon, UserGroupIcon, ExclamationCircleIcon,
  CheckIcon, XMarkIcon, PencilSquareIcon, WalletIcon, ArrowTrendingDownIcon,
  ArchiveBoxIcon, EllipsisHorizontalIcon, FunnelIcon, TableCellsIcon, ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ClassFundsProps {
  role: Role;
}

type TabMode = 'DAILY' | 'BUDGET' | 'STUDENTS' | 'LEDGER';

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];
const EXPENSE_CATEGORIES = ['General', 'Materials', 'Events', 'Food', 'Utilities', 'Transport', 'Printing'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Modal Component (Internal UI) ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors"><XMarkIcon className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// --- Confirmation Modal ---
const ConfirmModal: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string; message: string }> = ({ isOpen, onConfirm, onCancel, title, message }) => {
    if(!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title}>
            <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><ExclamationCircleIcon className="w-6 h-6" /></div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md">Confirm</button>
                </div>
            </div>
        </Modal>
    );
};

const ClassFunds: React.FC<ClassFundsProps> = ({ role }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('DAILY');
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ dailyQuota: 5, currencySymbol: '₱', customQuotas: {}, collectionDays: {} });
  const [loading, setLoading] = useState(true);
  
  // Daily View State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Modals State
  const [modals, setModals] = useState({
      settings: false,
      expense: false,
      wishlist: false,
      payment: false,
      import: false,
      confirm: false,
      quotaEdit: false,
  });
  
  // Temp State for Modals
  const [tempPayment, setTempPayment] = useState<{ id: string, amount: string }>({ id: '', amount: '' });
  const [tempExpense, setTempExpense] = useState({ desc: '', cat: 'General', amount: '', isCustomCat: false, customCat: '' });
  const [tempWish, setTempWish] = useState({ item: '', cost: '', prio: 'Medium' as PlannedExpense['priority'] });
  const [tempQuota, setTempQuota] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ action: () => void, title: string, msg: string } | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setStudents(db.getStudents());
    setExpenses(db.getTransactions());
    setPlannedExpenses(db.getPlannedExpenses());
    setSettings(db.getSettings());
    setLoading(false);
  };

  // --- Logic Helpers ---
  const isCollectionActive = (date: string) => settings.collectionDays?.[date] === true;
  const getQuotaForDate = (date: string) => isCollectionActive(date) ? (settings.customQuotas?.[date] ?? settings.dailyQuota) : 0;
  
  const activeCollectionDates = useMemo(() => {
      // Get all dates that are marked as collection days AND are in the past/today
      return Object.keys(settings.collectionDays)
        .filter(d => settings.collectionDays[d] === true && d <= new Date().toISOString().split('T')[0])
        .sort();
  }, [settings.collectionDays]);

  const financials = useMemo(() => {
    let totalIncome = 0;
    
    // Calculate total collected from student ledger
    students.forEach(s => {
        Object.values(s.payments).forEach((amount: number) => totalIncome += amount);
    });

    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const currentBalance = totalIncome - totalExpenses;
    
    // Debt Calculation
    const debtors = students.map(s => {
        let paid = 0;
        let owe = 0;
        
        activeCollectionDates.forEach(date => {
            const q = settings.customQuotas?.[date] ?? settings.dailyQuota;
            const p = s.payments[date] || 0;
            paid += p;
            owe += q;
        });
        
        const debt = Math.max(0, owe - paid);
        return { ...s, debt };
    }).filter(s => s.debt > 0).sort((a, b) => b.debt - a.debt);

    const totalDebt = debtors.reduce((sum, s) => sum + s.debt, 0);
    const totalWishlist = plannedExpenses.reduce((sum, p) => sum + p.estimatedCost, 0);

    // Pie Chart Data
    const cats: Record<string, number> = {};
    expenses.forEach(e => cats[e.category || 'Other'] = (cats[e.category || 'Other'] || 0) + e.amount);
    const pieData = Object.keys(cats).map(name => ({ name, value: cats[name] }));

    return { totalIncome, totalExpenses, currentBalance, debtors, totalDebt, totalWishlist, pieData };
  }, [students, expenses, plannedExpenses, settings, activeCollectionDates]);


  // --- Actions ---

  const handleDateShift = (days: number) => {
    const d = new Date(selectedDate);
    // Skip weekends logic
    do {
        d.setDate(d.getDate() + days);
    } while (d.getDay() === 0 || d.getDay() === 6);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const toggleCollectionDay = () => {
    const isActive = isCollectionActive(selectedDate);
    const newSettings = { 
        ...settings, 
        collectionDays: { ...settings.collectionDays, [selectedDate]: !isActive } 
    };
    setSettings(newSettings);
    db.saveSettings(newSettings);
  };

  const togglePayment = (studentId: string) => {
      if (!isCollectionActive(selectedDate)) return; // Can't pay if not active
      const s = students.find(st => st.id === studentId);
      if(!s) return;

      const quota = getQuotaForDate(selectedDate);
      const current = s.payments[selectedDate] || 0;
      // Toggle: If fully paid -> 0, else -> quota
      const newAmt = current >= quota ? 0 : quota;

      updateStudentPayment(studentId, newAmt);
  };

  const updateStudentPayment = (id: string, amount: number) => {
      const updated = students.map(s => {
          if (s.id !== id) return s;
          return { ...s, payments: { ...s.payments, [selectedDate]: amount } };
      });
      setStudents(updated);
      db.saveStudents(updated);
  };

  const markAll = (paid: boolean) => {
      if (!isCollectionActive(selectedDate)) return;
      setConfirmAction({
          title: paid ? 'Mark All Paid?' : 'Reset All?',
          msg: `This will set everyone's payment for ${selectedDate} to ${paid ? 'Paid' : 'Unpaid'}.`,
          action: () => {
             const quota = getQuotaForDate(selectedDate);
             const updated = students.map(s => ({
                 ...s,
                 payments: { ...s.payments, [selectedDate]: paid ? quota : 0 }
             }));
             setStudents(updated);
             db.saveStudents(updated);
             setModals({ ...modals, confirm: false });
          }
      });
      setModals({ ...modals, confirm: true });
  };

  const saveExpense = () => {
      if (!tempExpense.amount || !tempExpense.desc) return;
      const category = tempExpense.isCustomCat ? tempExpense.customCat : tempExpense.cat;
      db.addExpense(parseFloat(tempExpense.amount), tempExpense.desc, category || 'General');
      refreshData();
      setModals({ ...modals, expense: false });
      setTempExpense({ desc: '', cat: 'General', amount: '', isCustomCat: false, customCat: '' });
  };

  const saveWish = () => {
      if (!tempWish.item || !tempWish.cost) return;
      db.addPlannedExpense(tempWish.item, parseFloat(tempWish.cost), tempWish.prio);
      refreshData();
      setModals({ ...modals, wishlist: false });
      setTempWish({ item: '', cost: '', prio: 'Medium' });
  };

  const saveDailyQuota = () => {
      const amount = parseFloat(tempQuota);
      if (isNaN(amount)) return;
      const newSettings = {
          ...settings,
          customQuotas: { ...settings.customQuotas, [selectedDate]: amount }
      };
      setSettings(newSettings);
      db.saveSettings(newSettings);
      setModals({ ...modals, quotaEdit: false });
  };

  const convertWishToExpense = (wish: PlannedExpense) => {
      setConfirmAction({
          title: 'Buy Item?',
          msg: `Purchase "${wish.item}" for ${settings.currencySymbol}${wish.estimatedCost}?`,
          action: () => {
              db.addExpense(wish.estimatedCost, wish.item, 'Materials');
              db.deletePlannedExpense(wish.id);
              refreshData();
              setModals({ ...modals, confirm: false });
          }
      });
      setModals({ ...modals, confirm: true });
  };

  const deleteExpense = (id: string) => {
      setConfirmAction({
          title: 'Undo Expense?',
          msg: 'Are you sure you want to delete this transaction record?',
          action: () => {
              db.deleteTransaction(id);
              refreshData();
              setModals({...modals, confirm: false});
          }
      });
      setModals({...modals, confirm: true});
  };

  // --- Renderers ---

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="pb-24">
      {/* HEADER */}
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
          <div className="px-4 py-4 flex items-center justify-between">
              <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">STEM 5 Funds</h1>
                  <p className="text-xs text-gray-500 font-medium">Class Treasurer Dashboard</p>
              </div>
              <div className="flex gap-2">
                   {role === Role.OFFICER && (
                       <button onClick={() => setModals({ ...modals, settings: true })} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-600">
                           <Cog6ToothIcon className="w-6 h-6" />
                       </button>
                   )}
              </div>
          </div>
          
          {/* TABS */}
          <div className="flex px-4 gap-6 overflow-x-auto no-scrollbar">
              <button onClick={() => setActiveTab('DAILY')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DAILY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Daily Collection
              </button>
              <button onClick={() => setActiveTab('LEDGER')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'LEDGER' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Week Ledger
              </button>
              <button onClick={() => setActiveTab('BUDGET')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'BUDGET' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Budget & Wallet
              </button>
              <button onClick={() => setActiveTab('STUDENTS')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'STUDENTS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Class Roster
              </button>
          </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-6">
          
          {/* --- DAILY TAB --- */}
          {activeTab === 'DAILY' && (
              <div className="space-y-4 animate-fade-in">
                  {/* Date Control */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                      <button onClick={() => handleDateShift(-1)} className="p-2 hover:bg-gray-50 rounded-full"><ChevronLeftIcon className="w-5 h-5 text-gray-600" /></button>
                      <div className="text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selected Date</p>
                          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 justify-center">
                              <CalendarIcon className="w-5 h-5 text-indigo-500" />
                              {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </h2>
                      </div>
                      <button onClick={() => handleDateShift(1)} className="p-2 hover:bg-gray-50 rounded-full"><ChevronRightIcon className="w-5 h-5 text-gray-600" /></button>
                  </div>

                  {/* Day Status */}
                  <div className={`rounded-2xl p-4 border transition-all ${isCollectionActive(selectedDate) ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isCollectionActive(selectedDate) ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-500'}`}>
                              {isCollectionActive(selectedDate) ? 'Active Collection' : 'No Collection'}
                          </span>
                          {role === Role.OFFICER && (
                              <button onClick={toggleCollectionDay} className="text-xs underline font-bold text-gray-500 hover:text-gray-900">
                                  {isCollectionActive(selectedDate) ? 'Disable Day' : 'Enable Collection'}
                              </button>
                          )}
                      </div>
                      
                      {isCollectionActive(selectedDate) ? (
                          <div className="flex items-end justify-between">
                              <div className="flex items-end gap-2">
                                  <div>
                                    <p className="text-xs text-indigo-600 font-medium">Daily Quota</p>
                                    <p className="text-2xl font-black text-indigo-900">{settings.currencySymbol}{getQuotaForDate(selectedDate)}</p>
                                  </div>
                                  {role === Role.OFFICER && (
                                    <button onClick={() => { setTempQuota(getQuotaForDate(selectedDate).toString()); setModals({...modals, quotaEdit: true}); }} className="mb-1 p-1 text-indigo-400 hover:text-indigo-600 bg-indigo-100 rounded">
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                  )}
                              </div>
                              <div className="text-right">
                                  <p className="text-xs text-indigo-600 font-medium">Collected Today</p>
                                  <p className="text-2xl font-black text-indigo-900">
                                      {settings.currencySymbol}{students.reduce((acc, s) => acc + (s.payments[selectedDate] || 0), 0)}
                                  </p>
                              </div>
                          </div>
                      ) : (
                          <p className="text-sm text-gray-400 italic text-center py-2">Enable collection to start tracking funds for this date.</p>
                      )}
                  </div>
                  
                  {isCollectionActive(selectedDate) && role === Role.OFFICER && (
                      <div className="flex gap-2">
                          <button onClick={() => markAll(true)} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm">Mark All Paid</button>
                          <button onClick={() => markAll(false)} className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50">Reset</button>
                      </div>
                  )}

                  {/* Student List */}
                  {['M', 'F'].map(gender => {
                      const list = students.filter(s => s.gender === gender);
                      if (list.length === 0) return null;
                      return (
                          <div key={gender} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                              <div className={`px-4 py-3 border-b border-gray-100 font-black text-xs uppercase tracking-wider flex items-center gap-2 ${gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                  {gender === 'M' ? 'Boys' : 'Girls'} <span className="opacity-50">({list.length})</span>
                              </div>
                              <div className="divide-y divide-gray-50">
                                  {list.map(s => {
                                      const paid = s.payments[selectedDate] || 0;
                                      const quota = getQuotaForDate(selectedDate);
                                      const isPaid = paid >= quota && quota > 0;
                                      const active = isCollectionActive(selectedDate);
                                      
                                      return (
                                          <div key={s.id} className={`px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${!active ? 'opacity-50 grayscale' : ''}`}>
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                                      {s.name.charAt(0)}
                                                  </div>
                                                  <span className="text-sm font-bold text-gray-800">{s.name}</span>
                                              </div>
                                              
                                              {active ? (
                                                  <div className="flex items-center gap-2">
                                                      <button 
                                                        onClick={() => role === Role.OFFICER && togglePayment(s.id)}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all border shadow-sm ${isPaid ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                                      >
                                                          {isPaid ? 'PAID' : 'UNPAID'}
                                                      </button>
                                                      {role === Role.OFFICER && (
                                                          <button onClick={() => { setTempPayment({ id: s.id, amount: paid.toString() }); setModals({ ...modals, payment: true }); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                                              <PencilSquareIcon className="w-4 h-4" />
                                                          </button>
                                                      )}
                                                  </div>
                                              ) : (
                                                  <span className="text-xs text-gray-300 font-bold">--</span>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}

          {/* --- LEDGER TAB --- */}
          {activeTab === 'LEDGER' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <TableCellsIcon className="w-5 h-5 text-gray-500" /> Weekly Ledger
                      </h3>
                      <div className="text-xs text-gray-400 font-medium">Scroll to view M-F</div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-100 text-gray-500 font-bold text-xs uppercase">
                              <tr>
                                  <th className="px-4 py-3 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">Name</th>
                                  {/* Generate Mon-Fri Headers based on selected date's week */}
                                  {Array.from({length: 5}).map((_, i) => {
                                      const d = new Date(selectedDate);
                                      const day = d.getDay() || 7; // Adjust Sunday
                                      if (day !== i + 1) d.setDate(d.getDate() - (day - (i + 1))); 
                                      const dateStr = d.toISOString().split('T')[0];
                                      return (
                                          <th key={i} className={`px-2 py-3 text-center border-r border-gray-200 min-w-[50px] ${dateStr === selectedDate ? 'bg-indigo-100 text-indigo-700' : ''}`}>
                                              <div className="flex flex-col">
                                                  <span>{['M', 'T', 'W', 'Th', 'F'][i]}</span>
                                                  <span className="text-[9px] font-normal">{d.getDate()}</span>
                                              </div>
                                          </th>
                                      );
                                  })}
                                  <th className="px-4 py-3 text-right">Total</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {students.map((s, idx) => (
                                  <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                      <td className="px-4 py-2 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-inherit border-r border-gray-200 z-10 text-xs">
                                          {s.name}
                                      </td>
                                      {Array.from({length: 5}).map((_, i) => {
                                          const d = new Date(selectedDate);
                                          const day = d.getDay() || 7;
                                          if (day !== i + 1) d.setDate(d.getDate() - (day - (i + 1)));
                                          const dateStr = d.toISOString().split('T')[0];
                                          const paid = s.payments[dateStr] || 0;
                                          return (
                                              <td key={i} className={`px-2 py-2 text-center border-r border-gray-100 ${paid > 0 ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-300'}`}>
                                                  {paid > 0 ? paid : '-'}
                                              </td>
                                          );
                                      })}
                                      <td className="px-4 py-2 text-right font-bold text-gray-900">
                                           {/* Weekly Sum Mockup */}
                                           {settings.currencySymbol}
                                           {Array.from({length: 5}).reduce((acc, _, i) => {
                                              const d = new Date(selectedDate);
                                              const day = d.getDay() || 7;
                                              if (day !== i + 1) d.setDate(d.getDate() - (day - (i + 1)));
                                              return acc + (s.payments[d.toISOString().split('T')[0]] || 0);
                                           }, 0)}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* --- BUDGET TAB --- */}
          {activeTab === 'BUDGET' && (
              <div className="space-y-6 animate-fade-in">
                  
                  {/* Balance Card */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-10"><WalletIcon className="w-32 h-32" /></div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Current Balance</p>
                      <h2 className="text-4xl font-black mb-6">{settings.currencySymbol}{financials.currentBalance.toFixed(2)}</h2>
                      <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                          <div>
                              <p className="text-gray-400 text-[10px] uppercase">Total Income</p>
                              <p className="text-lg font-bold text-green-400">+{settings.currencySymbol}{financials.totalIncome}</p>
                          </div>
                          <div>
                              <p className="text-gray-400 text-[10px] uppercase">Total Spent</p>
                              <p className="text-lg font-bold text-red-400">-{settings.currencySymbol}{financials.totalExpenses}</p>
                          </div>
                      </div>
                  </div>

                  {/* Debtor List */}
                  {financials.totalDebt > 0 && (
                      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                          <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
                              <h3 className="font-bold text-orange-900 flex items-center gap-2"><ExclamationCircleIcon className="w-5 h-5" /> Unpaid Dues</h3>
                              <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-lg">{settings.currencySymbol}{financials.totalDebt} Total</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {financials.debtors.map(s => (
                                  <div key={s.id} className="p-4 flex justify-between items-center border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                                      <span className="text-sm font-bold text-orange-600">-{settings.currencySymbol}{s.debt}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Expense Chart */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-4">Spending Breakdown</h3>
                      <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={financials.pieData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                      {financials.pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                  </Pie>
                                  <Legend />
                                  <RechartsTooltip />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Wishlist */}
                  <div className="space-y-3">
                      <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 text-lg">Wishlist & Plans</h3>
                          {role === Role.OFFICER && (
                              <button onClick={() => setModals({...modals, wishlist: true})} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold shadow hover:bg-indigo-700">Add Item</button>
                          )}
                      </div>
                      {plannedExpenses.map(p => (
                          <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-gray-800">{p.item}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${p.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{p.priority}</span>
                                  </div>
                                  <p className="text-xs text-gray-500">Est. {settings.currencySymbol}{p.estimatedCost}</p>
                              </div>
                              {role === Role.OFFICER && (
                                  <div className="flex gap-2">
                                      <button onClick={() => convertWishToExpense(p)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><CheckIcon className="w-4 h-4" /></button>
                                      <button onClick={() => { db.deletePlannedExpense(p.id); refreshData(); }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><TrashIcon className="w-4 h-4" /></button>
                                  </div>
                              )}
                          </div>
                      ))}
                      {plannedExpenses.length === 0 && <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 text-sm">No planned expenses yet.</div>}
                  </div>

                  {/* Transactions List */}
                  <div className="space-y-3">
                      <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 text-lg">History</h3>
                          {role === Role.OFFICER && (
                              <button onClick={() => setModals({...modals, expense: true})} className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold shadow hover:bg-gray-800">Record Expense</button>
                          )}
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          {[...expenses].reverse().map(tx => (
                              <div key={tx.id} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center hover:bg-gray-50 group">
                                  <div>
                                      <p className="font-bold text-gray-800 text-sm">{tx.description}</p>
                                      <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()} • {tx.category}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <p className="font-mono font-bold text-red-500">-{settings.currencySymbol}{tx.amount}</p>
                                    {role === Role.OFFICER && (
                                        <button onClick={() => deleteExpense(tx.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                  </div>
                              </div>
                          ))}
                          {expenses.length === 0 && <div className="p-6 text-center text-gray-400 text-sm">No transactions yet.</div>}
                      </div>
                  </div>
              </div>
          )}

          {/* --- STUDENTS TAB --- */}
          {activeTab === 'STUDENTS' && (
              <div className="space-y-4 animate-fade-in">
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div>
                          <h3 className="font-bold text-indigo-900 text-lg">Class Roster</h3>
                          <p className="text-indigo-600 text-sm">Manage student list ({students.length} students)</p>
                      </div>
                      {role === Role.OFFICER && (
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => { const n = prompt("Name:"); if(n) { db.addStudent(n); refreshData(); } }} className="flex-1 px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-xl shadow-sm hover:bg-indigo-50">Add Single</button>
                            <button onClick={() => setModals({...modals, import: true})} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow hover:bg-indigo-700">Import</button>
                        </div>
                      )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {students.map(s => (
                          <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group">
                              <div className="flex items-center gap-3">
                                  <span className={`w-2 h-8 rounded-full ${s.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                                  <span className="font-bold text-gray-700">{s.name}</span>
                              </div>
                              {role === Role.OFFICER && (
                                  <button onClick={() => { if(confirm('Remove student?')) { db.deleteStudent(s.id); refreshData(); } }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                      <TrashIcon className="w-5 h-5" />
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Settings */}
      <Modal isOpen={modals.settings} onClose={() => setModals({...modals, settings: false})} title="Funds Settings">
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency Symbol</label>
                  <input className="w-full border rounded-xl p-3" value={settings.currencySymbol} onChange={e => { db.saveSettings({...settings, currencySymbol: e.target.value}); refreshData(); }} />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Default Daily Quota</label>
                  <input type="number" className="w-full border rounded-xl p-3" value={settings.dailyQuota} onChange={e => { db.saveSettings({...settings, dailyQuota: parseFloat(e.target.value)}); refreshData(); }} />
              </div>
          </div>
      </Modal>

      {/* Payment */}
      <Modal isOpen={modals.payment} onClose={() => setModals({...modals, payment: false})} title="Custom Payment">
           <div className="space-y-4">
               <div className="flex flex-wrap gap-2">
                   {QUICK_AMOUNTS.map(amt => (
                       <button key={amt} onClick={() => setTempPayment({...tempPayment, amount: amt.toString()})} className="px-3 py-1 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 rounded-lg text-xs font-bold transition-colors">
                           {settings.currencySymbol}{amt}
                       </button>
                   ))}
               </div>
               <input autoFocus type="number" className="w-full border rounded-xl p-3 text-lg font-bold" value={tempPayment.amount} onChange={e => setTempPayment({...tempPayment, amount: e.target.value})} placeholder="Amount" />
               <button onClick={() => { updateStudentPayment(tempPayment.id, parseFloat(tempPayment.amount)); setModals({...modals, payment: false}); }} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">Save Payment</button>
           </div>
      </Modal>

      {/* Expense */}
      <Modal isOpen={modals.expense} onClose={() => setModals({...modals, expense: false})} title="Record Expense">
          <div className="space-y-4">
               <input className="w-full border rounded-xl p-3" value={tempExpense.desc} onChange={e => setTempExpense({...tempExpense, desc: e.target.value})} placeholder="Description" />
               <div className="grid grid-cols-2 gap-3">
                   <select className="border rounded-xl p-3" value={tempExpense.isCustomCat ? 'Custom' : tempExpense.cat} onChange={e => e.target.value === 'Custom' ? setTempExpense({...tempExpense, isCustomCat: true}) : setTempExpense({...tempExpense, cat: e.target.value, isCustomCat: false})}>
                       {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                       <option value="Custom">+ Custom Category</option>
                   </select>
                   <input type="number" className="border rounded-xl p-3" value={tempExpense.amount} onChange={e => setTempExpense({...tempExpense, amount: e.target.value})} placeholder="0.00" />
               </div>
               {tempExpense.isCustomCat && (
                   <input className="w-full border rounded-xl p-3" value={tempExpense.customCat} onChange={e => setTempExpense({...tempExpense, customCat: e.target.value})} placeholder="Enter Custom Category Name" autoFocus />
               )}
               <button onClick={saveExpense} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800">Save Record</button>
          </div>
      </Modal>

      {/* Quota Edit */}
      <Modal isOpen={modals.quotaEdit} onClose={() => setModals({...modals, quotaEdit: false})} title="Edit Daily Quota">
          <div className="space-y-4">
              <p className="text-sm text-gray-500">Change quota for <span className="font-bold text-gray-900">{new Date(selectedDate).toLocaleDateString()}</span> only.</p>
              <input type="number" autoFocus className="w-full border rounded-xl p-3 text-lg font-bold" value={tempQuota} onChange={e => setTempQuota(e.target.value)} />
              <button onClick={saveDailyQuota} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">Save Quota</button>
          </div>
      </Modal>

      {/* Wishlist */}
      <Modal isOpen={modals.wishlist} onClose={() => setModals({...modals, wishlist: false})} title="Add Planned Item">
          <div className="space-y-4">
               <input className="w-full border rounded-xl p-3" value={tempWish.item} onChange={e => setTempWish({...tempWish, item: e.target.value})} placeholder="Item Name" />
               <div className="grid grid-cols-2 gap-3">
                   <select className="border rounded-xl p-3" value={tempWish.prio} onChange={e => setTempWish({...tempWish, prio: e.target.value as any})}>
                       <option>High</option><option>Medium</option><option>Low</option>
                   </select>
                   <input type="number" className="border rounded-xl p-3" value={tempWish.cost} onChange={e => setTempWish({...tempWish, cost: e.target.value})} placeholder="Est. Cost" />
               </div>
               <button onClick={saveWish} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">Add to List</button>
          </div>
      </Modal>

      {/* Import */}
      <Modal isOpen={modals.import} onClose={() => setModals({...modals, import: false})} title="Bulk Import">
          <p className="text-sm text-gray-500 mb-4">Upload a .txt file. Format: One name per line. Optional: Start with "F " for Female.</p>
          <input type="file" accept=".txt" ref={importFileRef} onChange={e => {
              if(e.target.files?.[0]) {
                  const r = new FileReader();
                  r.onload = (ev) => { db.importStudentsFromText(ev.target?.result as string); refreshData(); setModals({...modals, import: false}); };
                  r.readAsText(e.target.files[0]);
              }
          }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
      </Modal>

      {/* Confirm */}
      <ConfirmModal 
        isOpen={modals.confirm} 
        onCancel={() => setModals({...modals, confirm: false})} 
        onConfirm={confirmAction?.action || (() => {})} 
        title={confirmAction?.title || ''} 
        message={confirmAction?.msg || ''} 
      />

    </div>
  );
};

export default ClassFunds;
