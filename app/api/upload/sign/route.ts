import { NextResponse } from 'next/server'
import STS from 'qcloud-cos-sts'
import { getAllSettings } from '@/lib/settings'

export async function GET(request: Request) {
    try {
        const settings = await getAllSettings()

        if (!settings.cosSecretId || !settings.cosSecretKey || !settings.cosBucket || !settings.cosRegion) {
            return NextResponse.json({ error: 'Missing COS configuration' }, { status: 500 })
        }

        const bucket = settings.cosBucket
        const region = settings.cosRegion
        const secretId = settings.cosSecretId
        const secretKey = settings.cosSecretKey

        // Extract AppId from bucket name (e.g., pixelhub-1250000000 -> 1250000000)
        const appId = bucket.split('-').pop()

        const config = {
            secretId,
            secretKey,
            durationSeconds: 1800,
            policy: {
                'version': '2.0',
                'statement': [
                    {
                        'action': [
                            'name/cos:PutObject',
                            'name/cos:PostObject',
                            'name/cos:InitiateMultipartUpload',
                            'name/cos:ListMultipartUploads',
                            'name/cos:ListParts',
                            'name/cos:UploadPart',
                            'name/cos:CompleteMultipartUpload',
                        ],
                        'effect': 'allow',
                        'resource': [
                            `qcs::cos:${region}:uid/${appId}:${bucket}/*`
                        ]
                    }
                ]
            }
        }

        return new Promise<NextResponse>((resolve) => {
            STS.getCredential(config as any, (err, data) => {
                if (err) {
                    console.error('STS Error:', err)
                    resolve(NextResponse.json({ error: 'Error getting credentials' }, { status: 500 }))
                } else {
                    resolve(NextResponse.json({
                        ...data,
                        bucket: settings.cosBucket,
                        region: settings.cosRegion,
                    }))
                }
            })
        })
    } catch (error) {
        console.error('COS sign error:', error)
        return NextResponse.json({ error: 'Failed to get COS credentials' }, { status: 500 })
    }
}
