import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, data } = body || {};
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      res.status(500).json({ success: false, error: 'DATABASE_URL is not configured.' });
      return;
    }

    const sql = neon(connectionString);

    if (action === 'register') {
      await sql`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          no_ahli TEXT,
          syarikat TEXT,
          ssm TEXT,
          tmph_ssm TEXT,
          proksi TEXT,
          kp TEXT,
          introducer TEXT,
          email TEXT,
          phone TEXT,
          pegawai TEXT,
          tel_pejabat TEXT,
          whatsapp TEXT,
          tahun TEXT,
          kategori TEXT,
          jenis_perniagaan TEXT,
          no_resit TEXT,
          tarikh_bayar TEXT,
          status TEXT,
          surat TEXT,
          alamat TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        INSERT INTO members (
          no_ahli, syarikat, ssm, tmph_ssm, proksi, kp, introducer,
          email, phone, pegawai, tel_pejabat, whatsapp, tahun, kategori,
          jenis_perniagaan, no_resit, tarikh_bayar, status, surat, alamat
        ) VALUES (
          ${data?.noAhli || ''}, ${data?.syarikat || ''}, ${data?.ssm || ''}, ${data?.tmphSsm || ''}, ${data?.proksi || ''},
          ${data?.kp || ''}, ${data?.introducer || ''}, ${data?.email || ''}, ${data?.phone || ''}, ${data?.pegawai || ''},
          ${data?.telPejabat || ''}, ${data?.whatsapp || ''}, ${data?.tahun || ''}, ${data?.kategori || ''},
          ${data?.jenisPerniagaan || ''}, ${data?.noResit || ''}, ${data?.tarikhBayar || ''}, ${data?.status || ''},
          ${data?.surat || ''}, ${data?.alamat || ''}
        )
      `;

      res.json({ success: true });
      return;
    }

    if (action === 'search') {
      await sql`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          no_ahli TEXT,
          syarikat TEXT,
          ssm TEXT,
          tmph_ssm TEXT,
          proksi TEXT,
          kp TEXT,
          introducer TEXT,
          email TEXT,
          phone TEXT,
          pegawai TEXT,
          tel_pejabat TEXT,
          whatsapp TEXT,
          tahun TEXT,
          kategori TEXT,
          jenis_perniagaan TEXT,
          no_resit TEXT,
          tarikh_bayar TEXT,
          status TEXT,
          surat TEXT,
          alamat TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

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

      res.json({ success: true, member: rows[0] || null });
      return;
    }

    if (action === 'list') {
      await sql`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          no_ahli TEXT,
          syarikat TEXT,
          ssm TEXT,
          tmph_ssm TEXT,
          proksi TEXT,
          kp TEXT,
          introducer TEXT,
          email TEXT,
          phone TEXT,
          pegawai TEXT,
          tel_pejabat TEXT,
          whatsapp TEXT,
          tahun TEXT,
          kategori TEXT,
          jenis_perniagaan TEXT,
          no_resit TEXT,
          tarikh_bayar TEXT,
          status TEXT,
          surat TEXT,
          alamat TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const rows = await sql`
        SELECT id, no_ahli, syarikat, proksi, email, status, created_at
        FROM members
        ORDER BY id DESC
        LIMIT 50
      `;

      res.json({ success: true, members: rows });
      return;
    }

    if (action === 'update') {
      await sql`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          no_ahli TEXT,
          syarikat TEXT,
          ssm TEXT,
          tmph_ssm TEXT,
          proksi TEXT,
          kp TEXT,
          introducer TEXT,
          email TEXT,
          phone TEXT,
          pegawai TEXT,
          tel_pejabat TEXT,
          whatsapp TEXT,
          tahun TEXT,
          kategori TEXT,
          jenis_perniagaan TEXT,
          no_resit TEXT,
          tarikh_bayar TEXT,
          status TEXT,
          surat TEXT,
          alamat TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        UPDATE members
        SET syarikat = ${data?.syarikat || ''},
            ssm = ${data?.ssm || ''},
            tmph_ssm = ${data?.tmphSsm || ''},
            proksi = ${data?.proksi || ''},
            kp = ${data?.kp || ''},
            introducer = ${data?.introducer || ''},
            phone = ${data?.phone || ''},
            pegawai = ${data?.pegawai || ''},
            tel_pejabat = ${data?.telPejabat || ''},
            whatsapp = ${data?.whatsapp || ''},
            tahun = ${data?.tahun || ''},
            kategori = ${data?.kategori || ''},
            jenis_perniagaan = ${data?.jenisPerniagaan || ''},
            no_resit = ${data?.noResit || ''},
            tarikh_bayar = ${data?.tarikhBayar || ''},
            status = ${data?.status || ''},
            surat = ${data?.surat || ''},
            alamat = ${data?.alamat || ''}
        WHERE email = ${data?.email || ''}
      `;

      res.json({ success: true });
      return;
    }

    res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
