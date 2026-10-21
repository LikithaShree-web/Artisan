const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');

const uploadsDirectory = path.join(__dirname, '../../uploads');
const imageTypes = {
    'image/jpeg': { extension: '.jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    'image/png': { extension: '.png', matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    'image/webp': { extension: '.webp', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
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
    const imageType = file && imageTypes[file.mimetype];
    if (!imageType || !imageType.matches(file.buffer)) {
        const error = new Error('The uploaded file is not a valid JPEG, PNG, or WebP image.');
        error.statusCode = 415;
        throw error;
    }

    await fs.mkdir(uploadsDirectory, { recursive: true });
    const filename = `${crypto.randomUUID()}${imageType.extension}`;
    const imagePath = path.join(uploadsDirectory, filename);
    await fs.writeFile(imagePath, file.buffer, { flag: 'wx' });
    return { filename, imagePath };
};

module.exports = upload;
module.exports.saveProductImage = saveProductImage;