import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configuration
cloudinary.config({ 
    cloud_name: 'dq5hyj7au', 
    api_key: 439171288358818, 
    api_secret:"XG5nEAkzmBtc-DmD45GAlLixJo0"
});

const uploadOnCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                ...options
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(error);
                }
                resolve(result);
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

export { uploadOnCloudinary, cloudinary };