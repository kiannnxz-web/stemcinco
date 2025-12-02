import React, { useState } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import { ArrowRightIcon } from '@heroicons/react/24/solid';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    try {
      const user = await db.login(username);
      onLogin(user);
    } catch (e) {
      alert("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 animate-fade-in-up">
        <div className="text-center">
           <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg shadow-indigo-200">
                C
           </div>
           <h2 className="text-3xl font-extrabold text-gray-900">Classroom HQ</h2>
           <p className="mt-2 text-gray-500">Manage funds, agenda, and news.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Name / Role</label>
                <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. 'Alice' or 'Officer Smith'"
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-all"
                />
                <p className="mt-2 text-xs text-gray-400">
                    * Tip: Use "Officer" in your name to get Admin access.
                </p>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
            >
                {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                    <>
                       Enter Classroom <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
