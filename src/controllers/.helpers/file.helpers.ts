import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

sharp.concurrency(1)

const s3 = new S3Client({
    region: process.env.S3_UPLOAD_REGION!,
    credentials: {
        accessKeyId: process.env.S3_UPLOAD_KEY!,
        secretAccessKey: process.env.S3_UPLOAD_SECRET!,
    },
});

const shortId = () => Math.random().toString(36).substring(2, 8);

export async function uploadAndCompress(
    file: Express.Multer.File,
    storyTitle: string,
    suffix: string
): Promise<string> {

    const compressed = await sharp(file.buffer)
        .rotate()
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

    const cleanTitle = storyTitle
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
        .substring(0, 50);

    const key = `images/${cleanTitle}-${shortId()}-${suffix}.webp`;

    await s3.send(new PutObjectCommand({
        Bucket: "the-not-project-storage",
        Key: key,
        Body: compressed,
        ContentType: "image/webp",
    }));

    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
}

export async function processStoryAssets(
    storyTitle: string,
    content: string,
    thumbnail: Express.Multer.File | undefined,
    editorImages: Express.Multer.File[]
) {

    const thumbnailUrl = thumbnail && thumbnail.buffer.length > 0
        ? await uploadAndCompress(thumbnail, storyTitle, "thumbnail")
        : undefined;

    let updatedContent = content;

    const blobUrlsInHtml = updatedContent.match(/blob:https?:\/\/[^"'\s>]+/g) || [];

    for (let i = 0; i < editorImages.length; i++) {
        const file = editorImages[i];
        if (!file) continue;
        
        const s3Url = await uploadAndCompress(file, storyTitle, "content");

        const targetBlob = blobUrlsInHtml[i];
        if (targetBlob) {
            updatedContent = updatedContent.replaceAll(targetBlob, s3Url);
        }
    }

    return { updatedContent, thumbnailUrl };
}
