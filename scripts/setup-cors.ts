import COS from 'cos-nodejs-sdk-v5'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupCORS() {
    try {
        // Get settings from database
        const settings = await prisma.settings.findMany()
        const config: any = {}
        settings.forEach(setting => {
            config[setting.key] = setting.value
        })

        const cosSecretId = config.cosSecretId
        const cosSecretKey = config.cosSecretKey
        const bucket = config.cosBucket
        const region = config.cosRegion

        if (!cosSecretId || !cosSecretKey || !bucket || !region) {
            console.error('Missing COS configuration in database')
            console.error('Please configure COS settings via the web UI first')
            process.exit(1)
        }

        const cos = new COS({
            SecretId: cosSecretId,
            SecretKey: cosSecretKey,
        })

        console.log(`Configuring CORS for bucket: ${bucket} in region: ${region}`)

        await new Promise<void>((resolve, reject) => {
            cos.putBucketCors({
                Bucket: bucket,
                Region: region,
                CORSRules: [
                    {
                        AllowedOrigin: ['*'],
                        AllowedMethod: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                        AllowedHeader: ['*'],
                        ExposeHeader: ['ETag', 'Content-Length', 'x-cos-request-id'],
                        MaxAgeSeconds: 86400,
                    }
                ]
            }, function (err, data) {
                if (err) {
                    console.error('Error setting CORS:', err)
                    reject(err)
                } else {
                    console.log('CORS configured successfully:', data)
                    resolve()
                }
            })
        })
    } catch (error) {
        console.error('Failed to setup CORS:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

setupCORS()
