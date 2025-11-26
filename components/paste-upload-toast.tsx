'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2 } from 'lucide-react'

interface PasteUploadToastProps {
    onUpload: (file: File) => Promise<void>
}

export default function PasteUploadToast({ onUpload }: PasteUploadToastProps) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'no-image'>('idle')
    const [message, setMessage] = useState('')
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            // Ignore paste events in input fields, textareas, and contenteditable elements
            const target = e.target as HTMLElement
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return
            }

            const items = e.clipboardData?.items
            if (!items) {
                setStatus('no-image')
                setMessage('剪贴板为空')
                setTimeout(() => setStatus('idle'), 2000)
                return
            }

            let hasImage = false
            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item.type.indexOf('image') !== -1) {
                    hasImage = true
                    const blob = item.getAsFile()
                    if (blob) {
                        // Generate filename: Paste_YYYYMMDD_HHMMSS.png
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = String(now.getMonth() + 1).padStart(2, '0')
                        const day = String(now.getDate()).padStart(2, '0')
                        const hour = String(now.getHours()).padStart(2, '0')
                        const minute = String(now.getMinutes()).padStart(2, '0')
                        const second = String(now.getSeconds()).padStart(2, '0')
                        const filename = `Paste_${year}${month}${day}_${hour}${minute}${second}.png`

                        const file = new File([blob], filename, { type: blob.type })

                        setStatus('uploading')
                        setMessage('正在上传粘贴的图片...')
                        setProgress(0)

                        try {
                            // Simulate progress
                            const progressInterval = setInterval(() => {
                                setProgress(prev => Math.min(prev + 10, 90))
                            }, 200)

                            await onUpload(file)

                            clearInterval(progressInterval)
                            setProgress(100)
                            setStatus('success')
                            setMessage('上传成功！')
                            setTimeout(() => setStatus('idle'), 2000)
                        } catch (error) {
                            setStatus('error')
                            setMessage('上传失败，请重试')
                            setTimeout(() => setStatus('idle'), 3000)
                        }
                    }
                    break
                }
            }

            if (!hasImage) {
                setStatus('no-image')
                setMessage('剪贴板中没有图片')
                setTimeout(() => setStatus('idle'), 2000)
            }
        }

        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [onUpload])

    // Handle button click to trigger paste
    const handleButtonClick = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read()
            let hasImage = false

            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        hasImage = true
                        const blob = await item.getType(type)

                        // Generate filename
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = String(now.getMonth() + 1).padStart(2, '0')
                        const day = String(now.getDate()).padStart(2, '0')
                        const hour = String(now.getHours()).padStart(2, '0')
                        const minute = String(now.getMinutes()).padStart(2, '0')
                        const second = String(now.getSeconds()).padStart(2, '0')
                        const filename = `Paste_${year}${month}${day}_${hour}${minute}${second}.png`

                        const file = new File([blob], filename, { type: blob.type })

                        setStatus('uploading')
                        setMessage('正在上传粘贴的图片...')
                        setProgress(0)

                        try {
                            const progressInterval = setInterval(() => {
                                setProgress(prev => Math.min(prev + 10, 90))
                            }, 200)

                            await onUpload(file)

                            clearInterval(progressInterval)
                            setProgress(100)
                            setStatus('success')
                            setMessage('上传成功！')
                            setTimeout(() => setStatus('idle'), 2000)
                        } catch (error) {
                            setStatus('error')
                            setMessage('上传失败，请重试')
                            setTimeout(() => setStatus('idle'), 3000)
                        }
                        break
                    }
                }
                if (hasImage) break
            }

            if (!hasImage) {
                setStatus('no-image')
                setMessage('剪贴板中没有图片')
                setTimeout(() => setStatus('idle'), 2000)
            }
        } catch (error) {
            setStatus('error')
            setMessage('无法访问剪贴板')
            setTimeout(() => setStatus('idle'), 2000)
        }
    }

    return (
        <>
            {/* Floating Paste Button */}
            <AnimatePresence>
                {status === 'idle' && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleButtonClick}
                        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-colors group"
                        title="粘贴上传 (Ctrl+V / Cmd+V)"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                        {/* Tooltip */}
                        <span className="absolute bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            粘贴上传
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {status !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 right-8 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 min-w-[320px] max-w-md"
                    >
                        <div className="flex items-start gap-4">
                            {status === 'uploading' && (
                                <div className="flex-shrink-0">
                                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                </div>
                            )}
                            {status === 'success' && (
                                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                    <X className="w-4 h-4 text-white" />
                                </div>
                            )}
                            {status === 'no-image' && (
                                <div className="flex-shrink-0 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                                    <X className="w-4 h-4 text-white" />
                                </div>
                            )}

                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {message}
                                </p>
                                {status === 'uploading' && (
                                    <div className="mt-3">
                                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-blue-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {Math.round(progress)}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
