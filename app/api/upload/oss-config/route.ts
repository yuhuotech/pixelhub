import { NextResponse } from 'next/server'
import { getAllSettings } from '@/lib/settings'

export async function GET() {
    try {
        const settings = await getAllSettings()
        return NextResponse.json({
            bucket: settings.ossBucket,
            region: settings.ossRegion,
            accessKeyId: settings.ossAccessKeyId,
            accessKeySecret: settings.ossAccessKeySecret,
            endpoint: settings.ossEndpoint
        })
    } catch (error) {
        console.error('Get OSS config error:', error)
        return NextResponse.json({ error: 'Failed to get OSS config' }, { status: 500 })
    }
}
