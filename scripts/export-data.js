#!/usr/bin/env node

/**
 * Data Export Script
 * Exports business_bites_display data from the source database
 * and prepares it for the new standalone application
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const SOURCE_DB_PATH = path.join(process.cwd(), '../news-actions-app/db.sqlite3');
const OUTPUT_DIR = path.join(__dirname, '../db');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'business_bites_display.json');
const OUTPUT_CSV = path.join(OUTPUT_DIR, 'business_bites_display.csv');

console.log('🔄 Starting data export from source database...');
console.log(`📁 Source database: ${SOURCE_DB_PATH}`);
console.log(`📁 Output directory: ${OUTPUT_DIR}`);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('✅ Created output directory');
}

// Check if source database exists
if (!fs.existsSync(SOURCE_DB_PATH)) {
    console.error('❌ Source database not found:', SOURCE_DB_PATH);
    process.exit(1);
}

const db = new sqlite3.Database(SOURCE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Error opening source database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to source database');
});

db.serialize(() => {
    // Check if business_bites_display table exists
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='business_bites_display'`, (err, row) => {
        if (err) {
            console.error('❌ Error checking table:', err.message);
            db.close();
            process.exit(1);
        }

        if (!row) {
            console.error('❌ business_bites_display table not found in source database');
            db.close();
            process.exit(1);
        }

        console.log('✅ business_bites_display table found');

        // Get record count
        db.get(`SELECT COUNT(*) as count FROM business_bites_display`, (err, result) => {
            if (err) {
                console.error('❌ Error getting record count:', err.message);
                db.close();
                process.exit(1);
            }

            const recordCount = result.count;
            console.log(`📊 Found ${recordCount} records in business_bites_display`);

            // Export to JSON
            db.all(`SELECT * FROM business_bites_display ORDER BY slno`, (err, rows) => {
                if (err) {
                    console.error('❌ Error exporting data:', err.message);
                    db.close();
                    process.exit(1);
                }

                // Write JSON file
                fs.writeFileSync(OUTPUT_JSON, JSON.stringify(rows, null, 2));
                console.log(`✅ Exported ${rows.length} records to JSON: ${OUTPUT_JSON}`);

                // Write CSV file for reference
                if (rows.length > 0) {
                    const headers = Object.keys(rows[0]);
                    const csvContent = [
                        headers.join(','),
                        ...rows.map(row =>
                            headers.map(header => {
                                const value = row[header];
                                // Escape commas and quotes in CSV
                                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                                    return `"${value.replace(/"/g, '""')}"`;
                                }
                                return value || '';
                            }).join(',')
                        )
                    ].join('\n');

                    fs.writeFileSync(OUTPUT_CSV, csvContent);
                    console.log(`✅ Exported CSV reference: ${OUTPUT_CSV}`);
                }

                // Create metadata file
                const metadata = {
                    export_timestamp: new Date().toISOString(),
                    source_database: SOURCE_DB_PATH,
                    record_count: rows.length,
                    table_name: 'business_bites_display',
                    exported_by: 'export-data.js',
                    markets: [...new Set(rows.map(r => r.market))].sort(),
                    sectors: [...new Set(rows.map(r => r.sector))].sort(),
                    date_range: {
                        earliest: rows.length > 0 ? rows.reduce((min, r) => r.published_at < min ? r.published_at : min, rows[0].published_at) : null,
                        latest: rows.length > 0 ? rows.reduce((max, r) => r.published_at > max ? r.published_at : max, rows[0].published_at) : null
                    }
                };

                fs.writeFileSync(path.join(OUTPUT_DIR, 'export_metadata.json'), JSON.stringify(metadata, null, 2));
                console.log('✅ Created export metadata file');

                console.log('\n🎉 Data export completed successfully!');
                console.log(`📊 Records exported: ${rows.length}`);
                console.log(`📁 JSON file: ${OUTPUT_JSON}`);
                console.log(`📁 CSV file: ${OUTPUT_CSV}`);

                db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err.message);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                });
            });
        });
    });
});
