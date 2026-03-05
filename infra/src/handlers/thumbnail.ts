import type { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { updateImageUrl } from '../repositories/productRepository';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Key format: tmp-uploads/products/{product_id}/original
    const match = key.match(/^tmp-uploads\/products\/([^/]+)\//);
    if (!match) continue;
    const productId = match[1];

    // Download original
    const getRes = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of getRes.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Save to products/images/{productId} (thumbnail — resize logic can be added here via sharp)
    const destKey = `products/images/${productId}`;
    const contentType = getRes.ContentType ?? 'image/jpeg';
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: destKey, Body: body, ContentType: contentType })
    );

    // Update DynamoDB with S3 key (products Lambda will sign the URL on read)
    await updateImageUrl(productId, destKey);

    console.log(`Thumbnail processed: ${key} -> ${destKey} (product: ${productId})`);
  }
};
