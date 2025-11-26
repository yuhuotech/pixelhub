import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const images = await prisma.image.findMany({
            where: { deletedAt: null },
            select: { createdAt: true }
        })

        const stats: Record<string, Record<string, number>> = {}

        images.forEach(img => {
            const date = new Date(img.createdAt)
            const year = date.getFullYear().toString()
            const month = (date.getMonth() + 1).toString()

            if (!stats[year]) stats[year] = {}
            if (!stats[year][month]) stats[year][month] = 0
            stats[year][month]++
        })

        return NextResponse.json(stats)
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        )
    }
}
