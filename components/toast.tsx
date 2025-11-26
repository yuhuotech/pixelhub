'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
    id: string
    message: string
    type: ToastType
}

interface ToastProviderProps {
    children: React.ReactNode
}

interface ToastContextType {
    toast: (message: string, type: ToastType) => void
}

import { createContext, useContext } from 'react'

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now().toString()
        setToasts(prev => [...prev, { id, message, type }])

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000)
    }, [])

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}

function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
    return (
        <div className="fixed top-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 100, y: -10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 100, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto ${
                            toast.type === 'success'
                                ? 'bg-green-500 text-white'
                                : toast.type === 'error'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-blue-500 text-white'
                        }`}
                    >
                        {toast.type === 'success' && <Check className="w-5 h-5 flex-shrink-0" />}
                        {toast.type === 'error' && <X className="w-5 h-5 flex-shrink-0" />}
                        {toast.type === 'info' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
