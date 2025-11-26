import { NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { getAllSettings } from '@/lib/settings'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const settings = await getAllSettings()
        const accessKeyId = settings.ossAccessKeyId
        const accessKeySecret = settings.ossAccessKeySecret
        const bucket = settings.ossBucket
        const region = settings.ossRegion
        const endpoint = settings.ossEndpoint

        if (!accessKeyId || !accessKeySecret || !bucket || !region) {
            return NextResponse.json({ error: 'OSS configuration missing' }, { status: 500 })
        }

        console.log(`[OSS Upload] Uploading to ${bucket} in ${region}`)

        const client = new OSS({
            region,
            accessKeyId,
            accessKeySecret,
            bucket,
            endpoint
        })

        // Generate path: uploads/YYYYMM/timestamp-filename
        const date = new Date()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const timestamp = Date.now()
        const sanitizedFilename = file.name.replace(/[/\\?*:|"<>]/g, '')
        const path = `uploads/${year}${month}/${timestamp}-${sanitizedFilename}`

        // Convert file to Buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Upload to OSS
        await client.put(path, buffer, {
            headers: {
                'Content-Type': file.type
            }
        })

        // Use local proxy URL
        const proxyUrl = `${new URL(request.url).origin}/file/${path}`

        return NextResponse.json({
            url: proxyUrl,
            key: path,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            publicPath: path
        })

    } catch (error) {
        console.error('OSS upload error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
