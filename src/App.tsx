import React, { useState } from 'react';
import { CalendarProvider, useCalendar } from './context/CalendarContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { PosCounterView } from './components/PosCounterView';
import { ManagerDashboardView } from './components/ManagerDashboardView';
import { ManagerPinModal } from './components/ManagerPinModal';
import { ToastContainer } from './components/ToastContainer';

function AppShell() {
  const { user, authReady, cashierSession } = useCalendar();
  const [activeView, setActiveView] = useState<'pos' | 'manager'>('pos');
  const [managerPinModalOpen, setManagerPinModalOpen] = useState(false);

  if (!authReady || !user || !cashierSession) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header
        activeView={activeView}
        onOpenManagerGate={() => setManagerPinModalOpen(true)}
        onReturnToPos={() => setActiveView('pos')}
      />

      <div className="flex-1">
        {activeView === 'pos' ? <PosCounterView /> : <ManagerDashboardView />}
      </div>

      <footer className="py-4 px-6 border-t border-[#DDE7D9]/70 text-center text-xs text-[#64795A]">
        Casa do Campo · Controle de Distribuição de Calendários · Operador: {cashierSession.operatorName}
      </footer>

      <ManagerPinModal
        open={managerPinModalOpen}
        onClose={() => setManagerPinModalOpen(false)}
        onVerified={() => {
          setManagerPinModalOpen(false);
          setActiveView('manager');
        }}
      />

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CalendarProvider>
        <AppShell />
      </CalendarProvider>
    </ErrorBoundary>
  );
}
