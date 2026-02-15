import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { dataUrl } = await req.json();

        if (!dataUrl) {
            return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
        }

        const result = await cloudinary.uploader.upload(dataUrl, {
            folder: 'shared',
            resource_type: 'auto',
        });

        return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
