
import React, { useState } from 'react';
import { Role, Announcement, AgendaItem } from '../types';
import { MegaphoneIcon, TrashIcon, CalendarDaysIcon, UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface DashboardProps {
  role: Role;
  announcements: Announcement[];
  agenda: AgendaItem[];
  onAddAnnouncement: (a: Omit<Announcement, 'id' | 'date' | 'author'>) => void;
  onDeleteAnnouncement: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ role, announcements, agenda, onAddAnnouncement, onDeleteAnnouncement }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAnnouncement({ title: newTitle, content: newContent, isImportant });
    setNewTitle(''); setNewContent(''); setIsImportant(false); setIsFormOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Classroom Dashboard</h1>
                <p className="text-gray-500 text-sm">Updates & Agenda</p>
            </div>
            {role === Role.OFFICER && (
                <button onClick={() => setIsFormOpen(!isFormOpen)} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">
                    {isFormOpen ? 'Close' : 'Post Update'}
                </button>
            )}
        </div>

        {isFormOpen && (
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-fade-in-down">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input className="w-full p-3 border-gray-200 border rounded-xl font-bold focus:ring-black" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
                    <textarea className="w-full p-3 border-gray-200 border rounded-xl h-32 resize-none focus:ring-black" placeholder="Write your announcement..." value={newContent} onChange={e => setNewContent(e.target.value)} required />
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isImportant} onChange={e => setIsImportant(e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
                        <span className="text-sm font-bold text-gray-700">Mark as Important</span>
                    </label>
                    <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">Publish Post</button>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Feed */}
            <div className="lg:col-span-2 space-y-6">
                {announcements.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <MegaphoneIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">Quiet day in the classroom.</p>
                    </div>
                ) : (
                    announcements.map(a => (
                        <div key={a.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                    <UserCircleIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{a.author}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {new Date(a.date).toLocaleDateString()}</p>
                                </div>
                                {a.isImportant && <span className="ml-auto bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Important</span>}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{a.title}</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{a.content}</p>
                            {role === Role.OFFICER && (
                                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                                    <button onClick={() => onDeleteAnnouncement(a.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Sidebar Agenda */}
            <div className="lg:col-span-1">
                <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl sticky top-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <CalendarDaysIcon className="w-5 h-5" /> Agenda
                    </h3>
                    <div className="space-y-4">
                        {agenda.slice(0, 4).map(item => (
                            <div key={item.id} className="bg-white/10 backdrop-blur-sm p-3 rounded-xl flex gap-3 items-center">
                                <div className="bg-white/20 rounded-lg w-12 h-12 flex flex-col items-center justify-center">
                                    <span className="text-[10px] uppercase font-bold opacity-70">{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                                    <span className="text-lg font-bold leading-none">{new Date(item.date).getDate()}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm line-clamp-1">{item.title}</p>
                                    <p className="text-xs opacity-70">{item.time} • {item.type}</p>
                                </div>
                            </div>
                        ))}
                        {agenda.length === 0 && <p className="text-white/50 text-sm italic">Nothing scheduled.</p>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
