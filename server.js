const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL Pool Connection for Neon DB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Auto-create 'members' table with safe client release
async function initDb() {
    let client;
    try {
        client = await pool.connect();
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY,
                no_ahli VARCHAR(100) UNIQUE,
                syarikat VARCHAR(255) NOT NULL,
                ssm_no VARCHAR(100) NOT NULL,
                tmph_ssm VARCHAR(100),
                proksi VARCHAR(255) NOT NULL,
                no_kp VARCHAR(100) NOT NULL,
                introducer VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                hphone VARCHAR(50) NOT NULL,
                pegawai_hubungi VARCHAR(255),
                tel_pejabat VARCHAR(50),
                tahun_bayar INT,
                tahun VARCHAR(20) DEFAULT '2026',
                kategori VARCHAR(100),
                jenis_perniagaan VARCHAR(255),
                no_resit VARCHAR(100),
                tarikh_bayar VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Aktif',
                alamat_surat_menyurat TEXT,
                alamat_tetap TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await client.query(createTableQuery);
        console.log('Database verification complete.');
    } catch (err) {
        console.error('Error initializing PostgreSQL database:', err.message);
    } finally {
        if (client) client.release();
    }
}

initDb();

// Helper Function: Compute Analytics Metrics
async function getAnalyticsSummary() {
    const totalRes = await pool.query('SELECT COUNT(*) AS total FROM members');
    const activeRes = await pool.query("SELECT COUNT(*) AS active FROM members WHERE status = 'Aktif'");
    
    const categoriesRes = await pool.query(`
        SELECT kategori, COUNT(*) as count 
        FROM members 
        WHERE kategori IS NOT NULL AND kategori != ''
        GROUP BY kategori 
        ORDER BY count DESC 
        LIMIT 5
    `);

    return {
        total: parseInt(totalRes.rows[0].total, 10) || 0,
        active: parseInt(activeRes.rows[0].active, 10) || 0,
        topCategories: categoriesRes.rows
    };
}

// CENTRAL UNIFIED ENDPOINT: POST /api/members
app.post('/api/members', async (req, res) => {
    const { action, data } = req.body || {};

    try {
        // 1. Analytics Summary Action
        if (action === 'analytics_summary') {
            const summary = await getAnalyticsSummary();
            return res.json({ success: true, summary });
        }

        // 2. Member Registration Action
        if (action === 'register') {
            const {
                no_ahli, syarikat, ssm_no, tmph_ssm, proksi, no_kp,
                introducer, email, hphone, pegawai_hubungi, tel_pejabat,
                tahun_bayar, tahun, kategori, jenis_perniagaan,
                no_resit, tarikh_bayar, status, alamat_surat_menyurat, alamat_tetap
            } = data;

            const insertQuery = `
                INSERT INTO members (
                    no_ahli, syarikat, ssm_no, tmph_ssm, proksi, no_kp,
                    introducer, email, hphone, pegawai_hubungi, tel_pejabat,
                    tahun_bayar, tahun, kategori, jenis_perniagaan,
                    no_resit, tarikh_bayar, status, alamat_surat_menyurat, alamat_tetap
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                RETURNING *;
            `;

            const values = [
                no_ahli, syarikat, ssm_no, tmph_ssm, proksi, no_kp,
                introducer, email, hphone, pegawai_hubungi, tel_pejabat,
                tahun_bayar, tahun, kategori, jenis_perniagaan,
                no_resit, tarikh_bayar, status || 'Aktif', alamat_surat_menyurat, alamat_tetap
            ];

            const result = await pool.query(insertQuery, values);
            return res.json({ success: true, member: result.rows[0] });
        }

        // 3. Search Member Action
        if (action === 'search') {
            const queryTerm = `%${data.query}%`;
            const searchQuery = `
                SELECT * FROM members 
                WHERE no_ahli ILIKE $1 
                   OR syarikat ILIKE $1 
                   OR proksi ILIKE $1 
                   OR email ILIKE $1 
                LIMIT 1;
            `;
            const result = await pool.query(searchQuery, [queryTerm]);
            return res.json({ success: true, member: result.rows[0] || null });
        }

        // 4. List All Members Action
        if (action === 'list') {
            const listQuery = 'SELECT * FROM members ORDER BY id DESC LIMIT 100;';
            const result = await pool.query(listQuery);
            return res.json({ success: true, members: result.rows });
        }

        // 5. Update Member Action
        if (action === 'update') {
            const {
                no_ahli, email, syarikat, ssm_no, tmph_ssm, proksi, no_kp,
                introducer, hphone, pegawai_hubungi, tel_pejabat,
                tahun_bayar, tahun, kategori, jenis_perniagaan,
                no_resit, tarikh_bayar, status, alamat_surat_menyurat, alamat_tetap
            } = data;

            const updateQuery = `
                UPDATE members SET
                    syarikat = $1, ssm_no = $2, tmph_ssm = $3, proksi = $4,
                    no_kp = $5, introducer = $6, hphone = $7, pegawai_hubungi = $8,
                    tel_pejabat = $9, tahun_bayar = $10, tahun = $11, kategori = $12,
                    jenis_perniagaan = $13, no_resit = $14, tarikh_bayar = $15,
                    status = $16, alamat_surat_menyurat = $17, alamat_tetap = $18
                WHERE (no_ahli = $19 AND $19 IS NOT NULL AND $19 != '') OR email = $20
                RETURNING *;
            `;

            const values = [
                syarikat, ssm_no, tmph_ssm, proksi, no_kp, introducer, hphone,
                pegawai_hubungi, tel_pejabat, tahun_bayar, tahun, kategori,
                jenis_perniagaan, no_resit, tarikh_bayar, status,
                alamat_surat_menyurat, alamat_tetap, no_ahli || null, email
            ];

            const result = await pool.query(updateQuery, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Member record not found.' });
            }

            return res.json({ success: true, member: result.rows[0] });
        }

        return res.status(400).json({ success: false, error: 'Invalid or unsupported action requested.' });

    } catch (err) {
        console.error('API Error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// REST STANDALONE ENDPOINTS
app.get('/api/analytics/summary', async (req, res) => {
    try {
        const summary = await getAnalyticsSummary();
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/members', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM members ORDER BY id DESC LIMIT 100;');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SPA Catch-all Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export module for Vercel functions & local execution
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
}
