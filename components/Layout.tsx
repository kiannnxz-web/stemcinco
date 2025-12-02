
import React from 'react';
import { Role, Tab } from '../types';
import { HomeIcon, CurrencyDollarIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: Tab;
  setTab: (tab: Tab) => void;
  role: Role;
  setRole: (role: Role) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentTab, setTab, role, setRole }) => {
  const navItems = [
    { id: Tab.DASHBOARD, label: 'Dashboard', icon: HomeIcon },
    { id: Tab.FUNDS, label: 'Funds', icon: CurrencyDollarIcon },
    { id: Tab.AGENDA, label: 'Agenda', icon: CalendarIcon },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 z-30 flex-none h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center text-white font-bold shadow-lg">HQ</div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">Classroom HQ</h1>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {[Role.OFFICER, Role.STUDENT].map((r) => (
             <button key={r} onClick={() => setRole(r)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${role === r ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                 {r}
             </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24 sm:pb-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
            {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 pb-safe z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${currentTab === item.id ? 'text-black' : 'text-gray-400'}`}>
              <item.icon className={`w-6 h-6 ${currentTab === item.id ? 'stroke-2' : 'stroke-1.5'}`} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden sm:flex fixed left-0 top-16 bottom-0 w-20 flex-col items-center py-8 bg-white border-r border-gray-200 z-20">
        <div className="flex-1 w-full flex flex-col items-center gap-6">
            {navItems.map((item) => (
                <button key={item.id} onClick={() => setTab(item.id)} className={`p-3 rounded-2xl transition-all group relative flex items-center justify-center ${currentTab === item.id ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}>
                    <item.icon className="w-6 h-6" />
                    <span className="absolute left-16 bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">{item.label}</span>
                </button>
            ))}
        </div>
        <div className="mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                <UserIcon className="w-5 h-5" />
            </div>
        </div>
      </nav>
      <div className="hidden sm:block fixed inset-y-0 left-0 w-20 bg-transparent pointer-events-none" />
    </div>
  );
};

export default Layout;
