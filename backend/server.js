/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
// --- [NEW] S3 Client for Google Cloud Storage ---
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = process.env.PORT || 3001;

// --- PostgreSQL Connection Pool ---
const pool = new Pool(); 

pool.connect()
    .then(client => {
        console.log(`Successfully connected to PostgreSQL! (Database: ${client.database})`);
        client.release();
    })
    .catch(err => {
        console.error('Failed to connect to PostgreSQL', err);
        process.exit(1);
    });

// --- GCS / S3 Client Initialization ---
const s3Client = new S3Client({
    region: 'auto',
    endpoint: 'https://storage.googleapis.com', 
    credentials: {
        accessKeyId: process.env.GCS_HMAC_ACCESS_ID,
        secretAccessKey: process.env.GCS_HMAC_SECRET,
    },
});

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
// Ensure this is set in .env: e.g., https://storage.googleapis.com/my-bucket-name
const CDN_BASE_URL = process.env.CDN_BASE_URL; 

if (!GCS_BUCKET_NAME || !CDN_BASE_URL) {
    console.error("CRITICAL ERROR: GCS_BUCKET_NAME or CDN_BASE_URL is missing in .env");
}

console.log('--------------------------');

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage() });

// --- Helper Function: Upload to Cloud Storage ---
async function uploadToCloud(fileBuffer, filename, mimeType) {
    const uploadParams = {
        Bucket: GCS_BUCKET_NAME,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimeType,
        // ACL: 'public-read', // Use this only if your bucket permissions require explicit ACLs per object
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        // Construct the final public URL using the ENV variable
        return `${CDN_BASE_URL}/${filename}`;
    } catch (err) {
        console.error("S3 Upload Error:", err);
        throw new Error(`Failed to upload to cloud storage: ${err.message}`);
    }
}


// --- API Routes ---

app.patch('/api/products/:sku', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'originalImage', maxCount: 1 }]), async (req, res) => {
    
    const { sku } = req.params; 
    const { type, dataType, description } = req.body;
    const { PG_TABLE } = process.env;

    console.log(`\n[API] Received PATCH request for SKU: ${sku}`);
    console.log(`[API] Type: ${type}, DataType: ${dataType}`);

    if (!PG_TABLE) {
        return res.status(500).json({ success: false, message: "Server config error: PG_TABLE missing." });
    }

    let client;
    try {
        client = await pool.connect();

        // 1. SKU Existence Check
        const findQuery = `SELECT * FROM ${PG_TABLE} WHERE sku = $1`;
        const findResult = await client.query(findQuery, [sku]);

        if (findResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: `Update failed: SKU "${sku}" not found.` });
        }
        
        const product = findResult.rows[0];

        // 2. Prepare Database Update
        const updateFields = []; 
        const queryParams = [sku]; 
        let paramIndex = 2; 

        if (dataType === 'Image') {
            if (!req.files || !req.files.image || !req.files.image[0]) {
                return res.status(400).json({ success: false, message: 'No image file provided.' });
            }

            // --- Perform Cloud Upload ---
            const file = req.files.image[0];
            // Generate a clean filename: sku-type-timestamp.webp
            const filename = `${sku}-${type.toLowerCase()}-${Date.now()}.webp`;
            
            console.log(`[Cloud] Uploading ${filename} to bucket...`);
            const imageUrl = await uploadToCloud(file.buffer, filename, file.mimetype);
            console.log(`[Cloud] Upload successful. URL: ${imageUrl}`);
            
            const fieldToUpdate = `${type.toLowerCase()}_image_url`;
            updateFields.push(`${fieldToUpdate} = $${paramIndex++}`);
            queryParams.push(imageUrl);

            // Handle Pre-Image Logic
            if (req.files.originalImage && req.files.originalImage[0] && !product.pre_image_url) {
                const originalFile = req.files.originalImage[0];
                const preImageFilename = `${sku}-pre-image-${Date.now()}-original.webp`;
                
                console.log(`[Cloud] Uploading Pre-Image ${preImageFilename}...`);
                const preImageUrl = await uploadToCloud(originalFile.buffer, preImageFilename, originalFile.mimetype);
                
                updateFields.push(`pre_image_url = $${paramIndex++}`);
                queryParams.push(preImageUrl);
            }

        } else if (dataType === 'Description') {
            if (!description) {
                return res.status(400).json({ success: false, message: 'No description text provided.' });
            }
            
            // Map the frontend "DescriptionType" to database columns
            const fieldMap = {
                'Wax_description': 'wax_description',
                'Cast_description': 'cast_description',
                'Final_description': 'final_description',
                'Wax_alt': 'wax_image_alt_text',
                'Cast_alt': 'cast_image_alt_text',
                'Final_alt': 'final_image_alt_text',
                'Meta_title': 'meta_title',
                'Meta_description': 'meta_description'
            };
            
            const fieldToUpdate = fieldMap[type]; 

            if (!fieldToUpdate) {
                return res.status(400).json({ success: false, message: `Invalid description type: ${type}` });
            }
            
            updateFields.push(`${fieldToUpdate} = $${paramIndex++}`);
            queryParams.push(description);
        }

        // 3. Update 'modified_at'
        updateFields.push(`modified_at = NOW()`);
        
        // 4. Execute Query
        const updateQuery = `UPDATE ${PG_TABLE} SET ${updateFields.join(', ')} WHERE sku = $1`;
        await client.query(updateQuery, queryParams);
        
        console.log('[DB] Update successful.');
        
        res.json({ success: true, message: `Successfully updated ${dataType} for SKU "${sku}" (${type}).` });

    } catch (error) {
        console.error('[API] Error during product update:', error);
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    } finally {
        if (client) client.release();
    }
});

app.listen(port, () => {
    console.log(`\nBackend server is running at http://localhost:${port}`);
});