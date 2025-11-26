'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Lightbox from './lightbox'
import { Loader2, Check, RotateCcw, Trash2 } from 'lucide-react'

interface GalleryGridProps {
    refreshTrigger: number
    searchQuery?: string
    viewMode: 'gallery' | 'trash' | 'date'
    selectedDate?: { year: string, month: string }
}

export default function GalleryGrid({ refreshTrigger, searchQuery, viewMode, selectedDate }: GalleryGridProps) {
    const [images, setImages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [nextCursor, setNextCursor] = useState<string | null>(null)

    // Copy Feedback State
    const [copiedState, setCopiedState] = useState<{ id: string, type: 'url' | 'md' | 'img' } | null>(null)

    // Lightbox State
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [initialIndex, setInitialIndex] = useState(0)
    const [currentImage, setCurrentImage] = useState<any>(null)
    const observer = useRef<IntersectionObserver | null>(null)

    // Debounce search query
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchImages = useCallback(async (cursor?: string | null, isRefresh = false) => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ limit: '20' })
            if (cursor) params.append('cursor', cursor)
            if (debouncedQuery) params.append('q', debouncedQuery)

            if (viewMode === 'trash') {
                params.append('trash', 'true')
            } else if (viewMode === 'date' && selectedDate) {
                params.append('year', selectedDate.year)
                params.append('month', selectedDate.month)
            }

            const res = await fetch(`/api/images?${params.toString()}`)
            const data = await res.json()

            if (isRefresh) {
                setImages(data.images)
            } else {
                setImages(prev => [...prev, ...data.images])
            }
            setNextCursor(data.nextCursor)
        } catch (error) {
            console.error('Failed to fetch images:', error)
        } finally {
            setLoading(false)
        }
    }, [debouncedQuery, viewMode, selectedDate])

    // Reset and fetch when refreshTrigger, debouncedQuery, or viewMode changes
    useEffect(() => {
        setImages([])
        setNextCursor(null)
        fetchImages(null, true)
    }, [refreshTrigger, debouncedQuery, viewMode, selectedDate, fetchImages])

    const handleDelete = async (id: string, force = false) => {
        try {
            const params = force ? '?force=true' : ''
            const res = await fetch(`/api/images/${id}${params}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                // Optimistic update
                setImages(prev => prev.filter(img => img.id !== id))
            } else {
                alert('删除失败')
            }
        } catch (error) {
            console.error('Error deleting image:', error)
            alert('删除出错')
        }
    }

    const handleRestore = async (id: string) => {
        try {
            const res = await fetch(`/api/images/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ restore: true })
            })

            if (res.ok) {
                setImages(prev => prev.filter(img => img.id !== id))
            } else {
                alert('还原失败')
            }
        } catch (error) {
            console.error('Error restoring image:', error)
            alert('还原出错')
        }
    }

    const handleCopy = (e: React.MouseEvent, id: string, text: string, type: 'url' | 'md') => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopiedState({ id, type })
        setTimeout(() => setCopiedState(null), 2000)
    }

    const handleCopyImage = async (e: React.MouseEvent, id: string, url: string) => {
        e.stopPropagation()
        try {
            const response = await fetch(url)
            const blob = await response.blob()

            let blobToCopy = blob

            // If not PNG, convert to PNG using Canvas
            // Clipboard API mainly supports image/png
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
            setCopiedState({ id, type: 'img' })
            setTimeout(() => setCopiedState(null), 2000)
        } catch (error) {
            console.error('Failed to copy image:', error)
            alert('复制图片失败，请确保使用 HTTPS 或本地环境')
        }
    }

    const loadMore = () => {
        if (nextCursor) {
            fetchImages(nextCursor)
        }
    }

    // Group by Date (YYYY年MM月DD日 Weekday)
    const groupedImages = images.reduce((acc, image) => {
        const date = new Date(image.createdAt)
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        }
        const key = date.toLocaleDateString('zh-CN', options)
        if (!acc[key]) acc[key] = []
        acc[key].push(image)
        return acc
    }, {} as Record<string, any[]>)

    if (loading && images.length === 0) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (images.length === 0) {
        return (
            <div className="text-center py-20 text-gray-500">
                暂无图片，快去上传吧！
            </div>
        )
    }

    // Flatten images for lightbox navigation
    const flatImages = Object.values(groupedImages).flat()

    const openLightbox = (image: any) => {
        const index = flatImages.findIndex((img: any) => img.id === image.id)
        setInitialIndex(index)
        setLightboxOpen(true)
    }

    return (
        <div className="space-y-8 pb-20">
            {Object.entries(groupedImages).map(([date, groupImages]) => (
                <div key={date} className="space-y-4">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-500 sticky top-16 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm py-3 px-0.5 z-10 transition-colors duration-300 border-b border-gray-200 dark:border-gray-800 w-full">
                        {date}
                    </h2>
                    {/* Justified Layout Simulation using Flexbox */}
                    <div className="flex flex-wrap gap-4">
                        {(groupImages as any[]).map((img) => {
                            // Calculate aspect ratio based on width/height or default to 4/3
                            const aspectRatio = (img.width && img.height) ? img.width / img.height : 4 / 3
                            // Base height for rows
                            const height = 160
                            const flexGrow = aspectRatio * 100

                            return (
                                <div
                                    key={img.id}
                                    onClick={() => openLightbox(img)}
                                    className="relative group overflow-hidden rounded-lg cursor-pointer bg-transparent transition-colors duration-300"
                                    style={{
                                        height: `${height}px`,
                                        flexGrow: flexGrow,
                                        flexBasis: `${height * aspectRatio}px`,
                                        maxWidth: '100%' // Prevent single items from stretching too much
                                    }}
                                >
                                    <img
                                        src={img.url}
                                        alt={img.filename}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100">
                                        <div className="flex justify-between items-end w-full">
                                            <div className="text-white truncate flex-1 mr-2 min-w-0">
                                                <p className="font-medium text-sm truncate">{img.filename}</p>
                                            </div>

                                            {viewMode === 'trash' ? (
                                                <div className="flex gap-1.5 shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleRestore(img.id)
                                                        }}
                                                        className="p-1.5 bg-green-500/80 backdrop-blur-md rounded-full hover:bg-green-600 text-white transition-colors"
                                                        title="还原"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (confirm('确定要彻底删除吗？无法恢复！')) {
                                                                handleDelete(img.id, true)
                                                            }
                                                        }}
                                                        className="p-1.5 bg-red-500/80 backdrop-blur-md rounded-full hover:bg-red-600 text-white transition-colors"
                                                        title="彻底删除"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1.5 shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            const fullUrl = new URL(img.url, window.location.origin).href
                                                            handleCopy(e, img.id, fullUrl, 'url')
                                                        }}
                                                        className="p-1.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-colors"
                                                        title="复制链接"
                                                    >
                                                        {copiedState?.id === img.id && copiedState?.type === 'url' ? (
                                                            <Check className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            const fullUrl = new URL(img.url, window.location.origin).href
                                                            handleCopy(e, img.id, `![${img.filename}](${fullUrl})`, 'md')
                                                        }}
                                                        className="p-1.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-colors"
                                                        title="复制 Markdown"
                                                    >
                                                        {copiedState?.id === img.id && copiedState?.type === 'md' ? (
                                                            <Check className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Top Right Actions */}
                                    {viewMode !== 'trash' && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex gap-1.5">
                                            <button
                                                onClick={(e) => handleCopyImage(e, img.id, img.url)}
                                                className="p-1.5 bg-black/20 backdrop-blur-md rounded-full hover:bg-black/40 text-white transition-colors"
                                                title="复制图片"
                                            >
                                                {copiedState?.id === img.id && copiedState?.type === 'img' ? (
                                                    <Check className="w-3.5 h-3.5" />
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (confirm('确定要删除这张图片吗？')) {
                                                        handleDelete(img.id)
                                                    }
                                                }}
                                                className="p-1.5 bg-red-500/80 backdrop-blur-md rounded-full hover:bg-red-600 text-white transition-colors"
                                                title="删除"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {/* Spacer to prevent last row from stretching too wide if few items */}
                        <div style={{ flexGrow: 999999999 }}></div>
                    </div>
                </div>
            ))}

            {loading && images.length > 0 && (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            )}

            {!loading && nextCursor && (
                <div className="flex justify-center py-8">
                    <button
                        onClick={loadMore}
                        className="px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        加载更多
                    </button>
                </div>
            )}

            <Lightbox
                images={flatImages}
                initialIndex={initialIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                onDelete={handleDelete}
            />
        </div>
    )
}
