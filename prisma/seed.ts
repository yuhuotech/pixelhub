import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin'

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
    },
    create: {
      username,
      password: hashedPassword,
    },
  })

  console.log('Admin user:', { user })

  // Initialize settings from environment variables
  const settingsToCreate = [
    // General
    { key: 'storageType', value: process.env.STORAGE_TYPE || 'local', category: 'storage' },

    // COS
    { key: 'cosSecretId', value: process.env.COS_SECRET_ID || '', category: 'storage' },
    { key: 'cosSecretKey', value: process.env.COS_SECRET_KEY || '', category: 'storage' },
    { key: 'cosBucket', value: process.env.COS_BUCKET || '', category: 'storage' },
    { key: 'cosRegion', value: process.env.COS_REGION || 'ap-guangzhou', category: 'storage' },

    // OSS
    { key: 'ossAccessKeyId', value: process.env.OSS_ACCESS_KEY_ID || '', category: 'storage' },
    { key: 'ossAccessKeySecret', value: process.env.OSS_ACCESS_KEY_SECRET || '', category: 'storage' },
    { key: 'ossBucket', value: process.env.OSS_BUCKET || '', category: 'storage' },
    { key: 'ossRegion', value: process.env.OSS_REGION || 'oss-cn-hangzhou', category: 'storage' },
    { key: 'ossEndpoint', value: process.env.OSS_ENDPOINT || 'oss-cn-hangzhou.aliyuncs.com', category: 'storage' },

    // GitHub
    { key: 'githubAccessToken', value: process.env.GITHUB_ACCESS_TOKEN || '', category: 'storage' },
    { key: 'githubOwner', value: process.env.GITHUB_OWNER || '', category: 'storage' },
    { key: 'githubRepo', value: process.env.GITHUB_REPO || '', category: 'storage' },
    { key: 'githubBranch', value: process.env.GITHUB_BRANCH || 'main', category: 'storage' },

    // Gitee
    { key: 'giteeAccessToken', value: process.env.GITEE_ACCESS_TOKEN || '', category: 'storage' },
    { key: 'giteeOwner', value: process.env.GITEE_OWNER || '', category: 'storage' },
    { key: 'giteeRepo', value: process.env.GITEE_REPO || '', category: 'storage' },
    { key: 'giteeBranch', value: process.env.GITEE_BRANCH || 'master', category: 'storage' },

    // Local
    { key: 'localStoragePath', value: process.env.LOCAL_STORAGE_PATH || './uploads', category: 'storage' },
  ]

  for (const setting of settingsToCreate) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    })
  }

  console.log('Settings initialized from environment variables')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
