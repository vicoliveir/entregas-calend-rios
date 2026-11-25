import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  BranchName,
  CustomerRecord,
  DEFAULT_CASHIER_PASS,
  DEFAULT_CASHIER_USER,
  DeliveryRecord,
  ToastMessage,
} from '../types';
import {
  isValidBranch,
  isValidFullName,
  isValidJustification,
  isValidRegistrationNumber,
  sanitizeFullName,
  sanitizeJustification,
  sanitizeOperatorLabel,
  sanitizeRegistrationNumber,
} from '../utils/validation';

interface CashierSession {
  operatorName: string;
  activeBranch: BranchName;
}

interface CalendarContextValue {
  user: User | null;
  authReady: boolean;
  authError: string | null;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutTerminal: () => Promise<void>;

  cashierSession: CashierSession | null;
  loginCashier: (username: string, password: string, branch: BranchName) => { ok: boolean; error?: string };
  setActiveBranch: (branch: BranchName) => void;
  logoutCashier: () => void;

  customersByNumber: Map<string, CustomerRecord>;
  deliveries: DeliveryRecord[];
  dataLoading: boolean;

  confirmRegularDelivery: (registrationNumber: string, fullName: string) => Promise<void>;
  confirmManagerException: (customer: CustomerRecord, justification: string) => Promise<void>;

  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const SESSION_STORAGE_KEY = 'cdc_calendar_cashier_session_v1';

const CalendarContext = createContext<CalendarContextValue | null>(null);

function loadStoredCashierSession(): CashierSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CashierSession>;
    if (
      typeof parsed.operatorName === 'string' &&
      parsed.operatorName.trim().length > 0 &&
      typeof parsed.activeBranch === 'string' &&
      isValidBranch(parsed.activeBranch)
    ) {
      return {
        operatorName: parsed.operatorName,
        activeBranch: parsed.activeBranch,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [cashierSession, setCashierSession] = useState<CashierSession | null>(() =>
    loadStoredCashierSession()
  );

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [deliveriesLoaded, setDeliveriesLoaded] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setCustomers([]);
        setDeliveries([]);
        setCustomersLoaded(false);
        setDeliveriesLoaded(false);
      }
    });
    return () => unsub();
  }, []);

  // Attach real-time Firestore listeners only when auth is ready and user email is verified
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      return;
    }

    setCustomersLoaded(false);
    setDeliveriesLoaded(false);

    const isBootstrapAdmin =
      user.emailVerified && user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    const customersQuery = isBootstrapAdmin
      ? collection(db, 'customers')
      : query(collection(db, 'customers'), where('ownerUid', '==', user.uid));

    const deliveriesQuery = isBootstrapAdmin
      ? collection(db, 'deliveries')
      : query(collection(db, 'deliveries'), where('ownerUid', '==', user.uid));

    const unsubCustomers = onSnapshot(
      customersQuery,
      (snapshot) => {
        const list: CustomerRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            registrationNumber: String(data.registrationNumber ?? docSnap.id),
            fullName: String(data.fullName ?? ''),
            hasPickedUp: Boolean(data.hasPickedUp),
            deliveryCount: Number(data.deliveryCount ?? 1),
            firstDeliveryAt: data.firstDeliveryAt ?? null,
            firstDeliveryBranch: data.firstDeliveryBranch as BranchName,
            lastDeliveryAt: data.lastDeliveryAt ?? null,
            lastDeliveryBranch: data.lastDeliveryBranch as BranchName,
            ownerUid: String(data.ownerUid ?? ''),
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        });
        setCustomers(list);
        setCustomersLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'customers');
      }
    );

    const unsubDeliveries = onSnapshot(
      deliveriesQuery,
      (snapshot) => {
        const list: DeliveryRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            registrationNumber: String(data.registrationNumber ?? ''),
            customerName: String(data.customerName ?? ''),
            branch: data.branch as BranchName,
            type: data.type === 'MANAGER_EXCEPTION' ? 'MANAGER_EXCEPTION' : 'REGULAR',
            justification: String(data.justification ?? ''),
            operatorLabel: String(data.operatorLabel ?? 'caixa'),
            ownerUid: String(data.ownerUid ?? ''),
            deliveredAt: data.deliveredAt ?? null,
          };
        });

        // Client-side descending chronological sort (avoids composite index requirement)
        list.sort((a, b) => {
          const timeA = a.deliveredAt ? a.deliveredAt.toMillis() : Date.now();
          const timeB = b.deliveredAt ? b.deliveredAt.toMillis() : Date.now();
          return timeB - timeA;
        });

        setDeliveries(list);
        setDeliveriesLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'deliveries');
      }
    );

    return () => {
      unsubCustomers();
      unsubDeliveries();
    };
  }, [authReady, user]);

  const customersByNumber = useMemo(() => {
    const map = new Map<string, CustomerRecord>();
    for (const c of customers) {
      map.set(c.registrationNumber, c);
    }
    return map;
  }, [customers]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível autenticar com o Google.';
      if (!message.includes('popup-closed-by-user')) {
        setAuthError('Falha ao conectar a conta Google do terminal. Tente novamente.');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutTerminal = useCallback(async () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setCashierSession(null);
    await signOut(auth);
  }, []);

  const loginCashier = useCallback(
    (username: string, password: string, branch: BranchName): { ok: boolean; error?: string } => {
      const normalizedUser = username.trim().toLowerCase();
      const normalizedPass = password.trim();

      if (!normalizedUser || !normalizedPass) {
        return { ok: false, error: 'Informe o usuário e a senha compartilhada do caixa.' };
      }

      if (normalizedUser !== DEFAULT_CASHIER_USER || normalizedPass !== DEFAULT_CASHIER_PASS) {
        return { ok: false, error: 'Usuário ou senha do caixa incorretos.' };
      }

      if (!isValidBranch(branch)) {
        return { ok: false, error: 'Selecione uma filial válida.' };
      }

      const nextSession: CashierSession = {
        operatorName: sanitizeOperatorLabel(username),
        activeBranch: branch,
      };

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      setCashierSession(nextSession);
      return { ok: true };
    },
    []
  );

  const setActiveBranch = useCallback((branch: BranchName) => {
    if (!isValidBranch(branch)) return;
    setCashierSession((prev) => {
      if (!prev) return prev;
      const updated: CashierSession = { ...prev, activeBranch: branch };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logoutCashier = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setCashierSession(null);
  }, []);

  const confirmRegularDelivery = useCallback(
    async (rawRegistrationNumber: string, rawFullName: string) => {
      if (!user || !cashierSession) {
        throw new Error('Terminal não autenticado.');
      }

      const cleanReg = sanitizeRegistrationNumber(rawRegistrationNumber);
      const cleanName = sanitizeFullName(rawFullName);

      if (!isValidRegistrationNumber(cleanReg)) {
        throw new Error('Número de cadastro inválido.');
      }
      if (!isValidFullName(cleanName)) {
        throw new Error('Informe o Nome e Sobrenome do cliente (mínimo 2 caracteres).');
      }

      const batch = writeBatch(db);
      const customerRef = doc(db, 'customers', cleanReg);
      const deliveryRef = doc(collection(db, 'deliveries'));
      const operatorLabel = sanitizeOperatorLabel(cashierSession.operatorName);

      batch.set(customerRef, {
        registrationNumber: cleanReg,
        fullName: cleanName,
        hasPickedUp: true,
        deliveryCount: 1,
        firstDeliveryAt: serverTimestamp(),
        firstDeliveryBranch: cashierSession.activeBranch,
        lastDeliveryAt: serverTimestamp(),
        lastDeliveryBranch: cashierSession.activeBranch,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(deliveryRef, {
        registrationNumber: cleanReg,
        customerName: cleanName,
        branch: cashierSession.activeBranch,
        type: 'REGULAR',
        justification: '',
        operatorLabel,
        ownerUid: user.uid,
        deliveredAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `customers/${cleanReg}`);
      }
    },
    [user, cashierSession]
  );

  const confirmManagerException = useCallback(
    async (customer: CustomerRecord, rawJustification: string) => {
      if (!user || !cashierSession) {
        throw new Error('Terminal não autenticado.');
      }

      const cleanJustification = sanitizeJustification(rawJustification);
      if (!isValidJustification(cleanJustification)) {
        throw new Error('Informe uma justificativa com pelo menos 3 caracteres.');
      }

      const batch = writeBatch(db);
      const customerRef = doc(db, 'customers', customer.registrationNumber);
      const deliveryRef = doc(collection(db, 'deliveries'));
      const operatorLabel = sanitizeOperatorLabel(cashierSession.operatorName);

      batch.update(customerRef, {
        deliveryCount: customer.deliveryCount + 1,
        lastDeliveryAt: serverTimestamp(),
        lastDeliveryBranch: cashierSession.activeBranch,
        updatedAt: serverTimestamp(),
      });

      batch.set(deliveryRef, {
        registrationNumber: customer.registrationNumber,
        customerName: sanitizeFullName(customer.fullName),
        branch: cashierSession.activeBranch,
        type: 'MANAGER_EXCEPTION',
        justification: cleanJustification,
        operatorLabel,
        ownerUid: user.uid,
        deliveredAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `deliveries/exception/${customer.registrationNumber}`);
      }
    },
    [user, cashierSession]
  );

  const dataLoading = Boolean(user && (!customersLoaded || !deliveriesLoaded));

  const value = useMemo<CalendarContextValue>(
    () => ({
      user,
      authReady,
      authError,
      isSigningIn,
      signInWithGoogle,
      signOutTerminal,
      cashierSession,
      loginCashier,
      setActiveBranch,
      logoutCashier,
      customersByNumber,
      deliveries,
      dataLoading,
      confirmRegularDelivery,
      confirmManagerException,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      user,
      authReady,
      authError,
      isSigningIn,
      signInWithGoogle,
      signOutTerminal,
      cashierSession,
      loginCashier,
      setActiveBranch,
      logoutCashier,
      customersByNumber,
      deliveries,
      dataLoading,
      confirmRegularDelivery,
      confirmManagerException,
      toasts,
      pushToast,
      dismissToast,
    ]
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return ctx;
}
