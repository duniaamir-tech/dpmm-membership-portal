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

    // Helper table creation to align strictly with database schema
    const ensureTableExists = async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          no_ahli TEXT,
          syarikat TEXT,
          ssm_no TEXT,
          tmph_ssm TEXT,
          proksi TEXT,
          no_kp TEXT,
          introducer TEXT,
          email TEXT,
          hphone TEXT,
          pegawai_hubungi TEXT,
          tel_pejabat TEXT,
          whatsapp TEXT,
          tahun TEXT,
          kategori TEXT,
          jenis_perniagaan TEXT,
          no_resit TEXT,
          tarikh_bayar TEXT,
          status TEXT,
          alamat_surat_menyurat TEXT,
          alamat_tetap TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    };

    if (action === 'register') {
      await ensureTableExists();

      await sql`
        INSERT INTO members (
          no_ahli, syarikat, ssm_no, tmph_ssm, proksi, no_kp, introducer,
          email, hphone, pegawai_hubungi, tel_pejabat, whatsapp, tahun, kategori,
          jenis_perniagaan, no_resit, tarikh_bayar, status, alamat_surat_menyurat, alamat_tetap
        ) VALUES (
          ${data?.no_ahli || ''}, ${data?.syarikat || ''}, ${data?.ssm_no || ''}, ${data?.tmph_ssm || ''}, ${data?.proksi || ''},
          ${data?.no_kp || ''}, ${data?.introducer || ''}, ${data?.email || ''}, ${data?.hphone || ''}, ${data?.pegawai_hubungi || ''},
          ${data?.tel_pejabat || ''}, ${data?.whatsapp || ''}, ${data?.tahun || ''}, ${data?.kategori || ''},
          ${data?.jenis_perniagaan || ''}, ${data?.no_resit || ''}, ${data?.tarikh_bayar || ''}, ${data?.status || ''},
          ${data?.alamat_surat_menyurat || ''}, ${data?.alamat_tetap || ''}
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
        SET syarikat = ${data?.syarikat || ''},
            ssm_no = ${data?.ssm_no || ''},
            tmph_ssm = ${data?.tmph_ssm || ''},
            proksi = ${data?.proksi || ''},
            no_kp = ${data?.no_kp || ''},
            introducer = ${data?.introducer || ''},
            hphone = ${data?.hphone || ''},
            pegawai_hubungi = ${data?.pegawai_hubungi || ''},
            tel_pejabat = ${data?.tel_pejabat || ''},
            whatsapp = ${data?.whatsapp || ''},
            tahun = ${data?.tahun || ''},
            kategori = ${data?.kategori || ''},
            jenis_perniagaan = ${data?.jenis_perniagaan || ''},
            no_resit = ${data?.no_resit || ''},
            tarikh_bayar = ${data?.tarikh_bayar || ''},
            status = ${data?.status || ''},
            alamat_surat_menyurat = ${data?.alamat_surat_menyurat || ''},
            alamat_tetap = ${data?.alamat_tetap || ''}
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