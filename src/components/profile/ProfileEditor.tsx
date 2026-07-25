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