/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = process.env.PORT || 3002;

// --- PostgreSQL Connection Pool ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
const CDN_BASE_URL = process.env.CDN_BASE_URL; 

const FOLDERS = {
    pre: process.env.GCS_FOLDER_PRE || 'pre',
    wax: process.env.GCS_FOLDER_WAX || 'wax',
    cast: process.env.GCS_FOLDER_CAST || 'cast',
    final: process.env.GCS_FOLDER_FINAL || 'final',
};

if (!GCS_BUCKET_NAME || !CDN_BASE_URL) {
    console.error("CRITICAL ERROR: GCS_BUCKET_NAME or CDN_BASE_URL is missing in .env");
}

// --- Helper: SEO Slugify ---
const createSeoSlug = (text) => {
    if (!text) return 'untitled-product';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/_/g, '-')          // Replace underscores with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};

console.log('--------------------------');

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage() });

// --- Helper Function: Upload to Cloud Storage ---
async function uploadToCloud(fileBuffer, filename, mimeType, folder) {
    const key = `${folder}/${filename}`;

    const uploadParams = {
        Bucket: GCS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `${CDN_BASE_URL}/${key}`;
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

        // 1. SKU Existence Check & Fetch Meta Title
        // We need the existing record to get the 'meta_title'
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

            // --- [NEW] SEO Filename Logic ---
            // 1. Get Meta Title from DB (Fallback to product name or 'custom-design' if missing)
            const metaTitleRaw = product.meta_title;
            const metaTitleSlug = createSeoSlug(metaTitleRaw);
            // Check for Meta Title (Required for SEO Filename)
            if (!product.meta_title) {
                 return res.status(400).json({ 
                     success: false, 
                     message: `Cannot save image: SEO Meta Title is missing for SKU ${sku}. Please generate and save a Meta Title first.` 
                 });
            }

            // 2. Determine specific naming pattern based on Type
            const typeLower = type.toLowerCase();
            let fileMiddlePart = "design"; // default fallback

            if (typeLower === 'wax') {
                fileMiddlePart = "wax-prototype";
            } else if (typeLower === 'cast') {
                fileMiddlePart = "raw-gold-cast";
            } else if (typeLower === 'final') {
                fileMiddlePart = "finished-polish";
            }

            // 3. Construct the final filename
            // Pattern: custom-design-${metaTitle}-${specificPart}-${sku}.webp
            const filename = `custom-design-${metaTitleSlug}-${fileMiddlePart}-${sku}.webp`;
            
            const targetFolder = FOLDERS[typeLower] || 'misc'; 

            console.log(`[Cloud] Uploading ${filename} to bucket folder '${targetFolder}'...`);
            
            const file = req.files.image[0];
            const imageUrl = await uploadToCloud(file.buffer, filename, file.mimetype, targetFolder);
            console.log(`[Cloud] Upload successful. URL: ${imageUrl}`);
            
            const fieldToUpdate = `${typeLower}_image_url`;
            updateFields.push(`${fieldToUpdate} = $${paramIndex++}`);
            queryParams.push(imageUrl);

            // Handle Pre-Image Logic
            if (req.files.originalImage && req.files.originalImage[0] && !product.pre_image_url) {
                const originalFile = req.files.originalImage[0];
                // Pre-image naming convention
                const preImageFilename = `custom-design-${metaTitleSlug}-pre-image-${sku}.webp`;
                
                console.log(`[Cloud] Uploading Pre-Image ${preImageFilename} to folder '${FOLDERS.pre}'...`);
                const preImageUrl = await uploadToCloud(originalFile.buffer, preImageFilename, originalFile.mimetype, FOLDERS.pre);
                
                updateFields.push(`pre_image_url = $${paramIndex++}`);
                queryParams.push(preImageUrl);
            }

        } else if (dataType === 'Description') {
            // ... (This part remains the same as your code)
            if (!description) {
                return res.status(400).json({ success: false, message: 'No description text provided.' });
            }
            
            const fieldMap = {
                'Product_name': 'product_name',
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