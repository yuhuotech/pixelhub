import { prisma } from './prisma'

export interface SettingsConfig {
    // General
    storageType: 'cos' | 'oss' | 'gitee' | 'github' | 'local'

    // COS
    cosSecretId?: string
    cosSecretKey?: string
    cosBucket?: string
    cosRegion?: string

    // OSS
    ossAccessKeyId?: string
    ossAccessKeySecret?: string
    ossBucket?: string
    ossRegion?: string
    ossEndpoint?: string

    // GitHub
    githubAccessToken?: string
    githubOwner?: string
    githubRepo?: string
    githubBranch?: string

    // Gitee
    giteeAccessToken?: string
    giteeOwner?: string
    giteeRepo?: string
    giteeBranch?: string

    // Local
    localStoragePath?: string
}

/**
 * Get a setting value from database, fallback to environment variable
 */
export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
    try {
        const setting = await prisma.settings.findUnique({
            where: { key }
        })

        if (setting) {
            return setting.value
        }

        // Fallback to environment variable
        const envKey = key.toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '')
        return process.env[envKey] || defaultValue
    } catch {
        return process.env[key.toUpperCase()] || defaultValue
    }
}

/**
 * Set a setting value in database
 */
export async function setSetting(key: string, value: string, category: string = 'general'): Promise<void> {
    await prisma.settings.upsert({
        where: { key },
        update: { value, category },
        create: { key, value, category }
    })
}

/**
 * Get all settings as a config object
 */
export async function getAllSettings(): Promise<SettingsConfig> {
    const beforeQuery = Date.now()
    const settings = await prisma.settings.findMany()
    const afterQuery = Date.now()
    console.log(`[Settings] prisma.settings.findMany() took ${afterQuery - beforeQuery}ms, found ${settings.length} settings`)

    const config: any = {
        storageType: 'local' // default
    }

    settings.forEach(setting => {
        config[setting.key] = setting.value
    })

    // Fallback to env variables if not in database
    config.storageType = config.storageType || process.env.STORAGE_TYPE || 'local'

    config.cosSecretId = config.cosSecretId || process.env.COS_SECRET_ID
    config.cosSecretKey = config.cosSecretKey || process.env.COS_SECRET_KEY
    config.cosBucket = config.cosBucket || process.env.COS_BUCKET
    config.cosRegion = config.cosRegion || process.env.COS_REGION

    config.ossAccessKeyId = config.ossAccessKeyId || process.env.OSS_ACCESS_KEY_ID
    config.ossAccessKeySecret = config.ossAccessKeySecret || process.env.OSS_ACCESS_KEY_SECRET
    config.ossBucket = config.ossBucket || process.env.OSS_BUCKET
    config.ossRegion = config.ossRegion || process.env.OSS_REGION
    config.ossEndpoint = config.ossEndpoint || process.env.OSS_ENDPOINT

    config.githubAccessToken = config.githubAccessToken || process.env.GITHUB_ACCESS_TOKEN
    config.githubOwner = config.githubOwner || process.env.GITHUB_OWNER
    config.githubRepo = config.githubRepo || process.env.GITHUB_REPO
    config.githubBranch = config.githubBranch || process.env.GITHUB_BRANCH

    config.giteeAccessToken = config.giteeAccessToken || process.env.GITEE_ACCESS_TOKEN
    config.giteeOwner = config.giteeOwner || process.env.GITEE_OWNER
    config.giteeRepo = config.giteeRepo || process.env.GITEE_REPO
    config.giteeBranch = config.giteeBranch || process.env.GITEE_BRANCH

    config.localStoragePath = config.localStoragePath || process.env.LOCAL_STORAGE_PATH || './uploads'

    console.log(`[Settings] getAllSettings() returning config with ${Object.keys(config).length} keys`)
    return config
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(settings: Partial<SettingsConfig>): Promise<void> {
    const updates = Object.entries(settings).map(([key, value]) => {
        if (value === undefined || value === null) return null

        let category = 'general'
        if (key.startsWith('cos')) category = 'storage'
        else if (key.startsWith('oss')) category = 'storage'
        else if (key.startsWith('github')) category = 'storage'
        else if (key.startsWith('gitee')) category = 'storage'
        else if (key.startsWith('local')) category = 'storage'
        else if (key === 'storageType') category = 'storage'

        return setSetting(key, String(value), category)
    }).filter(Boolean)

    await Promise.all(updates)
}
