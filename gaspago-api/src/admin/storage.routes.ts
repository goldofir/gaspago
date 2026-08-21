import type { FastifyInstance } from 'fastify'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { SystemConfigService } from '../shared/system-config.service'

export async function storageRoutes(app: FastifyInstance) {
  app.get('/storage/status', async (_req, reply) => {
    try {
      const endpoint = SystemConfigService.get('MINIO_ENDPOINT')
      const accessKeyId = SystemConfigService.get('MINIO_ACCESS_KEY')
      const secretAccessKey = SystemConfigService.get('MINIO_SECRET_KEY')
      const publicBucket = SystemConfigService.get('MINIO_BUCKET_PUBLIC')
      const privateBucket = SystemConfigService.get('MINIO_BUCKET_PRIVATE')

      if (!endpoint || !accessKeyId || !secretAccessKey) {
        return reply.send({ ok: false, error: 'Credenciais MinIO não configuradas' })
      }

      const s3 = new S3Client({
        endpoint, forcePathStyle: true,
        region: 'us-east-1',
        credentials: { accessKeyId, secretAccessKey },
      })

      await s3.send(new ListBucketsCommand({}))
      return reply.send({ ok: true, endpoint, publicBucket, privateBucket })
    } catch (err: any) {
      return reply.send({ ok: false, error: err.message ?? 'Erro ao conectar ao MinIO' })
    }
  })
}
