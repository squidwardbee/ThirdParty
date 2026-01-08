import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'settler-audio';

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload audio buffer to S3
 */
export async function uploadAudio(
  audioBuffer: Buffer,
  userId: string,
  argumentId: string,
  type: 'turn' | 'judgment' = 'turn',
  turnNumber?: number
): Promise<UploadResult> {
  const filename =
    type === 'judgment'
      ? `judgment.mp3`
      : `turn-${turnNumber || uuidv4()}.m4a`;

  const key = `audio/${userId}/${argumentId}/${filename}`;

  // Use Upload for larger files (supports multipart)
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: audioBuffer,
      ContentType: type === 'judgment' ? 'audio/mpeg' : 'audio/mp4',
      CacheControl: 'max-age=31536000', // 1 year
    },
  });

  await upload.done();

  const url = await getSignedAudioUrl(key);

  return { key, url };
}

/**
 * Get a signed URL for an existing audio file
 * URLs expire after 24 hours
 */
export async function getSignedAudioUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 86400 }); // 24 hours
}

/**
 * Delete an audio file from S3
 */
export async function deleteAudio(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete all audio files for an argument
 */
export async function deleteArgumentAudio(
  userId: string,
  argumentId: string
): Promise<void> {
  // In production, you would list and delete all files in the prefix
  // For simplicity, we'll rely on the database to track keys
  console.log(`Deleting audio for argument ${argumentId} of user ${userId}`);
}

/**
 * Upload audio from base64 encoded string
 */
export async function uploadAudioFromBase64(
  base64Audio: string,
  userId: string,
  argumentId: string,
  type: 'turn' | 'judgment' = 'turn',
  turnNumber?: number
): Promise<UploadResult> {
  // Remove data URL prefix if present
  const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  return uploadAudio(buffer, userId, argumentId, type, turnNumber);
}

/**
 * Generate a presigned URL for direct upload from client
 * (Not currently used but useful for large files)
 */
export async function getUploadUrl(
  userId: string,
  argumentId: string,
  filename: string
): Promise<{ uploadUrl: string; key: string }> {
  const key = `audio/${userId}/${argumentId}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: 'audio/mp4',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

  return { uploadUrl, key };
}
