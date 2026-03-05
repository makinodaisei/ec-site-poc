import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as productRepo from '../repositories/productRepository';
import { ok, created, error } from '../shared/response';
import { config } from '../shared/config';
import type { Product } from '../shared/types';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });

async function withSignedImageUrl(product: Product): Promise<Product> {
  if (!product.image_url || !config.assetsBucket) return product;
  const cmd = new GetObjectCommand({ Bucket: config.assetsBucket, Key: product.image_url });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 86400 }); // 24h
  return { ...product, image_url: url };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const productId = event.pathParameters?.id;
  const isUploadUrl = event.path?.endsWith('/upload-url');

  if (method === 'OPTIONS') return ok({});

  // POST /products/{id}/upload-url — generate presigned PUT URL
  if (method === 'POST' && productId && isUploadUrl) {
    if (!config.assetsBucket) return error('Storage not configured', 500);
    const key = `tmp-uploads/products/${productId}/original`;
    const cmd = new PutObjectCommand({ Bucket: config.assetsBucket, Key: key });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min
    return ok({ uploadUrl, key });
  }

  if (method === 'GET' && productId) {
    const product = await productRepo.getById(productId);
    if (!product) return error('Product not found', 404);
    return ok(await withSignedImageUrl(product));
  }

  if (method === 'GET') {
    const products = await productRepo.list();
    const withUrls = await Promise.all(products.map(withSignedImageUrl));
    return ok(withUrls);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body ?? '{}');
    const product = await productRepo.create(body);
    return created(product);
  }

  return error('Method not allowed', 405);
};
