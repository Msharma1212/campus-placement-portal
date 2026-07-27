/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { User as UserIcon, Plus, X, Save, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ProfileEditor: React.FC = () => {
  const { currentUser, updateProfile, setActiveTab } = useApp();
  const [formData, setFormData] = useState<Partial<User>>({
    name: currentUser?.name || '',
    cgpa: currentUser?.cgpa || 0,
    branch: currentUser?.branch || '',
    skills: currentUser?.skills || [],
    projects: currentUser?.projects || []
  });

const [newSkill, setNewSkill] = useState('');
  const [newProject, setNewProject] = useState({ title: '', link: '' });

const handleSave = async () => {
    await updateProfile(formData);
    alert('Profile updated successfully!');
    setActiveTab('dashboard');
  };

const addSkill = () => {
    if (newSkill && !formData.skills?.includes(newSkill)) {
      setFormData({ ...formData, skills: [...(formData.skills || []), newSkill] });
      setNewSkill('');
    }
  };

const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills?.filter(s => s !== skill) });
  };

  const addProject = () => {
    if (newProject.title) {
      setFormData({ ...formData, projects: [...(formData.projects || []), newProject] });
      setNewProject({ title: '', link: '' });
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-8"></div>
          <h1 className="text-2xl font-bold text-slate-900">{currentUser?.name}</h1>
          <p className="text-slate-500">{currentUser?.branch} • Student ID: {currentUser?.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Academic Details */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"></div>
          <h3 className="font-bold text-lg text-slate-900">Academic Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Branch</label>

              <input 
                type="text" 
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">CGPA</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.cgpa}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, cgpa: val === '' ? 0 : parseFloat(val) || 0 });
                }}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
        {/* Skills */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-900">Skills</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Add skill (e.g. React)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none"
            />
            <button onClick={addSkill} className="p-2 bg-indigo-600 text-white rounded-xl">
              <Plus size={20} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.skills?.map(skill => (
              <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold flex items-center gap-2">
                {skill}
                <button onClick={() => removeSkill(skill)}><X size={14} /></button>
              </span>
            ))}
          </div>
        </div>