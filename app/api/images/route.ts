import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAllSettings } from '@/lib/settings'

// Build origin URL for a single image given pre-fetched settings
// This avoids N+1 queries by passing settings instead of fetching per-image
function buildOriginUrl(image: any, settings: any): string {
    const storageType = image.storageType || settings.storageType

    switch (storageType) {
        case 'cos':
            if (settings.cosBucket && settings.cosRegion) {
                return `https://${settings.cosBucket}.cos.${settings.cosRegion}.myqcloud.com/${image.key}`
            }
            return image.url

        case 'oss':
            if (settings.ossBucket && settings.ossEndpoint) {
                return `https://${settings.ossBucket}.${settings.ossEndpoint}/${image.key}`
            }
            return image.url

        case 'github':
            if (settings.githubOwner && settings.githubRepo && settings.githubBranch) {
                return `https://raw.githubusercontent.com/${settings.githubOwner}/${settings.githubRepo}/${settings.githubBranch}/${image.key}`
            }
            return image.url

        case 'gitee':
            if (settings.giteeOwner && settings.giteeRepo && settings.giteeBranch) {
                return `https://gitee.com/${settings.giteeOwner}/${settings.giteeRepo}/raw/${settings.giteeBranch}/${image.key}`
            }
            return image.url

        case 'local':
        default:
            return image.url
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { url, key, filename, size, width, height, mimeType, publicPath, storageType } = body

        const image = await prisma.image.create({
            data: {
                url,
                key,
                publicPath,
                filename,
                size,
                width,
                height,
                mimeType,
                storageType: storageType || 'cos', // Default to cos for backward compatibility
            },
        })

        return NextResponse.json(image)
    } catch (error) {
        console.error('Error saving image:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    const startTime = Date.now()
    console.log('[API] GET /api/images - Request started')

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')
    const query = searchParams.get('q')
    const trash = searchParams.get('trash') === 'true'
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    console.log('[API] Query params:', { cursor, limit, query, trash, year, month })

    const where: any = {
        deletedAt: trash ? { not: null } : null
    }

    if (query) {
        where.OR = [
            { filename: { contains: query } },
            { publicPath: { contains: query } }
        ]
    }

    if (year) {
        const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1)
        const endDate = new Date(parseInt(year), month ? parseInt(month) : 12, 0, 23, 59, 59)

        where.createdAt = {
            gte: startDate,
            lte: endDate
        }
    }

    try {
        const beforeImageQuery = Date.now()
        const images = await prisma.image.findMany({
            take: limit + 1, // Fetch one more to determine if there's a next page
            skip: cursor ? 1 : 0, // Skip the cursor itself if provided
            cursor: cursor ? { id: cursor } : undefined,
            where,
            orderBy: {
                createdAt: 'desc'
            }
        })
        const afterImageQuery = Date.now()
        console.log(`[API] Image query took: ${afterImageQuery - beforeImageQuery}ms, found ${images.length} images`)

        const hasNextPage = images.length > limit
        const data = hasNextPage ? images.slice(0, limit) : images
        const nextCursor = hasNextPage ? data[data.length - 1].id : null

        // Fetch settings only once (not per-image) to avoid N+1 queries
        const beforeSettingsQuery = Date.now()
        const settings = await getAllSettings()
        const afterSettingsQuery = Date.now()
        console.log(`[API] Settings query took: ${afterSettingsQuery - beforeSettingsQuery}ms`)

        // Build originUrl for each image using the same settings object
        const beforeUrlBuilding = Date.now()
        const imagesWithOriginUrl = data.map((image) => ({
            ...image,
            originUrl: buildOriginUrl(image, settings)
        }))
        const afterUrlBuilding = Date.now()
        console.log(`[API] URL building took: ${afterUrlBuilding - beforeUrlBuilding}ms for ${data.length} images`)

        const endTime = Date.now()
        const totalTime = endTime - startTime
        console.log(`[API] Total request time: ${totalTime}ms`)
        console.log(`[API] Breakdown: images=${afterImageQuery - beforeImageQuery}ms, settings=${afterSettingsQuery - beforeSettingsQuery}ms, urls=${afterUrlBuilding - beforeUrlBuilding}ms, other=${totalTime - (afterImageQuery - beforeImageQuery) - (afterSettingsQuery - beforeSettingsQuery) - (afterUrlBuilding - beforeUrlBuilding)}ms`)

        return NextResponse.json({
            images: imagesWithOriginUrl,
            nextCursor,
        })
    } catch (error) {
        console.error('Error fetching images:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
