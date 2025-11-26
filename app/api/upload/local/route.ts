import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getAllSettings } from '@/lib/settings'

export async function POST(request: Request) {
    try {
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

        // Use local proxy URL
        const proxyUrl = `${new URL(request.url).origin}/file/${relativePath}`

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
