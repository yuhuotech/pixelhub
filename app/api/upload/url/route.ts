import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
        }

        // Validate URL
        try {
            new URL(url)
        } catch {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
        }

        // Download image from URL
        const imageResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PixelHub/1.0)'
            }
        })

        if (!imageResponse.ok) {
            return NextResponse.json({ error: 'Failed to download image from URL' }, { status: 400 })
        }

        const contentType = imageResponse.headers.get('content-type')
        if (!contentType || !contentType.startsWith('image/')) {
            return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 })
        }

        // Convert to buffer
        const arrayBuffer = await imageResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Get storage type from database settings
        const { getAllSettings } = await import('@/lib/settings')
        const settings = await getAllSettings()
        const storageType = settings.storageType

        // Generate filename from URL
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        let filename = pathname.split('/').pop() || 'image.jpg'

        // Ensure filename has extension
        if (!filename.includes('.')) {
            const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
            filename = `${filename}.${ext}`
        }

        // Generate path
        const date = new Date()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const timestamp = Date.now()
        const sanitizedFilename = filename.replace(/[/\\?*:|"<>]/g, '')
        const path = `uploads/${year}${month}/${timestamp}-${sanitizedFilename}`

        let uploadData

        if (storageType === 'local') {
            // Local storage
            const storagePath = settings.localStoragePath || './uploads'
            const { writeFile, mkdir } = await import('fs/promises')
            const { join } = await import('path')
            const { existsSync } = await import('fs')

            const fullPath = join(process.cwd(), storagePath, `${year}${month}`)

            if (!existsSync(fullPath)) {
                await mkdir(fullPath, { recursive: true })
            }

            const filePath = join(fullPath, `${timestamp}-${sanitizedFilename}`)
            await writeFile(filePath, buffer)

            const proxyUrl = `/file/${path}`

            uploadData = {
                url: proxyUrl,
                key: path,
                filename,
                size: buffer.length,
                mimeType: contentType,
                publicPath: path,
                storageType: 'local'
            }
        } else if (storageType === 'cos') {
            // Upload to COS
            const COS = (await import('cos-nodejs-sdk-v5')).default
            const cos = new COS({
                SecretId: settings.cosSecretId,
                SecretKey: settings.cosSecretKey,
            })

            const bucket = settings.cosBucket
            const region = settings.cosRegion

            if (!bucket || !region) {
                return NextResponse.json({ error: 'COS configuration missing' }, { status: 500 })
            }

            await new Promise((resolve, reject) => {
                cos.putObject({
                    Bucket: bucket,
                    Region: region,
                    Key: path,
                    Body: buffer,
                    ContentType: contentType,
                }, (err, data) => {
                    if (err) reject(err)
                    else resolve(data)
                })
            })

            const ext = filename.split('.').pop()
            const hash = Math.random().toString(36).substring(2, 14)
            const publicPath = `uploads/${year}${month}/${hash}.${ext}`

            uploadData = {
                url: `/file/${publicPath}`,
                key: path,
                publicPath,
                filename,
                size: buffer.length,
                mimeType: contentType,
                storageType: 'cos'
            }
        } else if (storageType === 'gitee') {
            // Upload to Gitee
            const token = settings.giteeAccessToken
            const owner = settings.giteeOwner
            const repo = settings.giteeRepo
            const branch = settings.giteeBranch || 'master'

            if (!token || !owner || !repo) {
                return NextResponse.json({ error: 'Gitee configuration missing' }, { status: 500 })
            }

            const content = buffer.toString('base64')
            const giteeUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${path}`

            const response = await fetch(giteeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                },
                body: JSON.stringify({
                    access_token: token,
                    content: content,
                    message: `Upload ${filename} via PixelHub URL`,
                    branch: branch
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Gitee API Error:', errorData)
                return NextResponse.json({ error: 'Failed to upload to Gitee' }, { status: response.status })
            }

            uploadData = {
                url: `/file/${path}`,
                key: path,
                publicPath: path,
                filename,
                size: buffer.length,
                mimeType: contentType,
                storageType: 'gitee'
            }
        } else if (storageType === 'github') {
            // Upload to GitHub
            const token = settings.githubAccessToken
            const owner = settings.githubOwner
            const repo = settings.githubRepo
            const branch = settings.githubBranch || 'main'

            if (!token || !owner || !repo) {
                return NextResponse.json({ error: 'GitHub configuration missing' }, { status: 500 })
            }

            const content = buffer.toString('base64')
            const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

            const response = await fetch(githubUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'PixelHub'
                },
                body: JSON.stringify({
                    message: `Upload ${filename} via PixelHub URL`,
                    content: content,
                    branch: branch
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('GitHub API Error:', errorData)
                return NextResponse.json({ error: 'Failed to upload to GitHub' }, { status: response.status })
            }

            uploadData = {
                url: `/file/${path}`,
                key: path,
                publicPath: path,
                filename,
                size: buffer.length,
                mimeType: contentType,
                storageType: 'github'
            }
        } else if (storageType === 'oss') {
            // Upload to OSS
            const OSS = (await import('ali-oss')).default
            const accessKeyId = settings.ossAccessKeyId
            const accessKeySecret = settings.ossAccessKeySecret
            const bucket = settings.ossBucket
            const region = settings.ossRegion
            const endpoint = settings.ossEndpoint

            if (!accessKeyId || !accessKeySecret || !bucket || !region) {
                return NextResponse.json({ error: 'OSS configuration missing' }, { status: 500 })
            }

            const client = new OSS({
                region,
                accessKeyId,
                accessKeySecret,
                bucket,
                endpoint
            })

            await client.put(path, buffer, {
                headers: {
                    'Content-Type': contentType
                }
            })

            uploadData = {
                url: `/file/${path}`,
                key: path,
                publicPath: path,
                filename,
                size: buffer.length,
                mimeType: contentType,
                storageType: 'oss'
            }
        } else {
            return NextResponse.json({ error: 'Unknown storage type' }, { status: 500 })
        }

        // Get image dimensions
        let width, height
        if (contentType.startsWith('image/')) {
            try {
                const sharp = await import('sharp')
                const metadata = await sharp.default(buffer).metadata()
                width = metadata.width
                height = metadata.height
            } catch {
                // If sharp is not available, skip dimensions
            }
        }

        // Save to database
        const { prisma } = await import('@/lib/prisma')
        await prisma.image.create({
            data: {
                url: uploadData.url,
                key: uploadData.key,
                publicPath: uploadData.publicPath,
                filename: uploadData.filename,
                size: uploadData.size,
                mimeType: uploadData.mimeType,
                width,
                height,
                storageType: uploadData.storageType
            }
        })

        return NextResponse.json({ success: true, data: uploadData })

    } catch (error) {
        console.error('URL upload error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
