import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

const storageClient = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: 'external_account',
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: 'json',
        subject_token_field_name: 'access_token',
      },
    },
    universe_domain: 'googleapis.com',
  },
  projectId: '',
});

function getPublicSearchPaths() {
  const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
  return pathsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
}

function getPrivateObjectDir() {
  return process.env.PRIVATE_OBJECT_DIR || '';
}

function parseObjectPath(fullPath) {
  if (!fullPath.startsWith('/')) fullPath = '/' + fullPath;
  const parts = fullPath.split('/');
  if (parts.length < 3) throw new Error('Invalid path');
  return {
    bucketName: parts[1],
    objectName: parts.slice(2).join('/')
  };
}

export async function uploadFileToStorage(localFilePath, destinationName) {
  const privateDir = getPrivateObjectDir();
  if (!privateDir) {
    throw new Error('PRIVATE_OBJECT_DIR not set');
  }

  const fullPath = `${privateDir}/barbers/${destinationName}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(fs.readFileSync(localFilePath), {
    contentType: getContentType(destinationName),
    resumable: false,
  });

  return `/objects/barbers/${destinationName}`;
}

export async function uploadCarouselToStorage(localFilePath, destinationName) {
  const privateDir = getPrivateObjectDir();
  if (!privateDir) {
    throw new Error('PRIVATE_OBJECT_DIR not set');
  }

  const fullPath = `${privateDir}/carousel/${destinationName}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(fs.readFileSync(localFilePath), {
    contentType: getContentType(destinationName),
    resumable: false,
  });

  return `/objects/carousel/${destinationName}`;
}

export async function serveObjectFile(objectPath, res) {
  const privateDir = getPrivateObjectDir();
  if (!privateDir) {
    return res.status(500).json({ error: 'Storage not configured' });
  }

  const relativePath = objectPath.replace(/^\/objects\//, '');
  const fullPath = `${privateDir}/${relativePath}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [metadata] = await file.getMetadata();
    res.set({
      'Content-Type': metadata.contentType || 'application/octet-stream',
      'Content-Length': metadata.size,
      'Cache-Control': 'public, max-age=86400',
    });

    const stream = file.createReadStream();
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Error serving object:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error serving file' });
    }
  }
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
  };
  return types[ext] || 'application/octet-stream';
}
