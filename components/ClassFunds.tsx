
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Role, Student, Transaction, AppSettings, PlannedExpense } from '../types';
import { db } from '../services/db';
import { parseRosterFromImage } from '../services/geminiService';
import { 
  BanknotesIcon, ChartPieIcon, TrashIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon,
  PlusIcon, Cog6ToothIcon, UserGroupIcon, ExclamationCircleIcon,
  CheckIcon, XMarkIcon, PencilSquareIcon, WalletIcon, ArrowTrendingDownIcon,
  ArchiveBoxIcon, EllipsisHorizontalIcon, FunnelIcon, TableCellsIcon, ClipboardDocumentListIcon,
  BoltIcon, AdjustmentsHorizontalIcon, PhotoIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ClassFundsProps {
  role: Role;
}

type TabMode = 'DAILY' | 'BUDGET' | 'STUDENTS' | 'LEDGER';

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];
const EXPENSE_CATEGORIES = ['General', 'Materials', 'Events', 'Food', 'Utilities', 'Transport', 'Printing'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Date Helpers (Local Time) ---
const toLocalISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getWeekDays = (baseDateStr: string) => {
    const [y, m, d] = baseDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay(); // 0 is Sunday
    // Adjust to Monday: If Sun(0) -> -6, else -> 1 - day
    const diff = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(y, m - 1, d + diff);
    
    const week = [];
    for (let i = 0; i < 5; i++) {
        const temp = new Date(monday);
        temp.setDate(monday.getDate() + i);
        week.push(toLocalISO(temp));
    }
    return week;
};

// --- Sub-Components ---

// Ledger Cell: Manages its own edit state to prevent re-render glitches
interface LedgerCellProps {
    value: number;
    quota: number;
    isActive: boolean;
    isOfficer: boolean;
    quickPayMode: boolean;
    onChange: (val: number) => void;
}

const LedgerCell = React.memo(({ value, quota, isActive, isOfficer, quickPayMode, onChange }: LedgerCellProps) => {
    const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString());
    const [isEditing, setIsEditing] = useState(false);

    // Sync external changes only when not editing
    useEffect(() => {
        if (!isEditing) {
            setLocalValue(value === 0 ? '' : value.toString());
        }
    }, [value, isEditing]);

    const commit = () => {
        setIsEditing(false);
        const num = parseFloat(localValue);
        const final = isNaN(num) ? 0 : num;
        if (final !== value) {
            onChange(final);
        } else {
            // Revert format if no change
             setLocalValue(value === 0 ? '' : value.toString());
        }
    };

    if (!isActive) return <div className="h-10 w-full flex items-center justify-center text-gray-200 text-xs select-none bg-gray-50/30 border-r border-b border-gray-100">-</div>;
    
    // Quick Pay Mode (Officer Only)
    if (isOfficer && quickPayMode) {
        return (
             <div 
                onClick={() => onChange(value >= quota ? 0 : quota)}
                className={`h-10 w-full flex items-center justify-center text-xs font-bold border-r border-b border-gray-100 cursor-pointer select-none transition-all active:scale-95
                    ${value > 0 ? 'bg-indigo-50/50 text-indigo-600' : 'hover:bg-indigo-50 text-gray-300'}
                `}
                title="Click to Toggle Payment"
            >
               {value > 0 ? value : (
                   <span className="opacity-0 hover:opacity-100 text-[10px] text-indigo-300 font-medium scale-75 transform transition-all">
                       {quota}
                   </span>
               )}
            </div>
        );
    }
    
    if (!isOfficer) return <div className={`h-10 w-full flex items-center justify-center text-xs font-bold border-r border-b border-gray-100 ${value > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>{value || '-'}</div>;

    // Determines the text color class:
    // If editing: always pure black and bold
    // If not editing: Blue if value exists, gray if empty.
    const textColorClass = isEditing 
        ? 'text-black font-black' 
        : (localValue ? 'text-indigo-900 font-bold' : 'text-gray-400 font-normal');

    return (
        <input 
            className={`w-full h-10 text-center text-xs bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:z-20 outline-none border-b border-r border-gray-200 p-0 m-0 transition-all ${textColorClass} ${isEditing ? 'bg-white z-20 shadow-sm' : ''}`}
            value={localValue}
            onFocus={() => setIsEditing(true)}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="-"
            type="number"
        />
    );
});

// Modal Component
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

// Confirmation Modal
const ConfirmModal: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string; message: string }> = ({ isOpen, onConfirm, onCancel, title, message }) => {
    if(!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title}>
            <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><ExclamationCircleIcon className="w-6 h-6" /></div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 text-black">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md">Confirm</button>
                </div>
            </div>
        </Modal>
    );
};

// --- Main Component ---
const ClassFunds: React.FC<ClassFundsProps> = ({ role }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('LEDGER');
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ dailyQuota: 5, currencySymbol: '₱', customQuotas: {}, collectionDays: {} });
  const [loading, setLoading] = useState(true);
  
  // States
  const [selectedDate, setSelectedDate] = useState<string>(toLocalISO(new Date()));
  const [quickPayMode, setQuickPayMode] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
  // Modals
  const [modals, setModals] = useState({
      settings: false,
      expense: false,
      wishlist: false,
      payment: false,
      import: false,
      confirm: false,
      quotaEdit: false,
  });
  
  // Temp State
  const [tempPayment, setTempPayment] = useState<{ id: string, amount: string }>({ id: '', amount: '' });
  const [tempExpense, setTempExpense] = useState({ desc: '', cat: 'General', amount: '', isCustomCat: false, customCat: '' });
  const [tempWish, setTempWish] = useState({ item: '', cost: '', prio: 'Medium' as PlannedExpense['priority'] });
  const [tempQuota, setTempQuota] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ action: () => void, title: string, msg: string } | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);
  const importImageRef = useRef<HTMLInputElement>(null);

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
  
  const financials = useMemo(() => {
    let totalIncome = 0;
    
    // Calculate total collected
    students.forEach(s => {
        Object.values(s.payments).forEach((amount: number) => totalIncome += amount);
    });

    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const currentBalance = totalIncome - totalExpenses;
    
    // Debt Calculation (Only for past/today active days)
    const today = toLocalISO(new Date());
    const activeDates = Object.keys(settings.collectionDays).filter(d => settings.collectionDays[d] === true && d <= today);
    
    const debtors = students.map(s => {
        let paid = 0;
        let owe = 0;
        
        activeDates.forEach(date => {
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
  }, [students, expenses, plannedExpenses, settings]);


  // --- Actions ---

  const handleDateShift = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    setSelectedDate(toLocalISO(date));
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
      if (!isCollectionActive(selectedDate)) return;
      const s = students.find(st => st.id === studentId);
      if(!s) return;

      const quota = getQuotaForDate(selectedDate);
      const current = s.payments[selectedDate] || 0;
      const newAmt = current >= quota ? 0 : quota;

      updateStudentPayment(studentId, newAmt, selectedDate);
  };

  const updateStudentPayment = useCallback((id: string, amount: number, date: string) => {
      setStudents(prev => {
          const updated = prev.map(s => {
              if (s.id !== id) return s;
              return { ...s, payments: { ...s.payments, [date]: amount } };
          });
          db.saveStudents(updated);
          return updated;
      });
  }, []);

  const markAll = (paid: boolean) => {
      if (!isCollectionActive(selectedDate)) return;
      setConfirmAction({
          title: paid ? 'Mark All Paid?' : 'Reset All?',
          msg: `This will set everyone's payment for ${new Date(selectedDate).toLocaleDateString()} to ${paid ? 'Paid' : 'Unpaid'}.`,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsAnalyzingImage(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              const base64String = (reader.result as string).split(',')[1];
              const extractedStudents = await parseRosterFromImage(base64String);
              
              if (extractedStudents && extractedStudents.length > 0) {
                  const currentStudents = db.getStudents();
                  const newStudents = extractedStudents.map(s => ({
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                      name: s.name,
                      gender: s.gender,
                      payments: {}
                  }));
                  db.saveStudents([...currentStudents, ...newStudents]);
                  refreshData();
                  setModals({...modals, import: false});
                  alert(`Successfully imported ${newStudents.length} students from the image!`);
              } else {
                  alert("Could not detect any names in the image. Please try a clearer image.");
              }
              setIsAnalyzingImage(false);
          };
      } catch (error) {
          console.error(error);
          alert("Error processing image.");
          setIsAnalyzingImage(false);
      }
  };

  // --- Renderers ---

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const weekDays = getWeekDays(selectedDate);
  const isSelectedDateActive = isCollectionActive(selectedDate);
  const currentQuota = getQuotaForDate(selectedDate);

  return (
    <div className="pb-24">
      {/* HEADER */}
      <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
          <div className="px-4 py-4 flex items-center justify-between">
              <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">STEM 5 Funds</h1>
                  <p className="text-xs text-gray-500 font-medium">Class Treasurer Dashboard</p>
              </div>
              <div className="flex gap-2">
                   {role === Role.OFFICER && (
                       <button onClick={() => setModals({ ...modals, settings: true })} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                           <Cog6ToothIcon className="w-6 h-6" />
                       </button>
                   )}
              </div>
          </div>
          
          {/* TABS */}
          <div className="flex px-4 gap-6 overflow-x-auto no-scrollbar">
              <button onClick={() => setActiveTab('LEDGER')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'LEDGER' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Week Ledger
              </button>
              <button onClick={() => setActiveTab('DAILY')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DAILY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Daily View
              </button>
              <button onClick={() => setActiveTab('BUDGET')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'BUDGET' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Budget & Wallet
              </button>
              <button onClick={() => setActiveTab('STUDENTS')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'STUDENTS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>
                  Students
              </button>
          </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-6">

           {/* --- CONTROLS for Daily & Ledger --- */}
           {(activeTab === 'DAILY' || activeTab === 'LEDGER') && (
               <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between animate-fade-in">
                  <button onClick={() => handleDateShift(activeTab === 'LEDGER' ? -7 : -1)} className="p-2 hover:bg-gray-50 rounded-full"><ChevronLeftIcon className="w-5 h-5 text-gray-600" /></button>
                  <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeTab === 'LEDGER' ? 'Week of' : 'Viewing'}</p>
                      <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 justify-center">
                          <CalendarIcon className="w-5 h-5 text-indigo-500" />
                          {activeTab === 'LEDGER' 
                             ? `${new Date(weekDays[0]).toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${new Date(weekDays[4]).toLocaleDateString(undefined, {month:'short', day:'numeric'})}` 
                             : new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                          }
                      </h2>
                  </div>
                  <button onClick={() => handleDateShift(activeTab === 'LEDGER' ? 7 : 1)} className="p-2 hover:bg-gray-50 rounded-full"><ChevronRightIcon className="w-5 h-5 text-gray-600" /></button>
              </div>
           )}

          
          {/* --- DAILY TAB --- */}
          {activeTab === 'DAILY' && (
              <div className="space-y-4 animate-fade-in">
                  {/* Day Status */}
                  <div className={`rounded-2xl p-4 border transition-all ${isCollectionActive(selectedDate) ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isCollectionActive(selectedDate) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                              {isCollectionActive(selectedDate) ? 'Collection Active' : 'No Collection'}
                          </span>
                          {role === Role.OFFICER && (
                              <button onClick={toggleCollectionDay} className="text-xs underline font-bold text-gray-500 hover:text-gray-900">
                                  {isCollectionActive(selectedDate) ? 'Disable' : 'Enable'}
                              </button>
                          )}
                      </div>
                      
                      {isCollectionActive(selectedDate) ? (
                          <div className="flex items-end justify-between">
                              <div className="flex items-end gap-2">
                                  <div>
                                    <p className="text-xs text-emerald-600 font-medium">Daily Quota</p>
                                    <p className="text-2xl font-black text-emerald-900">{settings.currencySymbol}{getQuotaForDate(selectedDate)}</p>
                                  </div>
                                  {role === Role.OFFICER && (
                                    <button onClick={() => { setTempQuota(getQuotaForDate(selectedDate).toString()); setModals({...modals, quotaEdit: true}); }} className="mb-1 p-1 text-emerald-600 hover:text-emerald-800 bg-emerald-100 rounded">
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                  )}
                              </div>
                              <div className="text-right">
                                  <p className="text-xs text-emerald-600 font-medium">Collected</p>
                                  <p className="text-2xl font-black text-emerald-900">
                                      {settings.currencySymbol}{students.reduce((acc, s) => acc + (s.payments[selectedDate] || 0), 0)}
                                  </p>
                              </div>
                          </div>
                      ) : (
                          <p className="text-sm text-gray-400 italic text-center py-2">Enable collection to view student statuses.</p>
                      )}
                  </div>
                  
                  {isCollectionActive(selectedDate) && role === Role.OFFICER && (
                      <div className="flex gap-2">
                          <button onClick={() => markAll(true)} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-colors">Mark All Paid</button>
                          <button onClick={() => markAll(false)} className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors">Reset</button>
                      </div>
                  )}

                  {/* Student List */}
                  {isCollectionActive(selectedDate) && ['M', 'F'].map(gender => {
                      const list = students.filter(s => s.gender === gender);
                      if (list.length === 0) return null;
                      return (
                          <div key={gender} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                              <div className={`px-4 py-2 border-b border-gray-100 font-black text-[10px] uppercase tracking-wider flex items-center gap-2 ${gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                  {gender === 'M' ? 'Boys' : 'Girls'} <span className="opacity-50">({list.length})</span>
                              </div>
                              <div className="divide-y divide-gray-50">
                                  {list.map(s => {
                                      const paid = s.payments[selectedDate] || 0;
                                      const quota = getQuotaForDate(selectedDate);
                                      const isPaid = paid >= quota;
                                      
                                      return (
                                          <div key={s.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm ${gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                                      {s.name.charAt(0)}
                                                  </div>
                                                  <span className="text-sm font-bold text-gray-800 line-clamp-1">{s.name}</span>
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                  <button 
                                                    onClick={() => role === Role.OFFICER && togglePayment(s.id)}
                                                    className={`w-20 py-1 rounded text-[10px] font-black transition-all border shadow-sm ${isPaid ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                                  >
                                                      {isPaid ? 'PAID' : 'UNPAID'}
                                                  </button>
                                                  {role === Role.OFFICER && (
                                                      <button onClick={() => { setTempPayment({ id: s.id, amount: paid.toString() }); setModals({ ...modals, payment: true }); }} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                                          <PencilSquareIcon className="w-4 h-4" />
                                                      </button>
                                                  )}
                                              </div>
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
              <div className="animate-fade-in space-y-4">
                  {/* Day Inspector & Controls */}
                   <div className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-4 transition-all ${isSelectedDateActive ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${isSelectedDateActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                 <CalendarIcon className="w-5 h-5" />
                             </div>
                             <div>
                                 <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Selected Day</p>
                                 <p className="font-bold text-gray-900 text-sm">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                             </div>
                        </div>

                        {role === Role.OFFICER && (
                            <div className="flex flex-wrap items-center gap-2">
                                 <button onClick={toggleCollectionDay} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isSelectedDateActive ? 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                     {isSelectedDateActive ? 'Disable Collection' : 'Enable Collection'}
                                 </button>
                                 
                                 {isSelectedDateActive && (
                                     <>
                                         <div className="h-6 w-px bg-gray-300/50 mx-1 hidden sm:block"></div>
                                         <button 
                                            onClick={() => { setTempQuota(currentQuota.toString()); setModals({...modals, quotaEdit: true}); }}
                                            className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 text-xs text-emerald-700 font-bold transition-colors"
                                         >
                                             Quota: {settings.currencySymbol}{currentQuota}
                                             <PencilSquareIcon className="w-3.5 h-3.5 opacity-50" />
                                         </button>
                                         <button onClick={() => markAll(true)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm ml-auto sm:ml-0">
                                             Mark All Paid
                                         </button>
                                          <button onClick={() => markAll(false)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 shadow-sm">
                                             Reset
                                         </button>
                                     </>
                                 )}
                            </div>
                        )}
                        {!isSelectedDateActive && <span className="text-xs text-gray-400 italic hidden sm:block">Select a day below to manage collection.</span>}
                   </div>
              
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
                      {role === Role.OFFICER && (
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-end">
                               <button 
                                    onClick={() => setQuickPayMode(!quickPayMode)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                                        quickPayMode 
                                        ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 ring-offset-1' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                    title="Toggle click-to-pay mode"
                                >
                                    <BoltIcon className={`w-3.5 h-3.5 ${quickPayMode ? 'text-yellow-300 fill-yellow-300' : ''}`} />
                                    {quickPayMode ? 'Quick Pay ON' : 'Quick Pay'}
                                </button>
                          </div>
                      )}
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                              <thead>
                                  <tr>
                                      <th className="px-3 py-3 sticky left-0 bg-gray-50 z-20 border-b border-r border-gray-200 text-gray-500 font-bold text-[10px] uppercase min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Student Name</th>
                                      {weekDays.map((dateStr, i) => {
                                          const d = new Date(dateStr);
                                          const isSelected = dateStr === selectedDate;
                                          const active = isCollectionActive(dateStr);
                                          const isToday = dateStr === toLocalISO(new Date());

                                          // Distinct styling for Active days (Green tint header)
                                          let headerBg = 'bg-white';
                                          if (active) headerBg = 'bg-emerald-50/70'; 
                                          if (isSelected) headerBg = 'bg-indigo-100'; // Selection overrides

                                          let borderColor = 'border-gray-200';
                                          if (isSelected) borderColor = 'border-indigo-300';
                                          else if (active) borderColor = 'border-emerald-200';

                                          return (
                                              <th 
                                                key={i} 
                                                onClick={() => setSelectedDate(dateStr)}
                                                className={`px-1 py-2 text-center border-b border-r min-w-[50px] cursor-pointer transition-colors hover:bg-indigo-50 ${headerBg} ${borderColor} ${!active && !isSelected ? 'bg-gray-50/50' : ''}`}
                                              >
                                                  <div className="flex flex-col items-center">
                                                      <span className={`text-[9px] font-bold uppercase mb-0.5 ${isSelected ? 'text-indigo-700' : (active ? 'text-emerald-600' : 'text-gray-400')}`}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]}</span>
                                                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-all ${isToday ? 'bg-black text-white scale-110' : (isSelected ? 'bg-indigo-600 text-white shadow-md' : (active ? 'bg-emerald-200 text-emerald-800' : 'text-gray-700'))}`}>
                                                          {d.getDate()}
                                                      </div>
                                                  </div>
                                              </th>
                                          );
                                      })}
                                      <th className="px-2 py-3 text-right bg-gray-50 border-b border-gray-200 font-bold text-[10px] uppercase min-w-[60px]">Total</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {students.map((s, idx) => (
                                      <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                          <td className="px-3 py-0 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-inherit border-r border-gray-200 z-10 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] h-10 flex items-center">
                                              {s.name}
                                          </td>
                                          {weekDays.map((dateStr, i) => {
                                              const active = isCollectionActive(dateStr);
                                              const isSelected = dateStr === selectedDate;
                                              const quota = getQuotaForDate(dateStr);

                                              return (
                                                  <td key={i} className={`p-0 ${isSelected ? 'bg-indigo-50/40 ring-1 ring-inset ring-indigo-100' : ''} ${!active ? 'bg-gray-100/50' : ''}`}>
                                                      <LedgerCell 
                                                        value={s.payments[dateStr] || 0}
                                                        quota={quota}
                                                        isActive={active}
                                                        isOfficer={role === Role.OFFICER}
                                                        quickPayMode={quickPayMode}
                                                        onChange={(val) => updateStudentPayment(s.id, val, dateStr)}
                                                      />
                                                  </td>
                                              );
                                          })}
                                          <td className="px-2 py-0 text-right font-bold text-gray-900 border-l border-gray-200 bg-gray-50/50 text-xs h-10 align-middle">
                                              <div className="h-10 flex items-center justify-end">
                                                {weekDays.reduce((acc, date) => {
                                                    return acc + (s.payments[date] || 0);
                                                }, 0) || '-'}
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
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
                              <h3 className="font-bold text-orange-900 flex items-center gap-2"><ExclamationCircleIcon className="w-5 h-5" /> Unpaid Dues (Past & Today)</h3>
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
                                        <button onClick={() => deleteExpense(tx.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
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
                  <input className="w-full border rounded-xl p-3 text-black font-bold" value={settings.currencySymbol} onChange={e => { db.saveSettings({...settings, currencySymbol: e.target.value}); refreshData(); }} />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Default Daily Quota</label>
                  <input type="number" className="w-full border rounded-xl p-3 text-black font-bold" value={settings.dailyQuota} onChange={e => { db.saveSettings({...settings, dailyQuota: parseFloat(e.target.value)}); refreshData(); }} />
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
                   <button onClick={() => setTempPayment({...tempPayment, amount: getQuotaForDate(selectedDate).toString()})} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors">
                       Quota ({settings.currencySymbol}{getQuotaForDate(selectedDate)})
                   </button>
               </div>
               <input autoFocus type="number" className="w-full border rounded-xl p-3 text-lg font-black text-black" value={tempPayment.amount} onChange={e => setTempPayment({...tempPayment, amount: e.target.value})} placeholder="Amount" />
               <button onClick={() => { updateStudentPayment(tempPayment.id, parseFloat(tempPayment.amount), selectedDate); setModals({...modals, payment: false}); }} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">Save Payment</button>
           </div>
      </Modal>

      {/* Expense */}
      <Modal isOpen={modals.expense} onClose={() => setModals({...modals, expense: false})} title="Record Expense">
          <div className="space-y-4">
               <input className="w-full border rounded-xl p-3 text-black font-bold" value={tempExpense.desc} onChange={e => setTempExpense({...tempExpense, desc: e.target.value})} placeholder="Description" />
               <div className="grid grid-cols-2 gap-3">
                   <select className="border rounded-xl p-3 text-black font-bold" value={tempExpense.isCustomCat ? 'Custom' : tempExpense.cat} onChange={e => e.target.value === 'Custom' ? setTempExpense({...tempExpense, isCustomCat: true}) : setTempExpense({...tempExpense, cat: e.target.value, isCustomCat: false})}>
                       {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                       <option value="Custom">+ Custom Category</option>
                   </select>
                   <input type="number" className="border rounded-xl p-3 text-black font-bold" value={tempExpense.amount} onChange={e => setTempExpense({...tempExpense, amount: e.target.value})} placeholder="0.00" />
               </div>
               {tempExpense.isCustomCat && (
                   <input className="w-full border rounded-xl p-3 text-black font-bold" value={tempExpense.customCat} onChange={e => setTempExpense({...tempExpense, customCat: e.target.value})} placeholder="Enter Custom Category Name" autoFocus />
               )}
               <button onClick={saveExpense} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800">Save Record</button>
          </div>
      </Modal>

      {/* Quota Edit */}
      <Modal isOpen={modals.quotaEdit} onClose={() => setModals({...modals, quotaEdit: false})} title="Edit Daily Quota">
          <div className="space-y-4">
              <p className="text-sm text-gray-500">Change quota for <span className="font-bold text-gray-900">{new Date(selectedDate).toLocaleDateString()}</span> only.</p>
              <input type="number" autoFocus className="w-full border rounded-xl p-3 text-lg font-black text-black" value={tempQuota} onChange={e => setTempQuota(e.target.value)} />
              <button onClick={saveDailyQuota} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">Save Quota</button>
          </div>
      </Modal>

      {/* Wishlist */}
      <Modal isOpen={modals.wishlist} onClose={() => setModals({...modals, wishlist: false})} title="Add Planned Item">
          <div className="space-y-4">
               <input className="w-full border rounded-xl p-3 text-black font-bold" value={tempWish.item} onChange={e => setTempWish({...tempWish, item: e.target.value})} placeholder="Item Name" />
               <div className="grid grid-cols-2 gap-3">
                   <select className="border rounded-xl p-3 text-black font-bold" value={tempWish.prio} onChange={e => setTempWish({...tempWish, prio: e.target.value as any})}>
                       <option>High</option><option>Medium</option><option>Low</option>
                   </select>
                   <input type="number" className="border rounded-xl p-3 text-black font-bold" value={tempWish.cost} onChange={e => setTempWish({...tempWish, cost: e.target.value})} placeholder="Est. Cost" />
               </div>
               <button onClick={saveWish} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">Add to List</button>
          </div>
      </Modal>

      {/* Import */}
      <Modal isOpen={modals.import} onClose={() => setModals({...modals, import: false})} title="Bulk Import">
          <div className="space-y-6">
              {/* Option 1: AI Scan */}
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${isAnalyzingImage ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-200 hover:border-indigo-300 hover:bg-white'}`}>
                  {isAnalyzingImage ? (
                      <div className="flex flex-col items-center justify-center py-4">
                          <ArrowPathIcon className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                          <p className="text-indigo-900 font-bold">Analyzing image with Gemini AI...</p>
                          <p className="text-xs text-indigo-500">Detecting names & gender...</p>
                      </div>
                  ) : (
                      <>
                        <input type="file" accept="image/*" ref={importImageRef} onChange={handleImageUpload} className="hidden" />
                        <div onClick={() => importImageRef.current?.click()} className="cursor-pointer flex flex-col items-center">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                                <PhotoIcon className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-1">Scan Class List</h4>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                Take a photo or upload an image of your physical ledger. AI will extract student names automatically.
                            </p>
                        </div>
                      </>
                  )}
              </div>

              <div className="flex items-center gap-4">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase">OR</span>
                  <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              {/* Option 2: Text File */}
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">Import from Text File (.txt)</p>
                <input type="file" accept=".txt" ref={importFileRef} onChange={e => {
                    if(e.target.files?.[0]) {
                        const r = new FileReader();
                        r.onload = (ev) => { db.importStudentsFromText(ev.target?.result as string); refreshData(); setModals({...modals, import: false}); };
                        r.readAsText(e.target.files[0]);
                    }
                }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                <p className="text-[10px] text-gray-400 mt-2">Format: One name per line. Start with "F " for Female.</p>
              </div>
          </div>
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
