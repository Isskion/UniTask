import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CountersState {
  pendingTasks: number;
  tenantId: string | null;
  userId: string | null;
  assignedProjectIds: string[] | null;
  role: string | null;
  roleLevel: number;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  loading: boolean;
  unsubscribe: (() => void) | null;
  subscribeToCounters: (userId: string) => void;
  cleanup: () => void;
}

export const useMobileCounters = create<CountersState>((set, get) => ({
  pendingTasks: 0,
  tenantId: null,
  userId: null,
  assignedProjectIds: null,
  role: null,
  roleLevel: 0,
  displayName: null,
  photoURL: null,
  email: null,
  loading: true,
  unsubscribe: null,

  subscribeToCounters: (userId: string) => {
    // Cleanup previous listener if any
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    set({ loading: true, userId });

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const counters = data.counters || {};
        set({
          pendingTasks: counters.pendingTasks || 0,
          tenantId: data.tenantId || '1',
          assignedProjectIds: data.assignedProjectIds || [],
          role: data.role || 'team_member',
          roleLevel: data.roleLevel || 0,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          email: data.email || null,
          loading: false,
        });
      } else {
        set({
          pendingTasks: 0,
          tenantId: '1',
          assignedProjectIds: [],
          role: 'team_member',
          roleLevel: 0,
          displayName: null,
          photoURL: null,
          email: null,
          loading: false
        });
      }
    }, (error) => {
      console.error('Error listening to user counters:', error);
      set({ loading: false });
    });

    set({ unsubscribe });
  },

  cleanup: () => {
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }
    set({
      pendingTasks: 0,
      tenantId: null,
      userId: null,
      assignedProjectIds: null,
      role: null,
      roleLevel: 0,
      displayName: null,
      photoURL: null,
      email: null,
      unsubscribe: null,
      loading: true
    });
  }
}));
