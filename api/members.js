// /api/members.js
// Vercel Serverless Function — targets the 'members' table (same schema as
// server.js), using the Neon HTTP driver which is the recommended choice
// for serverless functions (no persistent connection to manage).
//
// Requires DATABASE_URL to be set in Vercel Project Settings > Environment
// Variables (Production/Preview/Development as needed).

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
        const setClauses = [];
        const values = [];
        EDITABLE_FIELDS.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(m, field)) {
            setClauses.push(field);
            values.push(m[field] === '' ? null : m[field]);
          }
        });
        if (setClauses.length === 0) {
          res.status(400).json({ success: false, error: 'No fields to update.' });
          return;
        }
        const setSql = setClauses.map((col, i) => `${col} = $${i + 1}`).join(', ');
        values.push(m.no_ahli || null, m.email || null);
        const whereNoAhliIdx = values.length - 1;
        const whereEmailIdx = values.length;
        const result = await sql.query(
          `UPDATE members SET ${setSql}
           WHERE (no_ahli = $${whereNoAhliIdx} AND $${whereNoAhliIdx} IS NOT NULL) OR email = $${whereEmailIdx}
           RETURNING *`,
          values
        );
        if (result.length === 0) {
          res.status(404).json({ success: false, error: 'Member record not found.' });
          return;
        }
        res.status(200).json({ success: true, member: result[0] });
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
