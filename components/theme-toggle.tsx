"use client"

import * as React from "react"
import { Moon, Sun, Laptop, ChevronDown } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const [isOpen, setIsOpen] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        )
    }

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun className="w-4 h-4 text-yellow-500" />
            case 'dark':
                return <Moon className="w-4 h-4 text-purple-500" />
            default:
                return <Laptop className="w-4 h-4 text-blue-500" />
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="选择主题"
            >
                {getIcon()}
                <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                        <button
                            onClick={() => {
                                setTheme("light")
                                setIsOpen(false)
                            }}
                            className={cn(
                                "w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors rounded-t-lg",
                                theme === "light"
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <Sun className="w-4 h-4" />
                            浅色模式
                        </button>
                        <button
                            onClick={() => {
                                setTheme("system")
                                setIsOpen(false)
                            }}
                            className={cn(
                                "w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors",
                                theme === "system"
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <Laptop className="w-4 h-4" />
                            跟随系统
                        </button>
                        <button
                            onClick={() => {
                                setTheme("dark")
                                setIsOpen(false)
                            }}
                            className={cn(
                                "w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors rounded-b-lg",
                                theme === "dark"
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <Moon className="w-4 h-4" />
                            深色模式
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
