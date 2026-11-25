import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  AuthorizedEmailRecord,
  BOOTSTRAP_ADMIN_EMAIL,
  BranchName,
  CustomerRecord,
  DEFAULT_CASHIER_PASS,
  DEFAULT_CASHIER_USER,
  DeliveryRecord,
  ToastMessage,
} from '../types';
import {
  emailToDocId,
  isValidBranch,
  isValidEmail,
  isValidFullName,
  isValidJustification,
  isValidRegistrationNumber,
  isValidTerminalLabel,
  sanitizeEmail,
  sanitizeFullName,
  sanitizeJustification,
  sanitizeOperatorLabel,
  sanitizeRegistrationNumber,
  sanitizeTerminalLabel,
} from '../utils/validation';

interface CashierSession {
  operatorName: string;
  activeBranch: BranchName;
}

export type AuthorizationStatus = 'idle' | 'checking' | 'authorized' | 'unauthorized';

interface CalendarContextValue {
  user: User | null;
  authReady: boolean;
  isAdminUser: boolean;
  authorizationStatus: AuthorizationStatus;
  authorizedProfile: AuthorizedEmailRecord | null;
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

  authorizedEmails: AuthorizedEmailRecord[];
  authorizedEmailsLoading: boolean;
  addAuthorizedEmail: (email: string, branch: BranchName, label: string) => Promise<void>;
  updateAuthorizedEmail: (
    record: AuthorizedEmailRecord,
    updates: { active?: boolean; branch?: BranchName; label?: string }
  ) => Promise<void>;
  removeAuthorizedEmail: (emailDocId: string) => Promise<void>;

  confirmRegularDelivery: (registrationNumber: string, fullName: string) => Promise<void>;
  confirmManagerException: (customer: CustomerRecord, justification: string) => Promise<void>;
  deleteDelivery: (delivery: DeliveryRecord) => Promise<void>;

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

  const [authorizationStatus, setAuthorizationStatus] = useState<AuthorizationStatus>('idle');
  const [authorizedProfile, setAuthorizedProfile] = useState<AuthorizedEmailRecord | null>(null);

  const [cashierSession, setCashierSession] = useState<CashierSession | null>(() =>
    loadStoredCashierSession()
  );

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [deliveriesLoaded, setDeliveriesLoaded] = useState(false);

  const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmailRecord[]>([]);
  const [authorizedEmailsLoaded, setAuthorizedEmailsLoaded] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isAdminUser = Boolean(
    user?.emailVerified &&
      user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );

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
        setAuthorizationStatus('idle');
        setAuthorizedProfile(null);
        setCustomers([]);
        setDeliveries([]);
        setAuthorizedEmails([]);
        setCustomersLoaded(false);
        setDeliveriesLoaded(false);
        setAuthorizedEmailsLoaded(false);
      }
    });
    return () => unsub();
  }, []);

  // Verify terminal email authorization in real time
  useEffect(() => {
    if (!authReady || !user) {
      setAuthorizationStatus('idle');
      setAuthorizedProfile(null);
      return;
    }

    if (!user.emailVerified || !user.email) {
      setAuthorizationStatus('unauthorized');
      setAuthorizedProfile(null);
      return;
    }

    if (isAdminUser) {
      setAuthorizationStatus('authorized');
      setAuthorizedProfile(null);
      return;
    }

    setAuthorizationStatus('checking');
    const docId = emailToDocId(user.email);
    const ownRef = doc(db, 'authorized_emails', docId);

    const unsubOwnAuth = onSnapshot(
      ownRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const record: AuthorizedEmailRecord = {
            id: docSnap.id,
            email: String(data.email ?? user.email?.toLowerCase() ?? ''),
            branch: data.branch as BranchName,
            label: String(data.label ?? ''),
            active: Boolean(data.active),
            addedByUid: String(data.addedByUid ?? ''),
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
          if (record.active) {
            setAuthorizedProfile(record);
            setAuthorizationStatus('authorized');
          } else {
            setAuthorizedProfile(record);
            setAuthorizationStatus('unauthorized');
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            setCashierSession(null);
          }
        } else {
          setAuthorizedProfile(null);
          setAuthorizationStatus('unauthorized');
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setCashierSession(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `authorized_emails/${docId}`);
      }
    );

    return () => unsubOwnAuth();
  }, [authReady, user, isAdminUser]);

  // Admin real-time listener for all authorized store emails
  useEffect(() => {
    if (!authReady || !user || !isAdminUser) {
      setAuthorizedEmails([]);
      setAuthorizedEmailsLoaded(false);
      return;
    }

    setAuthorizedEmailsLoaded(false);
    const unsubEmails = onSnapshot(
      collection(db, 'authorized_emails'),
      (snapshot) => {
        const list: AuthorizedEmailRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            email: String(data.email ?? ''),
            branch: data.branch as BranchName,
            label: String(data.label ?? ''),
            active: Boolean(data.active),
            addedByUid: String(data.addedByUid ?? ''),
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        });
        list.sort((a, b) => a.branch.localeCompare(b.branch) || a.email.localeCompare(b.email));
        setAuthorizedEmails(list);
        setAuthorizedEmailsLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'authorized_emails');
      }
    );

    return () => unsubEmails();
  }, [authReady, user, isAdminUser]);

  // Attach shared real-time Firestore listeners once terminal email is authorized
  useEffect(() => {
    if (!authReady || !user || authorizationStatus !== 'authorized') {
      setCustomers([]);
      setDeliveries([]);
      setCustomersLoaded(false);
      setDeliveriesLoaded(false);
      return;
    }

    setCustomersLoaded(false);
    setDeliveriesLoaded(false);

    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
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
      collection(db, 'deliveries'),
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
  }, [authReady, user, authorizationStatus]);

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

  const addAuthorizedEmail = useCallback(
    async (rawEmail: string, branch: BranchName, rawLabel: string) => {
      if (!user || !isAdminUser) {
        throw new Error('Apenas o administrador principal pode autorizar novas contas Google.');
      }

      const cleanEmail = sanitizeEmail(rawEmail);
      const cleanLabel = sanitizeTerminalLabel(rawLabel);

      if (!isValidEmail(cleanEmail)) {
        throw new Error('Digite um endereço de e-mail Google válido.');
      }
      if (cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
        throw new Error('Este e-mail já é o administrador principal da Casa do Campo.');
      }
      if (!isValidBranch(branch)) {
        throw new Error('Selecione uma filial válida.');
      }
      if (!isValidTerminalLabel(cleanLabel)) {
        throw new Error('Informe uma identificação do caixa/loja (mínimo 2 caracteres).');
      }

      const docId = emailToDocId(cleanEmail);
      if (authorizedEmails.some((item) => item.id === docId)) {
        throw new Error('Este e-mail já está cadastrado na lista de contas autorizadas.');
      }

      try {
        await setDoc(doc(db, 'authorized_emails', docId), {
          email: cleanEmail,
          branch,
          label: cleanLabel,
          active: true,
          addedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `authorized_emails/${docId}`);
      }
    },
    [user, isAdminUser, authorizedEmails]
  );

  const updateAuthorizedEmail = useCallback(
    async (
      record: AuthorizedEmailRecord,
      updates: { active?: boolean; branch?: BranchName; label?: string }
    ) => {
      if (!user || !isAdminUser) {
        throw new Error('Apenas o administrador principal pode alterar contas autorizadas.');
      }

      const nextBranch = updates.branch ?? record.branch;
      const nextLabel =
        updates.label !== undefined ? sanitizeTerminalLabel(updates.label) : record.label;
      const nextActive = updates.active !== undefined ? updates.active : record.active;

      if (!isValidBranch(nextBranch)) {
        throw new Error('Filial inválida.');
      }
      if (!isValidTerminalLabel(nextLabel)) {
        throw new Error('Identificação do caixa inválida.');
      }

      try {
        await updateDoc(doc(db, 'authorized_emails', record.id), {
          branch: nextBranch,
          label: nextLabel,
          active: nextActive,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `authorized_emails/${record.id}`);
      }
    },
    [user, isAdminUser]
  );

  const removeAuthorizedEmail = useCallback(
    async (emailDocId: string) => {
      if (!user || !isAdminUser) {
        throw new Error('Apenas o administrador principal pode remover contas autorizadas.');
      }

      try {
        await deleteDoc(doc(db, 'authorized_emails', emailDocId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `authorized_emails/${emailDocId}`);
      }
    },
    [user, isAdminUser]
  );

  const confirmRegularDelivery = useCallback(
    async (rawRegistrationNumber: string, rawFullName: string) => {
      if (!user || !cashierSession || authorizationStatus !== 'authorized') {
        throw new Error('Terminal não autorizado.');
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
      const operatorLabel = sanitizeOperatorLabel(
        authorizedProfile?.label || user.email || cashierSession.operatorName
      );

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
    [user, cashierSession, authorizationStatus, authorizedProfile]
  );

  const confirmManagerException = useCallback(
    async (customer: CustomerRecord, rawJustification: string) => {
      if (!user || !cashierSession || authorizationStatus !== 'authorized') {
        throw new Error('Terminal não autorizado.');
      }

      const cleanJustification = sanitizeJustification(rawJustification);
      if (!isValidJustification(cleanJustification)) {
        throw new Error('Informe uma justificativa com pelo menos 3 caracteres.');
      }

      const batch = writeBatch(db);
      const customerRef = doc(db, 'customers', customer.registrationNumber);
      const deliveryRef = doc(collection(db, 'deliveries'));
      const operatorLabel = sanitizeOperatorLabel(
        authorizedProfile?.label || user.email || cashierSession.operatorName
      );

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
    [user, cashierSession, authorizationStatus, authorizedProfile]
  );

  const deleteDelivery = useCallback(
    async (targetDelivery: DeliveryRecord) => {
      if (!user || authorizationStatus !== 'authorized') {
        throw new Error('Terminal não autorizado.');
      }

      const regNum = targetDelivery.registrationNumber;
      const customer = customersByNumber.get(regNum);
      const remaining = deliveries
        .filter((item) => item.registrationNumber === regNum && item.id !== targetDelivery.id)
        .sort((a, b) => {
          const msA = a.deliveredAt ? a.deliveredAt.toMillis() : 0;
          const msB = b.deliveredAt ? b.deliveredAt.toMillis() : 0;
          return msA - msB;
        });

      const batch = writeBatch(db);
      const deliveryRef = doc(db, 'deliveries', targetDelivery.id);
      const customerRef = doc(db, 'customers', regNum);

      batch.delete(deliveryRef);

      if (customer) {
        if (customer.deliveryCount <= 1 || remaining.length === 0) {
          batch.delete(customerRef);
        } else {
          const earliest = remaining[0];
          const latest = remaining[remaining.length - 1];
          batch.update(customerRef, {
            deliveryCount: customer.deliveryCount - 1,
            firstDeliveryAt: earliest.deliveredAt ?? customer.firstDeliveryAt ?? serverTimestamp(),
            firstDeliveryBranch: earliest.branch,
            lastDeliveryAt: latest.deliveredAt ?? customer.lastDeliveryAt ?? serverTimestamp(),
            lastDeliveryBranch: latest.branch,
            updatedAt: serverTimestamp(),
          });
        }
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `deliveries/${targetDelivery.id}`);
      }
    },
    [user, authorizationStatus, customersByNumber, deliveries]
  );

  const dataLoading = Boolean(
    user && authorizationStatus === 'authorized' && (!customersLoaded || !deliveriesLoaded)
  );
  const authorizedEmailsLoading = Boolean(user && isAdminUser && !authorizedEmailsLoaded);

  const value = useMemo<CalendarContextValue>(
    () => ({
      user,
      authReady,
      isAdminUser,
      authorizationStatus,
      authorizedProfile,
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
      authorizedEmails,
      authorizedEmailsLoading,
      addAuthorizedEmail,
      updateAuthorizedEmail,
      removeAuthorizedEmail,
      confirmRegularDelivery,
      confirmManagerException,
      deleteDelivery,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      user,
      authReady,
      isAdminUser,
      authorizationStatus,
      authorizedProfile,
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
      authorizedEmails,
      authorizedEmailsLoading,
      addAuthorizedEmail,
      updateAuthorizedEmail,
      removeAuthorizedEmail,
      confirmRegularDelivery,
      confirmManagerException,
      deleteDelivery,
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
