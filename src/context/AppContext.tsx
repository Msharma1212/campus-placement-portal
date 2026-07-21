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

      if (snapshot.empty && currentUser.role === 'TPO') {
        const initialJobs = [
          { id: 'j1', companyId: 'c1', companyName: 'Google', title: 'Software Engineer Graduate', description: 'Work on cutting-edge systems.', requirements: 'Strong DS & Algo', minCgpa: 8.0, branches: ['CSE', 'IT'], salary: '35 LPA', deadline: '2026-06-01', status: 'OPEN' },
          { id: 'j2', companyId: 'c2', companyName: 'Microsoft', title: 'Product Manager Intern', description: 'Build products for millions.', requirements: 'Strategic thinking', minCgpa: 7.5, branches: ['CSE', 'ECE', 'MBA'], salary: '25 LPA', deadline: '2026-05-30', status: 'OPEN' },
        ];
        initialJobs.forEach(j => setDoc(doc(db, 'jobs', j.id), j));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'jobs')));

    // Companies
    unsubscribers.push(onSnapshot(collection(db, 'companies'), (snapshot) => {
      const companies = snapshot.docs.map(d => d.data() as Company);
      setData(prev => ({ ...prev, companies }));

     // Auto-seed if empty (Demo purposes)
      if (snapshot.empty && currentUser.role === 'TPO') {
        const initialCompanies = [
          { id: 'c1', name: 'Google', description: 'Search and Cloud services' },
          { id: 'c2', name: 'Microsoft', description: 'Software and Cloud' },
          { id: 'c3', name: 'Adobe', description: 'Creative software' },
        ];
        initialCompanies.forEach(c => setDoc(doc(db, 'companies', c.id), c));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'companies')));

    // Role-based filtering for applications, interviews, etc.
    const role = currentUser.role?.toUpperCase();
    if (role === 'STUDENT') {
      unsubscribers.push(onSnapshot(query(collection(db, 'applications'), where('studentId', '==', currentUser.id)), (snapshot) => {
        setData(prev => ({ ...prev, applications: snapshot.docs.map(d => d.data() as Application) }));
      }, (error) => console.error("Apps listener failed", error)));
      unsubscribers.push(onSnapshot(query(collection(db, 'interviews'), where('studentId', '==', currentUser.id)), (snapshot) => {
        setData(prev => ({ ...prev, interviews: snapshot.docs.map(d => d.data() as Interview) }));
      }, (error) => console.error("Interviews listener failed", error)));
      unsubscribers.push(onSnapshot(query(collection(db, 'notifications'), where('userId', '==', currentUser.id)), (snapshot) => {
        setData(prev => ({ ...prev, notifications: snapshot.docs.map(d => d.data() as Notification) }));
      }, (error) => console.error("Notifications listener failed", error)));
      unsubscribers.push(onSnapshot(query(collection(db, 'queries'), where('studentId', '==', currentUser.id)), (snapshot) => {
        setData(prev => ({ ...prev, queries: snapshot.docs.map(d => d.data() as StudentQuery) }));
      }, (error) => console.error("Queries listener failed", error)));
    } else if (['TPO', 'COORDINATOR', 'HR'].includes(role || '')) {
      // Admins/Coords/HR see more
      unsubscribers.push(onSnapshot(collection(db, 'applications'), (snapshot) => {
        setData(prev => ({ ...prev, applications: snapshot.docs.map(d => d.data() as Application) }));
      }, (error) => console.error("Admin Apps listener failed", error)));
      unsubscribers.push(onSnapshot(collection(db, 'interviews'), (snapshot) => {
        setData(prev => ({ ...prev, interviews: snapshot.docs.map(d => d.data() as Interview) }));
      }, (error) => console.error("Admin Interviews listener failed", error)));

      if (role === 'TPO' || role === 'COORDINATOR') {
        unsubscribers.push(onSnapshot(collection(db, 'users'), (snapshot) => {
          setData(prev => ({ ...prev, users: snapshot.docs.map(d => d.data() as User) }));
        }, (error) => console.error("Admin Users listener failed", error)));
        unsubscribers.push(onSnapshot(collection(db, 'queries'), (snapshot) => {
          setData(prev => ({ ...prev, queries: snapshot.docs.map(d => d.data() as StudentQuery) }));
        }, (error) => console.error("Admin Queries listener failed", error)));
      }
    }

    return () => unsubscribers.forEach(u => u());
  }, [currentUser]);

  const refreshData = async () => {
    // With onSnapshot, manual refresh is often unnecessary
  };
  
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim();
    try {
      console.log(`[Auth] Attempting login for: ${trimmedEmail}`);
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);

      console.log(`[Auth] Login successful for UID: ${userCredential.user.uid}`);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        console.log(`[Firestore] Profile found. Role: ${userData.role}`);
        setCurrentUser(userData);
        return { success: true };
      }
      console.warn(`[Firestore] Profile missing for UID: ${userCredential.user.uid}`);
      return { success: false, error: 'Auth successful but profile not found. Please try signing up to recreate your profile.' };
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      const errorCode = error.code;
      let message = 'Login failed. Please check your email and password.';

      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        message = 'Invalid credentials. If you havent created an account yet, please Sign Up first. Note: Demo accounts must be created manually via Sign Up.';

      } else if (errorCode === 'auth/user-disabled') {
        message = 'This account has been disabled.';
      } else if (errorCode === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      } else if (errorCode === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      } else if (errorCode === 'auth/operation-not-allowed') {
        message = 'Email/Password login is not enabled in Firebase. Please enable it in the console.';
      }
      
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setCurrentUser(userData);
        return { success: true };
      } else {

        // New Google user, need to create a default STUDENT profile
        const newUser: User = {
          id: userCredential.user.uid,
          name: userCredential.user.displayName || 'Google User',
          email: userCredential.user.email || '',
          role: 'STUDENT',
          isVerified: false,
          isBlocked: false,
          department: 'Computer Science',
          branch: 'Computer Science',
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
        setCurrentUser(newUser);
        return { success: true };
      }
    } catch (error: any) {
      console.error('Google login failed', error);
      let message = 'Google login failed. Please try again.';
      const errorCode = error.code;

      if (errorCode === 'auth/popup-closed-by-user') {
        message = 'The login popup was closed before completion.';
      } else if (errorCode === 'auth/popup-blocked') {
        message = 'The login popup was blocked by your browser.';
      }
      return { success: false, error: message };
    }
  };

  const signup = async (userData: Omit<User, 'id'> & { password?: string }) => {
    const trimmedEmail = userData.email.trim();
    try {
      console.log(`Attempting signup for role: ${userData.role}, email: ${trimmedEmail}`);
      if (!userData.password) throw new Error("Password required");

      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, userData.password);
      const { password: _, ...userProfile } = userData;
      const roleUpper = userData.role.toUpperCase() as UserRole;