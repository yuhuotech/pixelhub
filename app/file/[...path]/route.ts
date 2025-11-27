import { NextResponse } from 'next/server'
import COS from 'cos-nodejs-sdk-v5'
import { prisma } from '@/lib/prisma'
import { getAllSettings } from '@/lib/settings'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params
    const publicPath = path.join('/')

    // Lookup the real COS key from DB
    // The publicPath in DB is stored as "uploads/YYYYMM/hash.ext"
    // The URL is /file/uploads/YYYYMM/hash.ext -> path = ['uploads', 'YYYYMM', 'hash.ext']

    // We need to match what we store in DB.
    // Let's assume we store "uploads/YYYYMM/hash.ext" in publicPath.

    const image = await prisma.image.findUnique({
        where: { publicPath }
    })

    if (!image) {
        return new NextResponse('File not found', { status: 404 })
    }

    const objectKey = image.key

    // Simple mime type inference
    const ext = objectKey.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
    }
    const contentType = ext ? mimeTypes[ext] : 'application/octet-stream'

    try {
        let fetchUrl = ''
        const settings = await getAllSettings()

        // Use stored storage type from image record, fallback to default storage type for old data
        const storageType = (image as any).storageType || settings.storageType

        if (storageType === 'gitee') {
            const owner = settings.giteeOwner
            const repo = settings.giteeRepo
            const branch = settings.giteeBranch || 'master'
            // Gitee raw URL: https://gitee.com/{owner}/{repo}/raw/{branch}/{path}
            // Note: objectKey is the path (e.g. uploads/202311/...)
            fetchUrl = `https://gitee.com/${owner}/${repo}/raw/${branch}/${objectKey}`
        } else if (storageType === 'github') {
            const owner = settings.githubOwner
            const repo = settings.githubRepo
            const branch = settings.githubBranch || 'main'
            // Use GitHub API for better reliability with large files
            // This is more reliable than raw.githubusercontent.com CDN for large files
            fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${objectKey}?ref=${branch}`
        } else if (storageType === 'oss') {
            const bucket = settings.ossBucket
            const endpoint = settings.ossEndpoint
            // OSS public URL format: https://{bucket}.{endpoint}/{key}
            // Or if using custom domain: https://{endpoint}/{key}
            fetchUrl = `https://${bucket}.${endpoint}/${objectKey}`
        } else if (storageType === 'local') {
            // Local storage - read from filesystem
            const storagePath = settings.localStoragePath || './uploads'
            const { readFile } = await import('fs/promises')
            const { join } = await import('path')

            const filePath = join(process.cwd(), storagePath, objectKey.replace('uploads/', ''))

            try {
                const fileBuffer = await readFile(filePath)

                const headers = new Headers()
                headers.set('Content-Type', contentType)
                headers.set('Content-Disposition', 'inline')
                headers.set('Cache-Control', 'public, max-age=31536000, immutable')

                return new NextResponse(fileBuffer, {
                    status: 200,
                    headers,
                })
            } catch (error) {
                console.error('Local file read error:', error)
                return new NextResponse('File not found', { status: 404 })
            }
        } else {
            // COS Logic
            const bucket = settings.cosBucket
            const region = settings.cosRegion

            if (!bucket || !region) {
                return new NextResponse('Missing COS configuration', { status: 500 })
            }

            // Update COS instance with current settings
            const cosInstance = new COS({
                SecretId: settings.cosSecretId,
                SecretKey: settings.cosSecretKey,
            })

            // 1. Generate Signed URL
            fetchUrl = await new Promise<string>((resolve, reject) => {
                cosInstance.getObjectUrl({
                    Bucket: bucket,
                    Region: region,
                    Key: objectKey,
                    Sign: true,
                    Expires: 3600,
                }, (err, data) => {
                    if (err || !data.Url) reject(err || new Error('No URL'))
                    else resolve(data.Url)
                })
            })
        }

        // 2. Fetch from Source (COS, GitHub, Gitee, OSS)
        let fetchOptions: RequestInit = {
            // Increase timeout for large file downloads
            signal: AbortSignal.timeout(120000) // 120 seconds = 2 minutes for large files
        }

        // For GitHub API, add authentication and raw content header
        if (storageType === 'github') {
            const token = settings.githubAccessToken
            if (token) {
                fetchOptions.headers = {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3.raw',
                    'User-Agent': 'PixelHub'
                }
            }
        }

        const response = await fetch(fetchUrl, fetchOptions)

        if (!response.ok) {
            console.error(`Failed to fetch from ${storageType}: ${response.status} ${response.statusText}`)
            return new NextResponse(`Failed to fetch from ${storageType}`, { status: response.status })
        }

        // 3. Stream back to client with forced headers
        const headers = new Headers()
        headers.set('Content-Type', contentType)
        headers.set('Content-Disposition', 'inline')
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')

        return new NextResponse(response.body, {
            status: 200,
            headers,
        })

    } catch (error) {
        console.error('Proxy Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
