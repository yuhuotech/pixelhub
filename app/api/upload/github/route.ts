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
        const token = settings.githubAccessToken
        const owner = settings.githubOwner
        const repo = settings.githubRepo
        const branch = settings.githubBranch || 'main'

        if (!token || !owner || !repo) {
            return NextResponse.json({ error: 'GitHub configuration missing' }, { status: 500 })
        }

        console.log(`[GitHub Upload] Uploading to ${owner}/${repo} on branch ${branch}`)

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

        // Call GitHub API
        // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents
        const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

        // Add timeout and retry for GitHub uploads
        let response
        let lastError: Error | null = null
        const maxRetries = 2
        const timeoutMs = 60000 // 60 seconds timeout per attempt

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                response = await Promise.race([
                    fetch(githubUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'User-Agent': 'PixelHub'
                        },
                        body: JSON.stringify({
                            message: `Upload ${file.name} via PixelHub`,
                            content: content,
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
                    console.warn(`[GitHub Upload] Attempt ${attempt + 1} failed, retrying... Error: ${lastError.message}`)
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            }
        }

        if (!response) {
            console.error('[GitHub Upload] All upload attempts failed:', lastError?.message)
            return NextResponse.json(
                { error: 'Failed to upload to GitHub after retries', details: lastError?.message },
                { status: 500 }
            )
        }

        const data = await response.json()

        if (!response.ok) {
            console.error('GitHub API Error:', data)
            return NextResponse.json({ error: 'Failed to upload to GitHub', details: data }, { status: response.status })
        }

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
