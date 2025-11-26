import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    try {
        if (force) {
            // Permanent Delete
            const image = await prisma.image.delete({
                where: { id },
            })
            // Note: In a real app, you'd also delete from COS here
        } else {
            // Soft Delete
            await prisma.image.update({
                where: { id },
                data: { deletedAt: new Date() }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting image:', error)
        return NextResponse.json(
            { error: 'Failed to delete image' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const body = await request.json()

        if (body.restore) {
            await prisma.image.update({
                where: { id },
                data: { deletedAt: null }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error restoring image:', error)
        return NextResponse.json(
            { error: 'Failed to restore image' },
            { status: 500 }
        )
    }
}
