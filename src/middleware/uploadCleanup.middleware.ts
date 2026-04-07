import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Cleanup uploaded files on error (multer + S3).
 * Use after multer middleware.
 */
export const uploadCleanup = (upload: multer.Multer, s3Client: S3Client, bucket: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.files as Express.Multer.File[]) {
      res.on('finish', async () => {
        if (res.statusCode >= 400) {
          for (const file of (req.files as Express.Multer.File[])) {
            const key = (file as Express.Multer.File & { key?: string }).key;
            if (!key) continue;
            try {
              await s3Client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
              }));
            } catch (error) {
              console.error('Cleanup failed:', error);
            }
          }
        }
      });
    }
    next();
  };
};

