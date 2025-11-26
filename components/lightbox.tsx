'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Trash2, Check, ExternalLink, Code, Copy, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LightboxProps {
    images: any[]
    initialIndex: number
    isOpen: boolean
    onClose: () => void
    onDelete: (id: string) => void
}

export default function Lightbox({ images, initialIndex, isOpen, onClose, onDelete }: LightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        setCurrentIndex(initialIndex)
    }, [initialIndex])

    const currentImage = images[currentIndex]

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length)
    }, [images.length])

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    }, [images.length])

    const handleDelete = () => {
        if (confirm('确定要删除这张图片吗？')) {
            onDelete(currentImage.id)
            if (images.length === 1) {
                onClose()
            } else if (currentIndex === images.length - 1) {
                setCurrentIndex(prev => prev - 1)
            }
        }
    }

    const copyToClipboard = async (text: string, type: string) => {
        await navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    const handleCopyImage = async () => {
        try {
            const response = await fetch(currentImage.url)
            const blob = await response.blob()

            let blobToCopy = blob

            // If not PNG, convert to PNG using Canvas
            if (blob.type !== 'image/png') {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                await new Promise((resolve, reject) => {
                    img.onload = resolve
                    img.onerror = reject
                    img.src = URL.createObjectURL(blob)
                })

                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                if (!ctx) throw new Error('Failed to get canvas context')

                ctx.drawImage(img, 0, 0)

                blobToCopy = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob((b) => {
                        if (b) resolve(b)
                        else reject(new Error('Canvas to Blob failed'))
                    }, 'image/png')
                })
            }

            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blobToCopy
                })
            ])
            setCopied('img')
            setTimeout(() => setCopied(null), 2000)
        } catch (error) {
            console.error('Failed to copy image:', error)
            alert('复制图片失败')
        }
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            switch (e.key) {
                case 'Escape':
                    onClose()
                    break
                case 'ArrowRight':
                    handleNext()
                    break
                case 'ArrowLeft':
                    handlePrev()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, handleNext, handlePrev])

    if (!isOpen || !currentImage) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
                    onClick={onClose}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Navigation Buttons */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev() }}
                        className="absolute left-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50 hidden md:block"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext() }}
                        className="absolute right-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50 hidden md:block"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    {/* Main Image */}
                    <div
                        className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center p-4"
                    >
                        <motion.img
                            key={currentImage.id}
                            src={currentImage.url}
                            alt={currentImage.filename}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Actions Toolbar */}
                        <div
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="text-white/70 text-sm font-medium mr-2 hidden sm:inline-block max-w-[200px] truncate">
                                {currentImage.filename}
                            </span>

                            <div className="h-4 w-px bg-white/20 hidden sm:block" />

                            <button
                                onClick={handleCopyImage}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                title="复制图片"
                            >
                                {copied === 'img' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={() => {
                                    const fullUrl = new URL(currentImage.url, window.location.origin).href
                                    window.open(fullUrl, '_blank')
                                }}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                title="在新标签页打开"
                            >
                                <Share2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => {
                                    const fullUrl = new URL(currentImage.url, window.location.origin).href
                                    copyToClipboard(fullUrl, 'url')
                                }}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors relative group"
                                title="复制链接"
                            >
                                {copied === 'url' ? <Check className="w-4 h-4 text-green-400" /> : <ExternalLink className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={() => {
                                    const fullUrl = new URL(currentImage.url, window.location.origin).href
                                    copyToClipboard(`![${currentImage.filename}](${fullUrl})`, 'md')
                                }}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                title="复制 Markdown"
                            >
                                {copied === 'md' ? <Check className="w-4 h-4 text-green-400" /> : <Code className="w-4 h-4" />}
                            </button>

                            <div className="h-4 w-px bg-white/20" />

                            <button
                                onClick={handleDelete}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                                title="删除图片"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Counter */}
                        <div className="absolute top-4 left-4 text-white/50 text-sm font-mono">
                            {currentIndex + 1} / {images.length}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
