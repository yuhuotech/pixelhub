import { NextResponse } from 'next/server'
import { getAllSettings } from '@/lib/settings'

export async function GET() {
    try {
        const settings = await getAllSettings()
        return NextResponse.json({
            storageType: settings.storageType
        })
    } catch (error) {
        console.error('Get config error:', error)
        return NextResponse.json({ error: 'Failed to get config' }, { status: 500 })
    }
}
