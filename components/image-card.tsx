'use client'

import { useState } from 'react'
import { Check, ExternalLink, Code, Copy, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ImageCardProps {
    image: {
        id: string
        url: string
        filename: string
        width?: number | null
        height?: number | null
    }
    onDelete?: (id: string) => void
}

export default function ImageCard({ image, onDelete }: ImageCardProps) {
    const [copied, setCopied] = useState<string | null>(null)

    const copyToClipboard = async (text: string, type: string) => {
        await navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[4/3] cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
        >
            <img
                src={image.url}
                alt={image.filename}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100">
                <div className="flex justify-between items-end">
                    <div className="text-white truncate flex-1 mr-4">
                        <p className="font-medium truncate">{image.filename}</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                const fullUrl = new URL(image.url, window.location.origin).href
                                copyToClipboard(fullUrl, 'url')
                            }}
                            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-colors"
                            title="复制链接"
                        >
                            {copied === 'url' ? <Check className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                const fullUrl = new URL(image.url, window.location.origin).href
                                copyToClipboard(`![${image.filename}](${fullUrl})`, 'md')
                            }}
                            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-colors"
                            title="复制 Markdown"
                        >
                            {copied === 'md' ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('确定要删除这张图片吗？')) {
                                onDelete(image.id)
                            }
                        }}
                        className="p-2 bg-red-500/80 backdrop-blur-md rounded-full hover:bg-red-600 text-white transition-colors"
                        title="删除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </motion.div >
    )
}
