'use client'

import { Image as ImageIcon, RotateCcw, ChevronRight, ChevronDown, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface SidebarProps {
    currentView: 'gallery' | 'trash' | 'date'
    selectedDate?: { year: string, month: string }
    onSelectView: (view: 'gallery' | 'trash' | 'date', date?: { year: string, month: string }) => void
    isOpen: boolean
    onClose: () => void
    onToggle: () => void
    isMobile: boolean
}

export default function Sidebar({ currentView, selectedDate, onSelectView, isOpen, onClose, onToggle, isMobile }: SidebarProps) {
    const [stats, setStats] = useState<Record<string, Record<string, number>>>({})
    const [expandedYears, setExpandedYears] = useState<string[]>([])

    useEffect(() => {
        fetch('/api/images/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data)
                // Auto expand most recent year
                const years = Object.keys(data).sort((a, b) => Number(b) - Number(a))
                if (years.length > 0) setExpandedYears([years[0]])
            })
            .catch(console.error)
    }, [])

    const toggleYear = (year: string) => {
        setExpandedYears(prev =>
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        )
    }

    // Determine if we are in "mini" mode (PC and closed)
    const isMini = !isMobile && !isOpen

    return (
        <div
            className={cn(
                "fixed left-0 top-0 h-screen bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 flex flex-col border-r border-gray-200 dark:border-gray-800 overflow-y-auto transition-all duration-300 z-50",
                isMobile
                    ? (isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full")
                    : (isOpen ? "w-64 translate-x-0" : "w-20 translate-x-0")
            )}
        >
            <div className={cn("p-6 flex items-center gap-3 relative", isMini && "justify-center px-2")}>
                <img src="/ph_logo_160.png" alt="PixelHub Logo" className="w-8 h-8 rounded-lg shrink-0" />
                {!isMini && (
                    <>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap flex-1">PixelHub</h1>
                        {!isMobile && (
                            <button
                                onClick={onToggle}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                title="收起侧边栏"
                            >
                                <PanelLeftClose className="w-5 h-5" />
                            </button>
                        )}
                    </>
                )}
            </div>

            <div className="px-3 py-2 space-y-1">
                <button
                    onClick={() => onSelectView('gallery')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isMini && "justify-center px-2",
                        currentView === 'gallery'
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                    title={isMini ? "图库" : undefined}
                >
                    <ImageIcon className="w-5 h-5 shrink-0" />
                    {!isMini && <span>图库</span>}
                </button>

                {/* Date Tree - Hide in Mini Mode */}
                {!isMini && (
                    <div className="pt-2 pb-2">
                        {Object.entries(stats)
                            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
                            .map(([year, months]) => (
                                <div key={year}>
                                    <button
                                        onClick={() => toggleYear(year)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {expandedYears.includes(year) ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                        {year}年
                                    </button>

                                    {expandedYears.includes(year) && (
                                        <div className="ml-4 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-2 my-1">
                                            {Object.entries(months)
                                                .sort(([monthA], [monthB]) => Number(monthB) - Number(monthA))
                                                .map(([month, count]) => (
                                                    <button
                                                        key={month}
                                                        onClick={() => onSelectView('date', { year, month })}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-4 py-1.5 rounded-md text-sm transition-colors",
                                                            currentView === 'date' && selectedDate?.year === year && selectedDate?.month === month
                                                                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                                                        )}
                                                    >
                                                        <span>{month}月</span>
                                                        <span className="text-xs opacity-50">{count}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}

                <button
                    onClick={() => onSelectView('trash')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mt-4",
                        isMini && "justify-center px-2",
                        currentView === 'trash'
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                    title={isMini ? "回收站" : undefined}
                >
                    <Trash2 className="w-5 h-5 shrink-0" />
                    {!isMini && <span>回收站</span>}
                </button>
            </div>

            <div className="mt-auto p-4 flex flex-col items-center gap-4">
                {/* Expand Button for Mini Mode */}
                {isMini && (
                    <button
                        onClick={onToggle}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="展开侧边栏"
                    >
                        <PanelLeftOpen className="w-5 h-5" />
                    </button>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-600 text-center whitespace-nowrap overflow-hidden">
                    {!isMini && "PixelHub v1.0"}
                </div>
            </div>
        </div>
    )
}
