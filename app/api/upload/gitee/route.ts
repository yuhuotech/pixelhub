import { NextResponse } from 'next/server'
import { getAllSettings } from '@/lib/settings'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const settings = await getAllSettings()
        const token = settings.giteeAccessToken
        const owner = settings.giteeOwner
        const repo = settings.giteeRepo
        const branch = settings.giteeBranch || 'master'

        if (!token || !owner || !repo) {
            return NextResponse.json({ error: 'Gitee configuration missing' }, { status: 500 })
        }

        console.log(`[Gitee Upload] Uploading to ${owner}/${repo} on branch ${branch}`)

        // Generate path: uploads/YYYYMM/timestamp-filename
        const date = new Date()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const timestamp = Date.now()
        // Sanitize filename: remove only problematic characters
        const sanitizedFilename = file.name.replace(/[/\\?*:|"<>]/g, '')
        const path = `uploads/${year}${month}/${timestamp}-${sanitizedFilename}`

        // Convert file to Base64
        const buffer = Buffer.from(await file.arrayBuffer())
        const content = buffer.toString('base64')

        // Call Gitee API with timeout and retry
        const giteeUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${path}`

        let response
        let lastError: Error | null = null
        const maxRetries = 2
        const timeoutMs = 60000 // 60 seconds timeout per attempt

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                response = await Promise.race([
                    fetch(giteeUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json;charset=UTF-8'
                        },
                        body: JSON.stringify({
                            access_token: token,
                            content: content,
                            message: `Upload ${file.name} via PixelHub`,
                            branch: branch
                        })
                    }),
                    new Promise<Response>((_, reject) =>
                        setTimeout(() => reject(new Error('Upload timeout')), timeoutMs)
                    )
                ])
                break // Success, exit retry loop
            } catch (error) {
                lastError = error as Error
                if (attempt < maxRetries) {
                    console.warn(`[Gitee Upload] Attempt ${attempt + 1} failed, retrying... Error: ${lastError.message}`)
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            }
        }

        if (!response) {
            console.error('[Gitee Upload] All upload attempts failed:', lastError?.message)
            return NextResponse.json(
                { error: 'Failed to upload to Gitee after retries', details: lastError?.message },
                { status: 500 }
            )
        }

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Gitee API Error:', errorData)
            return NextResponse.json({ error: 'Failed to upload to Gitee', details: errorData }, { status: response.status })
        }

        const data = await response.json()

        // Use local proxy URL with proper origin detection (supports reverse proxy)
        const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
        const proxyUrl = `${protocol}://${host}/file/${path}`

        return NextResponse.json({
            url: proxyUrl, // Return proxy URL so frontend treats it like COS
            key: path,     // Key is the path relative to repo root
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            publicPath: path // Use path as publicPath
        })

    } catch (error) {
        console.error('Upload handler error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
