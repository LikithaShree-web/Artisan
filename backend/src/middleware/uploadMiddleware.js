const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const imageTypes = {
    'image/jpeg': (buffer) =>
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff,

    'image/png': (buffer) =>
        buffer.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        ),

    'image/webp': (buffer) =>
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        if (!imageTypes[file.mimetype]) {
            const error = new Error('Upload a JPEG, PNG, or WebP image.');
            error.statusCode = 415;
            return callback(error);
        }

        callback(null, true);
    }
});

const saveProductImage = async (file) => {
    const isValid = file && imageTypes[file.mimetype];

    if (!isValid || !imageTypes[file.mimetype](file.buffer)) {
        const error = new Error(
            'The uploaded file is not a valid JPEG, PNG, or WebP image.'
        );
        error.statusCode = 415;
        throw error;
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'common-thread/products',
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve({
                    filename: result.secure_url,
                    imageUrl: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        stream.end(file.buffer);
    });
};

module.exports = upload;
module.exports.saveProductImage = saveProductImage;