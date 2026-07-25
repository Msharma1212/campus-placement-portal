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