"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { btnPrimaryClass } from "@/lib/ui/portalClasses";

const SUCCESS_TOAST_MS = 1000;

type NotificationContextValue = {
  notifyError: (message: string, title?: string) => void;
  notifySuccess: (message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

type ErrorModalState = {
  title: string;
  message: string;
};

type SuccessToast = {
  id: string;
  message: string;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const baseId = useId();
  const toastCounter = useRef(0);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);
  const [successToasts, setSuccessToasts] = useState<SuccessToast[]>([]);

  const notifyError = useCallback((message: string, title = "Something went wrong") => {
    setErrorModal({ title, message });
  }, []);

  const notifySuccess = useCallback(
    (message: string) => {
      const id = `${baseId}-toast-${++toastCounter.current}`;
      setSuccessToasts((prev) => [...prev, { id, message }]);
      window.setTimeout(() => {
        setSuccessToasts((prev) => prev.filter((t) => t.id !== id));
      }, SUCCESS_TOAST_MS);
    },
    [baseId]
  );

  useEffect(() => {
    if (!errorModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [errorModal]);

  return (
    <NotificationContext.Provider value={{ notifyError, notifySuccess }}>
      {children}

      {errorModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notification-error-title"
            aria-describedby="notification-error-message"
            className="portal-card w-full max-w-md p-6 shadow-2xl border border-red-400/30"
          >
            <h2
              id="notification-error-title"
              className="text-lg font-semibold text-red-200 mb-2"
            >
              {errorModal.title}
            </h2>
            <p
              id="notification-error-message"
              className="text-sm text-uc-text/90 break-words whitespace-pre-wrap"
            >
              {errorModal.message}
            </p>
            <button
              type="button"
              className={`${btnPrimaryClass} mt-5`}
              autoFocus
              onClick={() => setErrorModal(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none max-w-sm w-full sm:w-auto"
        aria-live="polite"
      >
        {successToasts.map((toast) => (
          <div
            key={toast.id}
            className="notification-toast portal-alert portal-alert-success px-4 py-3 text-sm shadow-lg pointer-events-auto"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
