'use client'

import { Search, Upload, Menu, X, Settings } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { cn } from '@/lib/utils'

interface TopNavProps {
    onUploadClick: () => void
    onSearch: (query: string) => void
    onSettingsClick: () => void
    isSidebarOpen: boolean
    onToggleSidebar: () => void
    isMobile: boolean
}

export default function TopNav({ onUploadClick, onSearch, onSettingsClick, isSidebarOpen, onToggleSidebar, isMobile }: TopNavProps) {
    return (
        <div
            className={cn(
                "fixed top-0 right-0 h-16 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8 z-30 transition-all duration-300",
                !isMobile ? (isSidebarOpen ? "left-64" : "left-20") : "left-0"
            )}
        >
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
                >
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {/* Search Bar */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800/50 rounded-full px-4 py-2 w-full max-w-xs md:max-w-md border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                    <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="搜索图片..."
                        className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-200 w-full placeholder-gray-500 dark:placeholder-gray-500"
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onUploadClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20 whitespace-nowrap h-9 md:h-auto"
                >
                    <Upload className="w-4 h-4" />
                    <span className="md:hidden">上传</span>
                    <span className="hidden md:inline">上传图片</span>
                </button>

                <button
                    onClick={onSettingsClick}
                    className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="系统设置"
                >
                    <Settings className="w-5 h-5" />
                </button>

                <ThemeToggle />
            </div>
        </div>
    )
}
