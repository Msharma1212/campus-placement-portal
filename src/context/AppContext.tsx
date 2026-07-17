/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, JobPosting, Application, Interview, Notification, Company, StudentQuery } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile as firebaseUpdateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';

interface AppContextType {
  currentUser: User | null;
  authLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  jobs: JobPosting[];
  applications: Application[];
  interviews: Interview[];
  notifications: Notification[];
  users: User[];
  companies: Company[];
  queries: StudentQuery[];
  applyToJob: (job: JobPosting) => Promise<void>;
  postJob: (job: Omit<JobPosting, 'id'>) => Promise<void>;
  updateApplicationStatus: (appId: string, status: Application['status']) => Promise<void>;
  scheduleInterview: (interview: Omit<Interview, 'id'>) => Promise<void>;
  addNotification: (userId: string, title: string, message: string, type: Notification['type']) => Promise<void>;
  blockStudent: (studentId: string, blocked: boolean) => Promise<void>;
  verifyStudent: (studentId: string, verified: boolean) => Promise<void>;
  addCompany: (company: Omit<Company, 'id'>) => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  nextRound: (applicationId: string) => Promise<void>;
  addQuery: (message: string) => Promise<void>;
  resolveQuery: (queryId: string, response: string) => Promise<void>;
  refreshData: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signup: (userData: Omit<User, 'id'> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<{
    jobs: JobPosting[];
    applications: Application[];
    interviews: Interview[];
    notifications: Notification[];
    users: User[];
    companies: Company[];
    queries: StudentQuery[];
  }>({
    jobs: [],
    applications: [],
    interviews: [],
    notifications: [],
    users: [],
    companies: [],
    queries: [],
  });

  // Listener for Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            console.log("User logged in:", userData.role, firebaseUser.uid);
            setCurrentUser(userData);
          } else {
            console.warn("User authenticated but profile not found in Firestore:", firebaseUser.uid);
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listeners for data
  useEffect(() => {
    if (!currentUser) {
      setData({
        jobs: [],
        applications: [],
        interviews: [],
        notifications: [],
        users: [],
        companies: [],
        queries: [],
      });
      return;
    } 
    
    const unsubscribers: (() => void)[] = [];

    // Jobs
    unsubscribers.push(onSnapshot(collection(db, 'jobs'), (snapshot) => {
      const jobs = snapshot.docs.map(d => d.data() as JobPosting);
      setData(prev => ({ ...prev, jobs }));