import { neon } from '@neondatabase/serverless';

function detectDelimiter(line) {
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    return ';';
  }
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t';
  }
  return ',';
}

function parseCsvLine(line, delimiter = ',') {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(header) {
  return (header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function isHeaderRow(values) {
  const normalizedValues = values.map(value => normalizeHeader(value));
  const fieldAliases = [
    ['no_ahli', 'no ahli', 'noahli', 'membership_no', 'membership no', 'membership_number', 'no. ahli'],
    ['syarikat', 'nama_syarikat', 'company_name', 'companyname'],
    ['ssm', 'ssm_no', 'ssm no'],
    ['tmph_ssm', 'tempoh_ssm', 'expiry_validity'],
    ['proksi', 'title_proksi', 'representative', 'proksi_name'],
    ['kp', 'no_kp', 'ic_number'],
    ['introducer', 'pencadang'],
    ['email', 'email_address'],
    ['phone', 'h_phone', 'mobile', 'phone_number'],
    ['pegawai', 'pegawai_hubungi', 'contact_person'],
    ['tel_pejabat', 'tel_pejabat_office_phone', 'office_phone'],
    ['whatsapp', 'group_whatsapp'],
    ['tahun', 'year_join'],
    ['kategori', 'category'],
    ['jenis_perniagaan', 'type_of_business'],
    ['no_resit', 'receipt_no'],
    ['tarikh_bayar', 'payment_date'],
    ['status', 'membership_status'],
    ['surat', 'alamat_surat_menyurat', 'mailing_address'],
    ['alamat', 'alamat_tetap', 'registered_address']
  ];

  return normalizedValues.some(value => fieldAliases.some(aliasSet => aliasSet.includes(value)));
}

function getValue(row, aliases) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    if (row[normalizedAlias] !== undefined) {
      return row[normalizedAlias];
    }
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      res.status(500).json({ success: false, error: 'DATABASE_URL is not configured.' });
      return;
    }

    const sql = neon(connectionString);

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

    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const csv = rawBody?.csv || rawBody?.data?.csv || rawBody?.body || '';

    if (typeof csv !== 'string' || !csv.trim()) {
      res.status(400).json({ success: false, error: 'CSV content is empty.' });
      return;
    }

    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      res.status(400).json({ success: false, error: 'CSV must include a header row and at least one data row.' });
      return;
    }

    const delimiter = detectDelimiter(lines[0]);
    const firstLineValues = parseCsvLine(lines[0], delimiter).map(h => h.trim().replace(/^\uFEFF/, ''));
    const hasHeader = isHeaderRow(firstLineValues);
    const rows = hasHeader ? lines.slice(1) : lines;

    let inserted = 0;
    for (const line of rows) {
      const values = parseCsvLine(line, delimiter);
      if (values.length < 1) {
        continue;
      }

      let row = {};
      if (hasHeader) {
        const normalizedHeaders = firstLineValues.map(normalizeHeader);
        const valueMap = Object.fromEntries(normalizedHeaders.map((header, index) => [header, values[index] || '']));
        row = Object.fromEntries(Object.entries(valueMap).filter(([, value]) => value !== ''));
      } else {
        const positionalValues = values.slice(0, 20);
        row = Object.fromEntries([
          ['no_ahli', positionalValues[0] || ''],
          ['syarikat', positionalValues[1] || ''],
          ['ssm', positionalValues[2] || ''],
          ['tmph_ssm', positionalValues[3] || ''],
          ['proksi', positionalValues[4] || ''],
          ['kp', positionalValues[5] || ''],
          ['introducer', positionalValues[6] || ''],
          ['email', positionalValues[7] || ''],
          ['phone', positionalValues[8] || ''],
          ['pegawai', positionalValues[9] || ''],
          ['tel_pejabat', positionalValues[10] || ''],
          ['whatsapp', positionalValues[11] || ''],
          ['tahun', positionalValues[12] || ''],
          ['kategori', positionalValues[13] || ''],
          ['jenis_perniagaan', positionalValues[14] || ''],
          ['no_resit', positionalValues[15] || ''],
          ['tarikh_bayar', positionalValues[16] || ''],
          ['status', positionalValues[17] || ''],
          ['surat', positionalValues[18] || ''],
          ['alamat', positionalValues[19] || '']
        ]);
      }

      const noAhli = getValue(row, ['no_ahli', 'no ahli', 'noahli', 'membership_no', 'membership no', 'membership_number', 'no. ahli']);
      const syarikat = getValue(row, ['syarikat', 'nama_syarikat', 'company_name', 'companyname']);
      const ssm = getValue(row, ['ssm', 'ssm_no', 'ssm no']);
      const tmphSsm = getValue(row, ['tmph_ssm', 'tempoh_ssm', 'expiry_validity']);
      const proksi = getValue(row, ['proksi', 'title_proksi', 'representative', 'proksi_name']);
      const kp = getValue(row, ['kp', 'no_kp', 'ic_number']);
      const introducer = getValue(row, ['introducer', 'pencadang']);
      const email = getValue(row, ['email', 'email_address']);
      const phone = getValue(row, ['phone', 'h_phone', 'mobile', 'phone_number']);
      const pegawai = getValue(row, ['pegawai', 'pegawai_hubungi', 'contact_person']);
      const telPejabat = getValue(row, ['tel_pejabat', 'tel_pejabat_office_phone', 'office_phone']);
      const whatsapp = getValue(row, ['whatsapp', 'group_whatsapp']);
      const tahun = getValue(row, ['tahun', 'year_join']);
      const kategori = getValue(row, ['kategori', 'category']);
      const jenisPerniagaan = getValue(row, ['jenis_perniagaan', 'type_of_business']);
      const noResit = getValue(row, ['no_resit', 'receipt_no']);
      const tarikhBayar = getValue(row, ['tarikh_bayar', 'payment_date']);
      const status = getValue(row, ['status', 'membership_status']) || 'Aktif';
      const surat = getValue(row, ['surat', 'alamat_surat_menyurat', 'mailing_address']);
      const alamat = getValue(row, ['alamat', 'alamat_tetap', 'registered_address']);

      await sql`
        INSERT INTO members (
          no_ahli, syarikat, ssm, tmph_ssm, proksi, kp, introducer,
          email, phone, pegawai, tel_pejabat, whatsapp, tahun, kategori,
          jenis_perniagaan, no_resit, tarikh_bayar, status, surat, alamat
        ) VALUES (
          ${noAhli},
          ${syarikat},
          ${ssm},
          ${tmphSsm},
          ${proksi},
          ${kp},
          ${introducer},
          ${email},
          ${phone},
          ${pegawai},
          ${telPejabat},
          ${whatsapp},
          ${tahun},
          ${kategori},
          ${jenisPerniagaan},
          ${noResit},
          ${tarikhBayar},
          ${status},
          ${surat},
          ${alamat}
        )
      `;

      inserted += 1;
    }

    res.json({ success: true, inserted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
