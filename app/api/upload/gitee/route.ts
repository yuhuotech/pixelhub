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

        // Call Gitee API
        const giteeUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${path}`

        const response = await fetch(giteeUrl, {
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
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Gitee API Error:', errorData)
            return NextResponse.json({ error: 'Failed to upload to Gitee', details: errorData }, { status: response.status })
        }

        const data = await response.json()

        // Construct raw URL for reference, but return proxy URL for frontend consistency
        const rawGiteeUrl = `https://gitee.com/${owner}/${repo}/raw/${branch}/${path}`

        // Use local proxy URL: /file/uploads/YYYYMM/timestamp-filename
        const proxyUrl = `${new URL(request.url).origin}/file/${path}`

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
