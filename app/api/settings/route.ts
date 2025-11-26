import { NextResponse } from 'next/server'
import { getAllSettings, updateSettings } from '@/lib/settings'

export async function GET() {
    try {
        const settings = await getAllSettings()
        return NextResponse.json(settings)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Get settings error:', errorMessage, error)
        return NextResponse.json({ error: 'Failed to get settings', details: errorMessage }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // Filter out masked values
        const updates: any = {}
        Object.entries(body).forEach(([key, value]) => {
            if (value && value !== '••••••••') {
                updates[key] = value
            }
        })

        await updateSettings(updates)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Update settings error:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
