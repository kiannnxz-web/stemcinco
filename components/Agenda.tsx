import React, { useState } from 'react';
import { Role, AgendaItem } from '../types';
import { TrashIcon } from '@heroicons/react/24/outline';

interface AgendaProps {
  role: Role;
  agenda: AgendaItem[];
  onAddAgenda: (item: Omit<AgendaItem, 'id'>) => void;
  onDeleteAgenda: (id: string) => void;
}

const Agenda: React.FC<AgendaProps> = ({ role, agenda, onAddAgenda, onDeleteAgenda }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<AgendaItem['type']>('HOMEWORK');

  // Sort agenda by date
  const sortedAgenda = [...agenda].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAgenda({ title, date, time, type });
    setIsModalOpen(false);
    setTitle(''); setDate(''); setTime('');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
        case 'EXAM': return 'bg-red-100 text-red-700 border-red-200';
        case 'HOMEWORK': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'EVENT': return 'bg-green-100 text-green-700 border-green-200';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Class Agenda</h2>
        {role === Role.OFFICER && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Add Event
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Event</th>
                        <th className="px-6 py-4">Type</th>
                        {role === Role.OFFICER && <th className="px-6 py-4 text-right">Action</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedAgenda.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.time}</td>
                            <td className="px-6 py-4 font-medium">{item.title}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold border ${getTypeColor(item.type)}`}>
                                    {item.type}
                                </span>
                            </td>
                            {role === Role.OFFICER && (
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onDeleteAgenda(item.id)} className="text-gray-400 hover:text-red-500">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    {sortedAgenda.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                No upcoming events found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
             <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-fade-in">
                <h3 className="text-lg font-bold mb-4">Add Agenda Item</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg p-2 border-gray-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-2 border-gray-300" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full border rounded-lg p-2 border-gray-300" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border rounded-lg p-2 border-gray-300">
                            <option value="HOMEWORK">Homework</option>
                            <option value="EXAM">Exam</option>
                            <option value="EVENT">Event</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                         <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                         <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium">Save</button>
                    </div>
                </form>
             </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
