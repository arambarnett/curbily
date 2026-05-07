import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, getRedirectResult, signInWithRedirect } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (targetMode?: 'producer' | 'talent') => Promise<void>;
  logout: () => Promise<void>;
  switchViewMode: (mode: 'producer' | 'talent') => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for redirect result
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect sign-in success:', result.user.email);
        }
      } catch (error) {
        console.error('Redirect sign-in error:', error);
      }
    };
    checkRedirect();

    let profileUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user?.email || 'No user');
      setUser(user);
      
      // Clear existing profile subscription if any
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (user) {
        // Use onSnapshot for real-time profile updates
        const docRef = doc(db, 'users', user.uid);
        profileUnsubscribe = onSnapshot(docRef, async (docSnap) => {
          const targetViewMode = localStorage.getItem('target_view_mode') as 'producer' | 'talent' | null;
          
          if (docSnap.exists()) {
            console.log('Profile update received:', docSnap.data());
            let data = docSnap.data() as UserProfile;
            
            // Critical fix: If we have a target mode, ensure viewMode is set correct for the hub they are entering
            if (targetViewMode && (data.viewMode !== targetViewMode)) {
              const updates: Partial<UserProfile> = { viewMode: targetViewMode };
              
              // If entering producer mode, ensure we are marked as onboarded for that hub
              if (targetViewMode === 'producer' && !data.onboarded) {
                updates.onboarded = true;
              }
              
              setProfile(prev => prev ? { ...prev, ...updates } : { ...data, ...updates });
              localStorage.removeItem('target_view_mode');
              await setDoc(docRef, updates, { merge: true });
              data = { ...data, ...updates };
            }

            // Sync with local state and ensure loading is off
            setProfile(data);
            setLoading(false);
          } else {
            console.log('Creating new user profile record...');
            
            let defaultFreeLimit = 3;
            try {
              const globalSettingsSnap = await getDoc(doc(db, 'settings', 'global'));
              if (globalSettingsSnap.exists() && globalSettingsSnap.data().defaultFreeProjectLimit) {
                defaultFreeLimit = globalSettingsSnap.data().defaultFreeProjectLimit;
              }
            } catch (e) {
              console.warn("Could not fetch global settings", e);
            }

            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              role: 'user',
              viewMode: targetViewMode || 'producer',
              onboarded: targetViewMode === 'producer', // Studio users auto-onboard, talent users go through join flow
              freeProjectLimit: defaultFreeLimit,
              tokens: 10,
              createdAt: new Date().toISOString()
            };
            
            // Set local state immediately to avoid redirection loops
            setProfile(newProfile);
            await setDoc(docRef, newProfile);
            localStorage.removeItem('target_view_mode');

            // Initialize contact record for the network
            const contactRef = doc(db, 'contacts', user.uid);
            const contactSnap = await getDoc(contactRef);
            if (!contactSnap.exists()) {
              await setDoc(contactRef, {
                uid: user.uid,
                name: user.displayName || '',
                email: user.email || '',
                roles: [],
                type: ['crew'],
                rate: 0,
                location: 'Remote',
                reliability: 5,
                isGlobal: true,
                ownerId: 'system',
                createdAt: new Date().toISOString()
              });
            }
            // Profile will be set by the subsequent snapshot triggered by setDoc
          }
          setLoading(false);
        }, (error) => {
          console.error('Error in profile snapshot:', error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const signIn = React.useCallback(async (targetMode: 'producer' | 'talent' = 'producer') => {
    const isIframe = window.self !== window.top;
    console.log(`Initiating sign in (Mode: ${targetMode}, Iframe: ${isIframe})...`);
    
    // Store target mode in local storage to be picked up by onAuthStateChanged for new users
    localStorage.setItem('target_view_mode', targetMode);
    
    const provider = new GoogleAuthProvider();
    // Add custom parameters to prompt account selection
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      
      console.log('Sign in successful');
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // If the popup is blocked, redirect is the fallback path.
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider);
      } else {
        localStorage.removeItem('target_view_mode'); // Clean up on error
        alert(`Failed to sign in: ${error.message}. Please check if you are in a private window or if popups are blocked.`);
      }
    }
  }, []);

  const switchViewMode = React.useCallback(async (mode: 'producer' | 'talent') => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { viewMode: mode }, { merge: true });
      setProfile(prev => prev ? { ...prev, viewMode: mode } : null);
    } catch (error) {
      console.error('Error switching view mode:', error);
    }
  }, [user]);

  const updateProfile = React.useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, data, { merge: true });
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }, [user]);

  const logout = React.useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, switchViewMode, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
