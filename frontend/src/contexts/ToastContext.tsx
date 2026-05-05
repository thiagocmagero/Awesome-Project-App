import { createContext, useContext, ReactNode } from 'react';
import { toast, Toaster } from 'react-hot-toast';

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary';

interface ToastContextValue {
  showToast: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  function showToast(variant: ToastVariant, message: string) {
    switch (variant) {
      case 'success':
        toast.success(message);
        break;
      case 'danger':
        toast.error(message);
        break;
      case 'warning':
        toast(message, { icon: '⚠️' });
        break;
      case 'info':
        toast(message, { icon: 'ℹ️' });
        break;
      default:
        toast(message);
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="top-center"
        containerClassName="app-toaster"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
    </ToastContext.Provider>
  );
}
