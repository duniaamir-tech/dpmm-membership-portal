// /api/members.js
// Vercel Serverless Function — targets the 'members' table using the 
// Neon HTTP driver (@neondatabase/serverless).

const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const EDITABLE_FIELDS = [
  'syarikat', 'ssm_no', 'tmph_ssm', 'proksi', 'no_kp', 'introducer',
  'hphone', 'pegawai_hubungi', 'tel_pejabat', 'tahun_bayar', 'kategori',
  'jenis_perniagaan', 'no_resit', 'tarikh_bayar', 'status',
  'alamat_surat_menyurat', 'alamat_tetap',
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  if (!process.env.DATABASE_URL) {
    res.status(500).json({ success: false, error: 'DATABASE_URL is not configured on the server.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { action, data } = body || {};

  try {
    switch (action) {
      case 'list': {
        const members = await sql`SELECT * FROM members ORDER BY id DESC LIMIT 100`;
        res.status(200).json({ success: true, members });
        return;
      }

      case 'analytics_summary': {
        const [{ total, active }] = await sql`
          SELECT
            count(*)::int AS total,
            count(*) FILTER (WHERE status = 'Aktif')::int AS active
          FROM members
        `;
        const topCategories = await sql`
          SELECT kategori, count(*)::int AS count
          FROM members
          WHERE kategori IS NOT NULL AND kategori != ''
          GROUP BY kategori
          ORDER BY count DESC
          LIMIT 5
        `;
        res.status(200).json({ success: true, summary: { total, active, topCategories } });
        return;
      }

      case 'search': {
        const query = (data && data.query || '').trim();
        if (!query) {
          res.status(400).json({ success: false, error: 'Search query is required.' });
          return;
        }
        const like = `%${query}%`;
        const rows = await sql`
          SELECT * FROM members
          WHERE no_ahli ILIKE ${like}
             OR syarikat ILIKE ${like}
             OR proksi ILIKE ${like}
             OR email ILIKE ${like}
          LIMIT 1
        `;
        res.status(200).json({ success: true, member: rows[0] || null });
        return;
      }

      case 'register': {
        const m = data || {};
        if (!m.no_ahli || !m.syarikat || !m.ssm_no || !m.proksi || !m.no_kp || !m.email || !m.hphone) {
          res.status(400).json({ success: false, error: 'Missing required fields.' });
          return;
        }
        try {
          const rows = await sql`
            INSERT INTO members (
              no_ahli, syarikat, ssm_no, tmph_ssm, proksi, no_kp, introducer,
              email, hphone, pegawai_hubungi, tel_pejabat, tahun_bayar,
              kategori, jenis_perniagaan, no_resit, tarikh_bayar, status,
              alamat_surat_menyurat, alamat_tetap
            ) VALUES (
              ${m.no_ahli}, ${m.syarikat}, ${m.ssm_no}, ${m.tmph_ssm || null},
              ${m.proksi}, ${m.no_kp}, ${m.introducer || null}, ${m.email},
              ${m.hphone}, ${m.pegawai_hubungi || null}, ${m.tel_pejabat || null},
              ${m.tahun_bayar || null}, ${m.kategori || null}, ${m.jenis_perniagaan || null},
              ${m.no_resit || null}, ${m.tarikh_bayar || null}, ${m.status || 'Aktif'},
              ${m.alamat_surat_menyurat || null}, ${m.alamat_tetap || null}
            )
            RETURNING *
          `;
          res.status(200).json({ success: true, member: rows[0] });
        } catch (err) {
          if (String(err.message).includes('duplicate key')) {
            res.status(409).json({ success: false, error: 'No. Ahli or email already exists.' });
            return;
          }
          throw err;
        }
        return;
      }

      case 'update': {
        const m = data || {};
        if (!m.no_ahli && !m.email) {
          res.status(400).json({ success: false, error: 'no_ahli or email is required to update a record.' });
          return;
        }

        // Verify if there is at least one editable field provided in the payload
        const hasFieldsToUpdate = EDITABLE_FIELDS.some((field) =>
          Object.prototype.hasOwnProperty.call(m, field)
        );

        if (!hasFieldsToUpdate) {
          res.status(400).json({ success: false, error: 'No fields to update.' });
          return;
        }

        // Use COALESCE to only update fields present in the request payload
        const updatedRows = await sql`
          UPDATE members
          SET
            syarikat               = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'syarikat')} THEN ${m.syarikat || null} ELSE syarikat END,
            ssm_no                 = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'ssm_no')} THEN ${m.ssm_no || null} ELSE ssm_no END,
            tmph_ssm               = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'tmph_ssm')} THEN ${m.tmph_ssm || null} ELSE tmph_ssm END,
            proksi                 = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'proksi')} THEN ${m.proksi || null} ELSE proksi END,
            no_kp                  = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'no_kp')} THEN ${m.no_kp || null} ELSE no_kp END,
            introducer             = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'introducer')} THEN ${m.introducer || null} ELSE introducer END,
            hphone                 = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'hphone')} THEN ${m.hphone || null} ELSE hphone END,
            pegawai_hubungi        = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'pegawai_hubungi')} THEN ${m.pegawai_hubungi || null} ELSE pegawai_hubungi END,
            tel_pejabat            = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'tel_pejabat')} THEN ${m.tel_pejabat || null} ELSE tel_pejabat END,
            tahun_bayar            = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'tahun_bayar')} THEN ${m.tahun_bayar || null} ELSE tahun_bayar END,
            kategori               = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'kategori')} THEN ${m.kategori || null} ELSE kategori END,
            jenis_perniagaan       = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'jenis_perniagaan')} THEN ${m.jenis_perniagaan || null} ELSE jenis_perniagaan END,
            no_resit               = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'no_resit')} THEN ${m.no_resit || null} ELSE no_resit END,
            tarikh_bayar           = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'tarikh_bayar')} THEN ${m.tarikh_bayar || null} ELSE tarikh_bayar END,
            status                 = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'status')} THEN ${m.status || null} ELSE status END,
            alamat_surat_menyurat  = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'alamat_surat_menyurat')} THEN ${m.alamat_surat_menyurat || null} ELSE alamat_surat_menyurat END,
            alamat_tetap           = CASE WHEN ${Object.prototype.hasOwnProperty.call(m, 'alamat_tetap')} THEN ${m.alamat_tetap || null} ELSE alamat_tetap END
          WHERE (no_ahli = ${m.no_ahli || null} AND ${m.no_ahli || null} IS NOT NULL)
             OR (email = ${m.email || null} AND ${m.email || null} IS NOT NULL)
          RETURNING *
        `;

        if (updatedRows.length === 0) {
          res.status(404).json({ success: false, error: 'Member record not found.' });
          return;
        }

        res.status(200).json({ success: true, member: updatedRows[0] });
        return;
      }

      default:
        res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ success: false, error: err.message || 'Database error' });
  }
};
