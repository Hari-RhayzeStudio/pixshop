/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');

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

console.log('--------------------------');

// --- Middleware ---
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// --- API Routes ---

app.patch('/api/products/:sku', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'originalImage', maxCount: 1 }]), async (req, res) => {
    
    const { sku } = req.params; 
    // type is now one of our specific DescriptionType strings (e.g., 'Wax_alt', 'Meta_title')
    const { type, dataType, description } = req.body;
    const { PG_TABLE, CDN_BASE_URL } = process.env;

    console.log(`\n[API] Received PATCH request for SKU: ${sku}`);
    console.log(`[API] Type: ${type}, DataType: ${dataType}`);

    if (!PG_TABLE) {
        return res.status(500).json({ success: false, message: "Server config error: PG_TABLE missing." });
    }
    if (!CDN_BASE_URL && dataType === 'Image') {
        console.warn("Warning: CDN_BASE_URL is not set in .env. Using fallback.");
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

        // 2. Prepare Database Update Payload
        const updateFields = []; 
        const queryParams = [sku]; 
        let paramIndex = 2; 

        if (dataType === 'Image') {
            if (!req.files || !req.files.image || !req.files.image[0]) {
                return res.status(400).json({ success: false, message: 'No image file provided.' });
            }
            
            // Use CDN_BASE_URL from env
            const baseUrl = CDN_BASE_URL || 'https://cdn.example.com';
            const fieldToUpdate = `${type.toLowerCase()}_image_url`; // e.g., wax_image_url
            const imageUrl = `${baseUrl}/images/${sku}-${type.toLowerCase()}-${Date.now()}.webp`;
            
            updateFields.push(`${fieldToUpdate} = $${paramIndex++}`);
            queryParams.push(imageUrl);

            // Handle Pre-Image logic
            if (req.files.originalImage && req.files.originalImage[0] && !product.pre_image_url) {
                const preImageUrl = `${baseUrl}/images/${sku}-pre-image-${Date.now()}-original.webp`;
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

        } else {
            return res.status(400).json({ success: false, message: 'Invalid dataType provided.' });
        }

        // 3. Add 'modified_at' field
        updateFields.push(`modified_at = NOW()`);
        
        // 4. Execute Query
        const updateQuery = `UPDATE ${PG_TABLE} SET ${updateFields.join(', ')} WHERE sku = $1`;
        await client.query(updateQuery, queryParams);
        
        console.log('[DB] Update successful.');
        
        res.json({ success: true, message: `Successfully updated ${dataType} for SKU "${sku}".` });

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