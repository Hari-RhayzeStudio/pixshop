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

if (!GCS_BUCKET_NAME || !CDN_BASE_URL) {
    console.error("CRITICAL ERROR: GCS_BUCKET_NAME or CDN_BASE_URL is missing in .env");
}

const SEO_KEYWORDS = [
    "custom-jewelry",
    "personalized-jewelry",
    "modern-texas",
    "bespoke-jewelry",
    "custom-jewelry",
    "unique-engagement",
    "tailor-made-jewelry",
    "trendy-jewelry",
    "handcrafted-jewelry",
    "custom-engagement",
    "custom-bridal",
    "custom-promise-jewelry",
    "rich-aesthetic",
    "luxury-jewelry",
    "premium-quality",
    "design-your-own",
    "millennial-style",
    "trending-jewelry",
    "best-selling",
    "top-rated",
];

const getConsistentKeyword = (sku) => {
    let numericSku = parseInt(sku.replace(/\D/g, ''), 10);
    if (isNaN(numericSku)) {
        numericSku = sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
    const index = numericSku % SEO_KEYWORDS.length;
    return SEO_KEYWORDS[index];
};

const createSeoSlug = (text) => {
    if (!text) return 'untitled';
    return text.toString().toLowerCase().trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage() });

async function uploadToCloud(fileBuffer, filename, mimeType, folderPath) {
    const key = `${folderPath}/${filename}`;
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

app.get('/api/products', async (req, res) => {
    try {
        const { PG_TABLE } = process.env;
        if (!PG_TABLE) throw new Error("PG_TABLE not configured");

        const client = await pool.connect();
        
        const query = `
            SELECT sku, category, meta_title, status
            FROM ${PG_TABLE}
            ORDER BY category ASC, sku ASC
        `;

        const result = await client.query(query);
        client.release();

        const products = result.rows.map(row => {
            let statusColor = 'normal';
            const status = (row.status || '').toLowerCase();

            if (status === 'filled' || status === 'fulfilled') {
                statusColor = 'green';
            } else if (status === 'pending') {
                statusColor = 'orange';
            }

            return {
                sku: row.sku,
                category: row.category || 'Uncategorized',
                meta_title: row.meta_title,
                statusColor
            };
        });

        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.patch('/api/products/:sku', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'originalImage', maxCount: 1 }]), async (req, res) => {
    const { sku } = req.params; 
    const { type, dataType, description } = req.body;
    const { PG_TABLE } = process.env;

    console.log(`\n[API] Received PATCH request for SKU: ${sku}`);

    if (!PG_TABLE) {
        return res.status(500).json({ success: false, message: "Server config error: PG_TABLE missing." });
    }

    let client;
    try {
        client = await pool.connect();

        const findQuery = `SELECT * FROM ${PG_TABLE} WHERE sku = $1`;
        const findResult = await client.query(findQuery, [sku]);

        if (findResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: `Update failed: SKU "${sku}" not found.` });
        }
        
        const product = findResult.rows[0];
        const updateFields = []; 
        const queryParams = [sku]; 
        let paramIndex = 2; 

        if (dataType === 'Image') {
            if (!req.files || !req.files.image || !req.files.image[0]) {
                return res.status(400).json({ success: false, message: 'No image file provided.' });
            }

            const categoryRaw = product.category || 'uncategorized';
            const categorySlug = createSeoSlug(categoryRaw);
            const targetFolder = `${categorySlug}/${sku}`; 
            const typeLower = type.toLowerCase();
            const file = req.files.image[0];
            let filename = '';
            let fieldToUpdate = '';

            if (typeLower === 'pre') {
                filename = `${sku}-pre.webp`;
                fieldToUpdate = 'pre_image_url';
            } else {
                if (!product.meta_title) {
                     return res.status(400).json({ 
                         success: false, 
                         message: `Cannot save ${type} image: SEO Meta Title is missing for SKU ${sku}. Please generate and save a Meta Title first.` 
                     });
                }
                
                const metaTitleSlug = createSeoSlug(product.meta_title);
                const seoKeyword = getConsistentKeyword(sku);
                let fileMiddlePart = "design";

                if (typeLower === 'sketch') fileMiddlePart = "concept-sketch-drawing";
                else if (typeLower === 'wax') fileMiddlePart = "3d-wax-model";
                else if (typeLower === 'cast') fileMiddlePart = "raw-gold-cast";
                else if (typeLower === 'final') fileMiddlePart = "finished-polish";

                filename = `${seoKeyword}-${metaTitleSlug}-${fileMiddlePart}-cd-${sku}.webp`;
                fieldToUpdate = `${typeLower}_image_url`;
            }

            console.log(`[Cloud] Uploading ${filename} to bucket folder '${targetFolder}'...`);
            const imageUrl = await uploadToCloud(file.buffer, filename, file.mimetype, targetFolder);
            console.log(`[Cloud] Upload successful. URL: ${imageUrl}`);
            
            updateFields.push(`${fieldToUpdate} = $${paramIndex++}`);
            queryParams.push(imageUrl);

        } else if (dataType === 'Description') {
            if (!description) {
                return res.status(400).json({ success: false, message: 'No description text provided.' });
            }
            
            const fieldMap = {
                'Product_name': 'product_name',
                'Sketch_description': 'sketch_description',
                'Sketch_alt': 'sketch_image_alt_text',
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

        updateFields.push(`modified_at = NOW()`);
        
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