'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Settings as SettingsIcon } from 'lucide-react'
import { useToast } from './toast'

interface SettingsData {
    storageType: string

    cosSecretId?: string
    cosSecretKey?: string
    cosBucket?: string
    cosRegion?: string

    ossAccessKeyId?: string
    ossAccessKeySecret?: string
    ossBucket?: string
    ossRegion?: string
    ossEndpoint?: string

    githubAccessToken?: string
    githubOwner?: string
    githubRepo?: string
    githubBranch?: string

    giteeAccessToken?: string
    giteeOwner?: string
    giteeRepo?: string
    giteeBranch?: string

    localStoragePath?: string
}

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [settings, setSettings] = useState<SettingsData>({
        storageType: 'local'
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (isOpen) {
            loadSettings()

            // Handle ESC key
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose()
                }
            }

            window.addEventListener('keydown', handleKeyDown)
            return () => window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/settings')
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                toast('设置保存成功！', 'success')
                onClose()
            } else {
                throw new Error('保存失败')
            }
        } catch (error) {
            toast('保存失败，请重试', 'error')
        } finally {
            setSaving(false)
        }
    }

    const updateField = (field: keyof SettingsData, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }))
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                />

                {/* Modal */}
                <div className="absolute inset-0 flex items-center justify-center p-4" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="border-b border-gray-200 dark:border-gray-800 px-6 md:px-8 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <SettingsIcon className="w-6 h-6 text-blue-500" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">系统设置</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-gray-500">加载中...</div>
                                </div>
                            ) : (
                                <div className="space-y-4 max-w-2xl">
                                    {/* General Settings */}
                                    <Section title="基础设置">
                                        <Field label="存储类型" description="选择图片存储后端">
                                            <select
                                                value={settings.storageType}
                                                onChange={(e) => updateField('storageType', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            >
                                                <option value="local">本地存储</option>
                                                <option value="cos">腾讯云 COS</option>
                                                <option value="oss">阿里云 OSS</option>
                                                <option value="github">GitHub</option>
                                                <option value="gitee">Gitee</option>
                                            </select>
                                        </Field>
                                    </Section>

                                    {/* Local Storage */}
                                    {settings.storageType === 'local' && (
                                        <Section title="本地存储配置">
                                            <Field label="存储路径" description="图片存储的本地路径">
                                                <input
                                                    type="text"
                                                    value={settings.localStoragePath || './uploads'}
                                                    onChange={(e) => updateField('localStoragePath', e.target.value)}
                                                    placeholder="./uploads"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                        </Section>
                                    )}

                                    {/* COS Settings */}
                                    {settings.storageType === 'cos' && (
                                        <Section title="腾讯云 COS 配置">
                                            <Field label="Secret ID">
                                                <input
                                                    type="text"
                                                    value={settings.cosSecretId || ''}
                                                    onChange={(e) => updateField('cosSecretId', e.target.value)}
                                                    placeholder="输入 Secret ID"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                            <Field label="Secret Key">
                                                <input
                                                    type="text"
                                                    value={settings.cosSecretKey || ''}
                                                    onChange={(e) => updateField('cosSecretKey', e.target.value)}
                                                    placeholder="输入 Secret Key"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    autoComplete="off"
                                                    name="cos_secret_code"
                                                />
                                            </Field>
                                            <Field label="Bucket 名称">
                                                <input
                                                    type="text"
                                                    value={settings.cosBucket || ''}
                                                    onChange={(e) => updateField('cosBucket', e.target.value)}
                                                    placeholder="your-bucket-name"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                            <Field label="地域">
                                                <input
                                                    type="text"
                                                    value={settings.cosRegion || ''}
                                                    onChange={(e) => updateField('cosRegion', e.target.value)}
                                                    placeholder="ap-guangzhou"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                        </Section>
                                    )}

                                    {/* OSS Settings */}
                                    {settings.storageType === 'oss' && (
                                        <Section title="阿里云 OSS 配置">
                                            <Field label="Access Key ID">
                                                <input
                                                    type="text"
                                                    value={settings.ossAccessKeyId || ''}
                                                    onChange={(e) => updateField('ossAccessKeyId', e.target.value)}
                                                    placeholder="输入 Access Key ID"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                            <Field label="Access Secret">
                                                <input
                                                    type="text"
                                                    value={settings.ossAccessKeySecret || ''}
                                                    onChange={(e) => updateField('ossAccessKeySecret', e.target.value)}
                                                    placeholder="输入 Access Key Secret"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    autoComplete="off"
                                                    name="oss_secret_code"
                                                />
                                            </Field>
                                            <Field label="Bucket 名称">
                                                <input
                                                    type="text"
                                                    value={settings.ossBucket || ''}
                                                    onChange={(e) => updateField('ossBucket', e.target.value)}
                                                    placeholder="your-bucket-name"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                            <Field label="地域">
                                                <input
                                                    type="text"
                                                    value={settings.ossRegion || ''}
                                                    onChange={(e) => updateField('ossRegion', e.target.value)}
                                                    placeholder="oss-cn-hangzhou"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                            <Field label="Endpoint">
                                                <input
                                                    type="text"
                                                    value={settings.ossEndpoint || ''}
                                                    onChange={(e) => updateField('ossEndpoint', e.target.value)}
                                                    placeholder="oss-cn-hangzhou.aliyuncs.com"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                        </Section>
                                    )}

                                    {/* GitHub Settings */}
                                    {settings.storageType === 'github' && (
                                        <Section title="GitHub 配置">
                                            <Field label="Access Token">
                                                <input
                                                    type="text"
                                                    value={settings.githubAccessToken || ''}
                                                    onChange={(e) => updateField('githubAccessToken', e.target.value)}
                                                    placeholder="ghp_your_token"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    autoComplete="off"
                                                    name="github_auth_code"
                                                />
                                            </Field>
                                            <Field label="用户名">
                                                <input
                                                    type="text"
                                                    value={settings.githubOwner || ''}
                                                    onChange={(e) => updateField('githubOwner', e.target.value)}
                                                    placeholder="your_username"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    name="github_user"
                                                />
                                            </Field>
                                            <Field label="仓库名">
                                                <input
                                                    type="text"
                                                    value={settings.githubRepo || ''}
                                                    onChange={(e) => updateField('githubRepo', e.target.value)}
                                                    placeholder="your_repo_name"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    name="github_repo"
                                                />
                                            </Field>
                                            <Field label="分支">
                                                <input
                                                    type="text"
                                                    value={settings.githubBranch || 'main'}
                                                    onChange={(e) => updateField('githubBranch', e.target.value)}
                                                    placeholder="main"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </Field>
                                        </Section>
                                    )}

                                    {/* Gitee Settings */}
                                    {settings.storageType === 'gitee' && (
                                        <Section title="Gitee 配置">
                                            <Field label="Access Token">
                                                <input
                                                    type="text"
                                                    value={settings.giteeAccessToken || ''}
                                                    onChange={(e) => updateField('giteeAccessToken', e.target.value)}
                                                    placeholder="your_token"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    autoComplete="off"
                                                    name="gitee_auth_code"
                                                />
                                            </Field>
                                            <Field label="用户名">
                                                <input
                                                    type="text"
                                                    value={settings.giteeOwner || ''}
                                                    onChange={(e) => updateField('giteeOwner', e.target.value)}
                                                    placeholder="your_username"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    name="gitee_user"
                                                />
                                            </Field>
                                            <Field label="仓库名">
                                                <input
                                                    type="text"
                                                    value={settings.giteeRepo || ''}
                                                    onChange={(e) => updateField('giteeRepo', e.target.value)}
                                                    placeholder="your_repo_name"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    name="gitee_repo"
                                                />
                                            </Field>
                                            <Field label="分支">
                                                <input
                                                    type="text"
                                                    value={settings.giteeBranch || 'master'}
                                                    onChange={(e) => updateField('giteeBranch', e.target.value)}
                                                    placeholder="master"
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    name="gitee_branch"
                                                />
                                            </Field>
                                        </Section>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 dark:border-gray-800 px-6 md:px-8 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                            >
                                关闭
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? '保存中...' : '保存设置'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2.5">{title}</h3>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    )
}

function Field({ label, description, children }: { label: string, description?: string, children: React.ReactNode }) {
    return (
        <div>
            {description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{description}</p>
            )}
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit flex-shrink-0 w-24">
                    {label}
                </label>
                <div className="flex-1 w-full">
                    {children}
                </div>
            </div>
        </div>
    )
}
