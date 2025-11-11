/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg'); // --- [NEW] Import node-postgres ---

const app = express();
const port = process.env.PORT || 3001;

// --- [NEW] PostgreSQL Connection Pool ---
// It automatically reads the PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT
// from your .env file.
const pool = new Pool();

pool.connect()
    .then(client => {
        console.log(`Successfully connected to PostgreSQL! (Database: ${client.database})`);
        client.release(); // Release the client back to the pool
    })
    .catch(err => {
        console.error('Failed to connect to PostgreSQL', err);
        process.exit(1);
    });

console.log('--------------------------');

// --- Middleware (Unchanged) ---
app.use(cors());
app.use(express.json());
// Using memoryStorage, as you send files directly
const upload = multer({ storage: multer.memoryStorage() });

// --- API Routes ---

/**
 * @route PATCH /api/products/:sku
 * @desc Updates a product in the PostgreSQL database.
 * This is the *only* database-facing endpoint.
 */
app.patch('/api/products/:sku', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'originalImage', maxCount: 1 }]), async (req, res) => {
    
    // Get SKU from URL (string) and data from form body
    const { sku } = req.params; 
    const { type, dataType, description } = req.body;
    const { PG_TABLE } = process.env; // Get table name from .env

    console.log(`\n[API] Received PATCH request for SKU: ${sku}`);
    console.log(`[API] Type: ${type}, DataType: ${dataType}`);

    if (!PG_TABLE) {
        return res.status(500).json({ success: false, message: "Server configuration error: PG_TABLE is not set." });
    }

    let client;
    try {
        // 1. Get a client from the pool
        client = await pool.connect();

        // 2. SKU Existence Check (SKU is Varchar)
        console.log(`[DB] Checking in table '${PG_TABLE}' for SKU: ${sku}`);
        const findQuery = `SELECT * FROM ${PG_TABLE} WHERE sku = $1`;
        const findResult = await client.query(findQuery, [sku]);

        if (findResult.rowCount === 0) {
            console.log(`[DB] SKU "${sku}" not found.`);
            return res.status(404).json({ success: false, message: `Update failed: SKU "${sku}" does not exist in the database.` });
        }
        
        const product = findResult.rows[0];
        console.log(`[DB] SKU "${sku}" found. Current Status: ${product.status}`);

        // 3. Prepare Database Update Payload
        const updateFields = []; // e.g., "wax_image_url = $2"
        const queryParams = [sku]; // $1 will be the SKU in the WHERE clause
        let paramIndex = 2; // Start parameters at $2

        if (dataType === 'Image') {
            if (!req.files || !req.files.image || !req.files.image[0]) {
                return res.status(400).json({ success: false, message: 'No image file was provided for an Image update.' });
            }
            
            // In a real app, upload the buffer (req.files.image[0].buffer) to S3/GCS.
            // We simulate this as per your original file.
            const fieldToUpdate = `${type.toLowerCase()}_image_url`;
            const imageUrl = `https://cdn.example.com/images/${sku}-${type.toLowerCase()}-${Date.now()}.webp`;
            
            updateFields.push(`${fieldToUpdate} = $${paramIndex++}`);
            queryParams.push(imageUrl);
            console.log(`[Cloud Storage] Simulated upload for "${fieldToUpdate}". URL: ${imageUrl}`);

            // Handle Pre-Image (as per your App.tsx logic)
            // Note: Your SaveModal doesn't send 'saveAsPreImage', but your App.tsx handles it.
            // This backend code assumes the logic in databaseService.tsx sends 'originalImage'
            if (req.files.originalImage && req.files.originalImage[0] && !product.pre_image_url) {
                const preImageUrl = `https://cdn.example.com/images/${sku}-pre-image-${Date.now()}-original.webp`;
                updateFields.push(`pre_image_url = $${paramIndex++}`);
                queryParams.push(preImageUrl);
                console.log(`[Cloud Storage] Also simulated upload for "pre_image_url". URL: ${preImageUrl}`);
            }

        } else if (dataType === 'Description') {
            if (!description) {
                return res.status(400).json({ success: false, message: 'No description text was provided.' });
            }
            const fieldToUpdate = `${type.toLowerCase()}_description`;
            updateFields.push(`${fieldToUpdate} = $${paramIndex++}`);
            queryParams.push(description);
            console.log(`[DB] Preparing to save description for "${fieldToUpdate}"`);

        } else {
            return res.status(400).json({ success: false, message: 'Invalid dataType provided.' });
        }

        // 4. Add 'modified_at' field
        updateFields.push(`modified_at = NOW()`);
        
        // 5. Build and execute the UPDATE query
        // e.g., UPDATE Google_sheet_data SET wax_image_url = $2, modified_at = NOW() WHERE sku = $1
        const updateQuery = `UPDATE ${PG_TABLE} SET ${updateFields.join(', ')} WHERE sku = $1`;
        
        console.log(`[DB] Executing query: ${updateQuery}`);
        console.log(`[DB] With params: ${JSON.stringify(queryParams)}`);
        
        await client.query(updateQuery, queryParams);
        
        console.log('[DB] Update successful.');
        
        // 6. Send Success Response
        // No need to check for fulfillment, as your DB trigger handles it.
        res.json({ success: true, message: `Successfully updated ${dataType} for SKU "${sku}" (${type}).` });

    } catch (error) {
        console.error('[API] Error during product update:', error);
        res.status(500).json({ success: false, message: `An internal server error occurred: ${error.message}` });
    } finally {
        if (client) {
            client.release(); // Always release the client back to the pool
        }
    }
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`\nBackend server is running at http://localhost:${port}`);
});