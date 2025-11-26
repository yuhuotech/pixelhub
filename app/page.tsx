'use client'

import { useState, useEffect, useCallback } from 'react'
import GalleryGrid from '@/components/gallery-grid'
import UploadModal from '@/components/upload-modal'
import Sidebar from '@/components/sidebar'
import TopNav from '@/components/top-nav'
import PasteUploadToast from '@/components/paste-upload-toast'
import SettingsModal from '@/components/settings-modal'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // View State
  const [viewMode, setViewMode] = useState<'gallery' | 'trash' | 'date'>('gallery')
  const [selectedDate, setSelectedDate] = useState<{ year: string, month: string } | undefined>()

  // Responsive Sidebar Logic
  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Only set initial state on mount/resize if needed, but usually we want to respect user choice?
      // User request: "PC mode default expanded, H5 mode default collapsed"
      // We can enforce this on resize or just initial load.
      // Let's enforce on resize for now to match the request strictly.
      if (mobile) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }

    // Initial check
    checkScreen()

    // Resize listener
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Handle paste upload
  const handlePasteUpload = async (file: File) => {
    // Get storage type
    const configRes = await fetch('/api/config')
    const config = await configRes.json()
    const storageType = config.storageType || 'cos'

    // Get image dimensions
    let width, height
    if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      await new Promise(r => img.onload = r)
      width = img.width
      height = img.height
    }

    // Upload based on storage type
    let uploadData
    if (storageType === 'cos') {
      // COS upload logic (simplified, reuse from upload-zone)
      const COS = (await import('cos-js-sdk-v5')).default
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

      const signRes = await fetch('/api/upload/sign')
      const signData = await signRes.json()

      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const folder = `uploads/${year}${month}`
      const key = `${folder}/${Date.now()}-${file.name}`
      const ext = file.name.split('.').pop()
      const hash = Math.random().toString(36).substring(2, 14)
      const publicPath = `${folder}/${hash}.${ext}`

      await new Promise((resolve, reject) => {
        cos.uploadFile({
          Bucket: signData.bucket,
          Region: signData.region,
          Key: key,
          Body: file,
          ContentType: file.type,
        }, (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      })

      uploadData = {
        url: `${window.location.origin}/file/${publicPath}`,
        key,
        publicPath,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        width,
        height,
        storageType: 'cos'
      }
    } else {
      // For other storage types, use server-side upload
      const formData = new FormData()
      formData.append('file', file)

      const endpoint = storageType === 'gitee' ? '/api/upload/gitee' :
        storageType === 'github' ? '/api/upload/github' :
          storageType === 'oss' ? '/api/upload/oss' :
            '/api/upload/local'

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      uploadData = {
        url: data.url,
        key: data.key,
        publicPath: data.publicPath,
        filename: data.filename,
        size: data.size,
        mimeType: data.mimeType,
        width,
        height,
        storageType
      }
    }

    // Save to database
    await fetch('/api/images', {
      method: 'POST',
      body: JSON.stringify(uploadData)
    })

    // Refresh gallery
    handleUploadComplete()
  }

  const handleViewSelect = (mode: 'gallery' | 'trash' | 'date', date?: { year: string, month: string }) => {
    setViewMode(mode)
    if (date) setSelectedDate(date)
    else setSelectedDate(undefined)

    // On mobile, close sidebar after selection
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }

  // Drag and drop handlers...
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsUploadModalOpen(true)
    }
  }, [])

  return (
    <main
      className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white flex"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Sidebar
        currentView={viewMode}
        selectedDate={selectedDate}
        onSelectView={handleViewSelect}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobile={isMobile}
      />

      {/* Overlay for Mobile */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`flex-1 transition-all duration-300 ${!isMobile ? (isSidebarOpen ? 'ml-64' : 'ml-20') : 'ml-0'}`}>
        <TopNav
          onUploadClick={() => setIsUploadModalOpen(true)}
          onSearch={setSearchQuery}
          onSettingsClick={() => setIsSettingsModalOpen(true)}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isMobile={isMobile}
        />

        <div className="pt-20 px-4 md:px-8 min-h-screen">
          <GalleryGrid
            refreshTrigger={refreshTrigger}
            searchQuery={searchQuery}
            viewMode={viewMode}
            selectedDate={selectedDate}
          />
        </div>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Paste Upload Toast */}
      <PasteUploadToast onUpload={handlePasteUpload} />
    </main>
  )
}
