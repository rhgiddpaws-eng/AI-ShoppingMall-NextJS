// npx tsx scripts/cleanup_s3_orphaned_images.ts

import { PrismaClient } from '@prisma/client'
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const prisma = new PrismaClient()

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

// S3에서 모든 객체 목록 가져오기 (페이지네이션 처리)
async function getAllS3Keys(bucketName: string, prefix: string) {
    let keys: string[] = []
    let continuationToken: string | undefined = undefined

    do {
        // 타입 추론 충돌을 막기 위해 명시적으로 명령 타입을 고정한다.
        const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        })
        const response = await s3Client.send(listCommand)

        if (response.Contents) {
            const fetchedKeys = response.Contents.map(obj => obj.Key).filter((k): k is string => !!k)
            keys = keys.concat(fetchedKeys)
        }

        continuationToken = response.NextContinuationToken
    } while (continuationToken)

    return keys
}

async function main() {
    try {
        const bucketName = process.env.AWS_BUCKET_NAME
        if (!bucketName) {
            throw new Error('AWS_BUCKET_NAME 환경 변수가 설정되지 않았습니다.')
        }

        console.log('1. DB에서 현재 사용 중인 이미지 목록 조회 중...')
        // DB에 있는 모든 이미지의 original, thumbnail 키 조회
        const dbImages = await prisma.image.findMany({
            select: { original: true, thumbnail: true }
        })

        const validKeys = new Set<string>()
        dbImages.forEach(img => {
            if (img.original) validKeys.add(img.original)
            if (img.thumbnail) validKeys.add(img.thumbnail)
        })
        console.log(`   - DB에 등록된 유효한 이미지 수: ${dbImages.length}개 (키 개수: ${validKeys.size})`)


        console.log('2. S3 버킷의 모든 파일 목록 조회 중 (ecommerce/products/ 경로)...')
        // ecommerce/products/ 경로 하위의 모든 파일 조회
        const s3Keys = await getAllS3Keys(bucketName, 'ecommerce/products/')
        console.log(`   - S3에서 발견된 총 파일 수: ${s3Keys.length}개`)


        console.log('3. 정리 대상(고아) 이미지 식별 중...')
        const keysToDelete: string[] = []

        for (const key of s3Keys) {
            // DB에 없는 키라면 삭제 대상
            if (!validKeys.has(key)) {
                keysToDelete.push(key)
            }
        }

        if (keysToDelete.length === 0) {
            console.log('   - 정리할 고아 이미지가 없습니다.')
            return
        }

        console.log(`   - 삭제 대상 파일 수: ${keysToDelete.length}개`)


        console.log('4. S3에서 파일 삭제 시작...')
        // 한 번에 최대 1000개씩 삭제 가능하므로 청크로 나누어 처리
        const chunkSize = 1000
        for (let i = 0; i < keysToDelete.length; i += chunkSize) {
            const chunk = keysToDelete.slice(i, i + chunkSize)

            const deleteCommand = new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: {
                    Objects: chunk.map(key => ({ Key: key })),
                    Quiet: true,
                },
            })

            await s3Client.send(deleteCommand)
            console.log(`   - ${Math.min(i + chunkSize, keysToDelete.length)} / ${keysToDelete.length} 개 삭제 완료`)
        }

        console.log('\n모든 고아 이미지 정리가 완료되었습니다.')

    } catch (error) {
        console.error('작업 중 오류 발생:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
