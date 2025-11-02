// Utilities for normalizing lead rows and parsing CSV text into row objects
export function normalizeRow(raw) {
  const obj = {};
  for (const k of Object.keys(raw || {})) {
    const lk = k.toString().toLowerCase().trim();
    const v = raw[k];
    if (!obj.Name && /(^name$|business_name|business|company)/i.test(lk)) {
      obj.Name = v;
      continue;
    }
    if (!obj.formatted_phone_number && /(phone|telephone|formatted_phone_number|contact)/i.test(lk)) {
      obj.formatted_phone_number = v;
      continue;
    }
    if (!obj.website && /(website|url|web)/i.test(lk)) {
      obj.website = v;
      continue;
    }
    if (!obj.formatted_address && /(address|formatted_address|location)/i.test(lk)) {
      obj.formatted_address = v;
      continue;
    }
    obj[k] = v;
  }
  obj.Name = obj.Name || raw.Name || raw.name || '';
  obj.formatted_phone_number = obj.formatted_phone_number || raw.formatted_phone_number || raw.phone || raw.telephone || '';
  obj.website = obj.website || raw.website || raw.url || '';
  obj.formatted_address = obj.formatted_address || raw.formatted_address || raw.address || '';
  return obj;
}

// Parse CSV text into an array of objects. Handles quoted commas.
export function parseCSVTextToRows(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return [];
  const headers = lines[0].split(/,(?=(?:[^"]*"[^"]*")*[^\"]*$)/).map(h => h.replace(/^\s*"?|"?\s*$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(/,(?=(?:[^\"]*"[^\"]*")*[^\"]*$)/).map(c => c.replace(/^\s*"?|"?\s*$/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
  return rows;
}

// Deduplicate rows. Uses a simple composite key (name + phone + website + address) lower-cased.
// Returns an object with deduped array and duplicateCount (number of rows removed).
// Row numbers are 2-based (assuming row 1 is the header in Google Sheets).
export function dedupeRows(rows) {
  if (!Array.isArray(rows)) return { deduped: [], duplicateCount: 0, duplicates: [] };
  const seen = new Map();
  const deduped = [];
  const duplicates = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = (r.Name || r.name || '').toString().trim().toLowerCase();
    const phone = (r.formatted_phone_number || r.phone || '').toString().replace(/\D/g, '').toLowerCase();
    const website = (r.website || r.url || '').toString().trim().toLowerCase();
    const addr = (r.formatted_address || r.address || '').toString().trim().toLowerCase();
    const key = `${name}||${phone}||${website}||${addr}`;
    if (seen.has(key)) {
      // push the duplicate row with its row number (i + 2 because row 1 is header, array is 0-indexed)
      duplicates.push({ ...r, rowNumber: i + 2 });
    } else {
      seen.set(key, true);
      deduped.push(r);
    }
  }
  return { deduped, duplicateCount: duplicates.length, duplicates };
}

export default { normalizeRow, parseCSVTextToRows };
