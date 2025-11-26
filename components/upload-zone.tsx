'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, X, Check, Loader2, FileImage } from 'lucide-react'
import COS from 'cos-js-sdk-v5'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function UploadZone({ onUploadComplete }: { onUploadComplete: () => void }) {
    const [isDragging, setIsDragging] = useState(false)
    const [storageType, setStorageType] = useState<'cos' | 'gitee' | 'github' | 'oss' | 'local'>('cos')
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentFile, setCurrentFile] = useState<string>('')
    const [urlInput, setUrlInput] = useState('')

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                if (data.storageType) setStorageType(data.storageType)
            })
            .catch(console.error)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length === 0) return

        await uploadFiles(files)
    }, [])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadFiles(Array.from(e.target.files))
        }
    }

    const handleUrlUpload = async () => {
        if (!urlInput.trim()) return

        setUploading(true)
        setProgress(0)
        setCurrentFile('正在下载网络图片...')

        try {
            // Call backend API to download and upload
            const res = await fetch('/api/upload/url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: urlInput })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'URL upload failed')
            }

            setProgress(100)
            setUrlInput('')
            onUploadComplete()
        } catch (err) {
            console.error(err)
            alert('URL上传失败: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setUploading(false)
            setProgress(0)
            setCurrentFile('')
        }
    }

    const uploadFiles = async (files: File[]) => {
        setUploading(true)
        setProgress(0)

        try {
            if (storageType === 'cos') {
                // Initialize COS with STS
                const cos = new COS({
                    getAuthorization: async (options, callback) => {
                        const res = await fetch('/api/upload/sign')
                        const data = await res.json()
                        callback({
                            TmpSecretId: data.credentials.tmpSecretId,
                            TmpSecretKey: data.credentials.tmpSecretKey,
                            XCosSecurityToken: data.credentials.sessionToken,
                            StartTime: data.startTime,
                            ExpiredTime: data.expiredTime,
                        })
                    }
                })

                const configRes = await fetch('/api/upload/sign')
                if (!configRes.ok) throw new Error('Failed to get upload signature')
                const configData = await configRes.json()
                const bucket = configData.bucket
                const region = configData.region

                if (!bucket || !region) throw new Error('Missing bucket or region configuration')

                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    setCurrentFile(file.name)

                    // Generate YYYYMM folder
                    const date = new Date()
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const folder = `uploads/${year}${month}`

                    // Generate COS Key
                    const key = `${folder}/${Date.now()}-${file.name}`

                    // Generate Public Path (hashed filename)
                    const ext = file.name.split('.').pop()
                    const hash = Math.random().toString(36).substring(2, 14)
                    const publicPath = `${folder}/${hash}.${ext}`

                    await new Promise((resolve, reject) => {
                        cos.uploadFile({
                            Bucket: bucket,
                            Region: region,
                            Key: key,
                            Body: file,
                            ContentType: file.type,
                            onProgress: (info) => {
                                setProgress(info.percent * 100)
                            }
                        }, (err, data) => {
                            if (err) reject(err)
                            else resolve(data)
                        })
                    })

                    // Save metadata
                    const url = `${window.location.origin}/file/${publicPath}`

                    let width, height
                    if (file.type.startsWith('image/')) {
                        const img = new Image()
                        img.src = URL.createObjectURL(file)
                        await new Promise(r => img.onload = r)
                        width = img.width
                        height = img.height
                    }

                    await fetch('/api/images', {
                        method: 'POST',
                        body: JSON.stringify({
                            url,
                            key,
                            publicPath,
                            filename: file.name,
                            size: file.size,
                            mimeType: file.type,
                            width,
                            height,
                            storageType: 'cos'
                        })
                    })
                }
            } else if (storageType === 'gitee') {
                // Gitee Upload
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    setCurrentFile(file.name)
                    setProgress(10) // Fake progress start

                    const formData = new FormData()
                    formData.append('file', file)

                    // Get dimensions first
                    let width, height
                    if (file.type.startsWith('image/')) {
                        const img = new Image()
                        img.src = URL.createObjectURL(file)
                        await new Promise(r => img.onload = r)
                        width = img.width
                        height = img.height
                    }
                    setProgress(30)

                    const res = await fetch('/api/upload/gitee', {
                        method: 'POST',
                        body: formData
                    })

                    if (!res.ok) {
                        const err = await res.json()
                        throw new Error(err.error || 'Gitee upload failed')
                    }

                    const data = await res.json()
                    setProgress(80)

                    // Save metadata
                    await fetch('/api/images', {
                        method: 'POST',
                        body: JSON.stringify({
                            url: data.url, // This is now the proxy URL from the API
                            key: data.key,
                            publicPath: data.publicPath,
                            filename: data.filename,
                            size: data.size,
                            mimeType: data.mimeType,
                            width,
                            height,
                            storageType: 'gitee'
                        })
                    })
                    setProgress(100)
                }
            } else if (storageType === 'github') {
                // GitHub Upload
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    setCurrentFile(file.name)
                    setProgress(10) // Fake progress start

                    const formData = new FormData()
                    formData.append('file', file)

                    // Get dimensions first
                    let width, height
                    if (file.type.startsWith('image/')) {
                        const img = new Image()
                        img.src = URL.createObjectURL(file)
                        await new Promise(r => img.onload = r)
                        width = img.width
                        height = img.height
                    }
                    setProgress(30)

                    const res = await fetch('/api/upload/github', {
                        method: 'POST',
                        body: formData
                    })

                    if (!res.ok) {
                        const err = await res.json()
                        throw new Error(err.error || 'GitHub upload failed')
                    }

                    const data = await res.json()
                    setProgress(80)

                    // Save metadata
                    await fetch('/api/images', {
                        method: 'POST',
                        body: JSON.stringify({
                            url: data.url, // This is now the proxy URL from the API
                            key: data.key,
                            publicPath: data.publicPath,
                            filename: data.filename,
                            size: data.size,
                            mimeType: data.mimeType,
                            width,
                            height,
                            storageType: 'github'
                        })
                    })
                    setProgress(100)
                }
            } else if (storageType === 'oss') {
                // OSS Upload (server-side)
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    setCurrentFile(file.name)
                    setProgress(10)

                    const formData = new FormData()
                    formData.append('file', file)

                    // Get dimensions first
                    let width, height
                    if (file.type.startsWith('image/')) {
                        const img = new Image()
                        img.src = URL.createObjectURL(file)
                        await new Promise(r => img.onload = r)
                        width = img.width
                        height = img.height
                    }
                    setProgress(30)

                    const res = await fetch('/api/upload/oss', {
                        method: 'POST',
                        body: formData
                    })

                    if (!res.ok) {
                        const err = await res.json()
                        throw new Error(err.error || 'OSS upload failed')
                    }

                    const data = await res.json()
                    setProgress(80)

                    // Save metadata
                    await fetch('/api/images', {
                        method: 'POST',
                        body: JSON.stringify({
                            url: data.url,
                            key: data.key,
                            publicPath: data.publicPath,
                            filename: data.filename,
                            size: data.size,
                            mimeType: data.mimeType,
                            width,
                            height,
                            storageType: 'oss'
                        })
                    })
                    setProgress(100)
                }
            } else if (storageType === 'local') {
                // Local Storage Upload
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    setCurrentFile(file.name)
                    setProgress(10)

                    const formData = new FormData()
                    formData.append('file', file)

                    // Get dimensions first
                    let width, height
                    if (file.type.startsWith('image/')) {
                        const img = new Image()
                        img.src = URL.createObjectURL(file)
                        await new Promise(r => img.onload = r)
                        width = img.width
                        height = img.height
                    }
                    setProgress(30)

                    const res = await fetch('/api/upload/local', {
                        method: 'POST',
                        body: formData
                    })

                    if (!res.ok) {
                        const err = await res.json()
                        throw new Error(err.error || 'Local storage upload failed')
                    }

                    const data = await res.json()
                    setProgress(80)

                    // Save metadata
                    await fetch('/api/images', {
                        method: 'POST',
                        body: JSON.stringify({
                            url: data.url,
                            key: data.key,
                            publicPath: data.publicPath,
                            filename: data.filename,
                            size: data.size,
                            mimeType: data.mimeType,
                            width,
                            height,
                            storageType: 'local'
                        })
                    })
                    setProgress(100)
                }
            }

            onUploadComplete()
        } catch (err) {
            console.error(err)
            alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setUploading(false)
            setProgress(0)
            setCurrentFile('')
        }
    }

    return (
        <div className="w-full max-w-3xl mx-auto mb-12">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                    "hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                    isDragging ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.02]" : "border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50",
                    uploading ? "pointer-events-none opacity-80" : ""
                )}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFileSelect}
                />

                <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
                    <div className={cn(
                        "p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 mb-2 transition-transform duration-300",
                        isDragging ? "scale-110" : ""
                    )}>
                        <Upload className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                            {isDragging ? "释放以上传图片" : "点击或拖拽上传图片"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            支持 JPG, PNG, GIF, WEBP, SVG
                        </p>
                    </div>
                </div>

                {/* Progress Overlay */}
                {uploading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 z-10">
                        <div className="w-full max-w-xs space-y-4">
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-blue-600 dark:text-blue-400">
                                    {currentFile ? `正在上传 ${currentFile}...` : '准备中...'}
                                </span>
                                <span className="text-gray-500">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* URL Upload Section */}
            <div className="mt-6 p-6 bg-white/50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">从网络地址上传</h3>
                </div>
                <div className="flex gap-2">
                    <input
                        type="url"
                        placeholder="输入图片 URL 地址..."
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && urlInput.trim()) {
                                handleUrlUpload()
                            }
                        }}
                        disabled={uploading}
                    />
                    <button
                        onClick={handleUrlUpload}
                        disabled={uploading || !urlInput.trim()}
                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    >
                        上传
                    </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    支持公开访问的图片链接
                </p>
            </div>
        </div>
    )
}
