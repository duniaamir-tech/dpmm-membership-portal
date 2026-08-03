import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/members', async (req, res) => {
  try {
    const { action, data } = req.body || {};
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL is not configured.'
      });
    }

    const sql = neon(connectionString);

    // Helper table creation aligned strictly with your database schema
    const ensureTableExists = async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          no_ahli VARCHAR,
          ssm_no VARCHAR,
          tmph_ssm VARCHAR,
          tahun VARCHAR,
          syarikat VARCHAR,
          proksi VARCHAR,
          no_kp VARCHAR,
          introducer VARCHAR,
          email VARCHAR,
          hphone VARCHAR,
          pegawai_hubungi VARCHAR,
          tel_pejabat VARCHAR,
          kategori VARCHAR,
          jenis_perniagaan TEXT,
          no_resit VARCHAR,
          tarikh_bayar TEXT,
          tahun_bayar INTEGER,
          status VARCHAR,
          alamat_surat_menyurat TEXT,
          alamat_tetap TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `;
    };

    if (action === 'register') {
      await ensureTableExists();

      await sql`
        INSERT INTO members (
          no_ahli, syarikat, ssm_no, tmph_ssm, proksi, no_kp, introducer,
          email, hphone, pegawai_hubungi, tel_pejabat, tahun, kategori,
          jenis_perniagaan, no_resit, tarikh_bayar, tahun_bayar, status,
          alamat_surat_menyurat, alamat_tetap
        ) VALUES (
          ${data?.no_ahli || null}, ${data?.syarikat || null}, ${data?.ssm_no || null}, ${data?.tmph_ssm || null}, ${data?.proksi || null},
          ${data?.no_kp || null}, ${data?.introducer || null}, ${data?.email || null}, ${data?.hphone || null}, ${data?.pegawai_hubungi || null},
          ${data?.tel_pejabat || null}, ${data?.tahun || null}, ${data?.kategori || null},
          ${data?.jenis_perniagaan || null}, ${data?.no_resit || null}, ${data?.tarikh_bayar || null}, ${data?.tahun_bayar || null}, ${data?.status || null},
          ${data?.alamat_surat_menyurat || null}, ${data?.alamat_tetap || null}
        )
      `;

      return res.json({ success: true });
    }

    if (action === 'search') {
      await ensureTableExists();

      const query = data?.query || '';
      const rows = await sql`
        SELECT * FROM members
        WHERE no_ahli ILIKE ${'%' + query + '%'}
           OR syarikat ILIKE ${'%' + query + '%'}
           OR proksi ILIKE ${'%' + query + '%'}
           OR email ILIKE ${'%' + query + '%'}
        ORDER BY id DESC
        LIMIT 1
      `;

      return res.json({ success: true, member: rows[0] || null });
    }

    if (action === 'list') {
      await ensureTableExists();

      const rows = await sql`
        SELECT id, no_ahli, syarikat, proksi, email, status, created_at
        FROM members
        ORDER BY id DESC
        LIMIT 50
      `;

      return res.json({ success: true, members: rows });
    }

    if (action === 'update') {
      await ensureTableExists();

      await sql`
        UPDATE members
        SET syarikat = ${data?.syarikat || null},
            ssm_no = ${data?.ssm_no || null},
            tmph_ssm = ${data?.tmph_ssm || null},
            proksi = ${data?.proksi || null},
            no_kp = ${data?.no_kp || null},
            introducer = ${data?.introducer || null},
            hphone = ${data?.hphone || null},
            pegawai_hubungi = ${data?.pegawai_hubungi || null},
            tel_pejabat = ${data?.tel_pejabat || null},
            tahun = ${data?.tahun || null},
            kategori = ${data?.kategori || null},
            jenis_perniagaan = ${data?.jenis_perniagaan || null},
            no_resit = ${data?.no_resit || null},
            tarikh_bayar = ${data?.tarikh_bayar || null},
            tahun_bayar = ${data?.tahun_bayar || null},
            status = ${data?.status || null},
            alamat_surat_menyurat = ${data?.alamat_surat_menyurat || null},
            alamat_tetap = ${data?.alamat_tetap || null},
            updated_at = NOW()
        WHERE email = ${data?.email || ''}
      `;

      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
