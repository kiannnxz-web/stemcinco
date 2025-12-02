
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClassFunds from './components/ClassFunds';
import Agenda from './components/Agenda';
import Login from './components/Login';
import { Role, Tab, Announcement, AgendaItem, User } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setTab] = useState<Tab>(Tab.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
        const currentUser = db.getCurrentUser();
        setUser(currentUser);
        setAnnouncements(db.getAnnouncements());
        setAgenda(db.getAgenda());
        setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => { if (!isLoading) db.saveAnnouncements(announcements); }, [announcements, isLoading]);
  useEffect(() => { if (!isLoading) db.saveAgenda(agenda); }, [agenda, isLoading]);

  const handleLogin = (loggedInUser: User) => setUser(loggedInUser);

  const handleAddAnnouncement = (newAnnouncement: Omit<Announcement, 'id' | 'date' | 'author'>) => {
    const item: Announcement = {
      ...newAnnouncement,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      author: user?.role === Role.OFFICER ? 'Officer' : user?.username || 'Student'
    };
    setAnnouncements([item, ...announcements]);
  };

  const handleDeleteAnnouncement = (id: string) => setAnnouncements(announcements.filter(a => a.id !== id));
  
  const handleAddAgenda = (newItem: Omit<AgendaItem, 'id'>) => setAgenda([...agenda, { ...newItem, id: Date.now().toString() }]);
  const handleDeleteAgenda = (id: string) => setAgenda(agenda.filter(a => a.id !== id));

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading HQ...</div>;
  if (!user) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    switch (currentTab) {
      case Tab.DASHBOARD: return <Dashboard role={user.role} announcements={announcements} agenda={agenda} onAddAnnouncement={handleAddAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} />;
      case Tab.FUNDS: return <ClassFunds role={user.role} />;
      case Tab.AGENDA: return <Agenda role={user.role} agenda={agenda} onAddAgenda={handleAddAgenda} onDeleteAgenda={handleDeleteAgenda} />;
      default: return null;
    }
  };

  return <Layout currentTab={currentTab} setTab={setTab} role={user.role} setRole={(r) => setUser({...user, role: r})}>{renderContent()}</Layout>;
};

export default App;
