import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getAllSettings } from '@/lib/settings'

export async function POST(request: Request) {
    try {
        // Check if running on Vercel (serverless environment)
        if (process.env.VERCEL) {
            return NextResponse.json(
                {
                    error: 'Local storage is not available on Vercel',
                    message: 'Vercel is a serverless platform without persistent file storage. Please configure one of the following storage backends: COS, OSS, GitHub, or Gitee.',
                    learnMore: 'https://vercel.com/docs/functions/serverless-functions#storage'
                },
                { status: 400 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const settings = await getAllSettings()
        const storagePath = settings.localStoragePath || './uploads'

        // Generate path: uploads/YYYYMM/timestamp-filename
        const date = new Date()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const timestamp = Date.now()
        const sanitizedFilename = file.name.replace(/[/\\?*:|"<>]/g, '')

        const relativePath = `uploads/${year}${month}/${timestamp}-${sanitizedFilename}`
        const fullPath = join(process.cwd(), storagePath, `${year}${month}`)

        // Ensure directory exists
        if (!existsSync(fullPath)) {
            await mkdir(fullPath, { recursive: true })
        }

        // Write file
        const buffer = Buffer.from(await file.arrayBuffer())
        const filePath = join(fullPath, `${timestamp}-${sanitizedFilename}`)
        await writeFile(filePath, buffer)

        console.log(`[Local Storage] File saved to ${filePath}`)

        // Use local proxy URL with proper origin detection (supports reverse proxy)
        const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
        const proxyUrl = `${protocol}://${host}/file/${relativePath}`

        return NextResponse.json({
            url: proxyUrl,
            key: relativePath,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            publicPath: relativePath
        })

    } catch (error) {
        console.error('Local storage error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
