import React, { useMemo, useState, useEffect } from 'react';
import { downloadCsv } from '../utils/csvExport';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

function ensureUrl(u) {
  if (!u) return '';
  const trimmed = u.toString().trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

// Generate consistent color for each keyword using a hash function
function getKeywordColor(keyword) {
  if (!keyword) return { bg: '#f3f4f6', text: '#6b7280' }; // gray for empty
  
  const colors = [
    { bg: '#dbeafe', text: '#1e40af' }, // blue
    { bg: '#d1fae5', text: '#047857' }, // green
    { bg: '#fce7f3', text: '#be185d' }, // pink
    { bg: '#ede9fe', text: '#6d28d9' }, // purple
    { bg: '#fed7aa', text: '#c2410c' }, // orange
    { bg: '#fef3c7', text: '#a16207' }, // yellow
    { bg: '#fecaca', text: '#b91c1c' }, // red
    { bg: '#e0e7ff', text: '#4338ca' }, // indigo
    { bg: '#ccfbf1', text: '#0f766e' }, // teal
    { bg: '#fbcfe8', text: '#a21caf' }, // fuchsia
    { bg: '#fef9c3', text: '#854d0e' }, // amber
    { bg: '#d1d5db', text: '#374151' }, // gray
    { bg: '#bfdbfe', text: '#1e3a8a' }, // light blue
    { bg: '#bbf7d0', text: '#14532d' }, // light green
    { bg: '#fbcfe8', text: '#831843' }, // rose
  ];
  
  // Better hash function with less collisions
  let hash = 0;
  const str = keyword.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function SheetTable({ rows = [], columns = [], pageSize = 10, resetSortSignal, onReset }) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [page, setPage] = useState(0);
  // Default to show 100 items per page as requested
  const [perPage, setPerPage] = useState(pageSize || 100);
  // Start with no column sort so newest-first (reverse) is what the user sees initially
  const [sortBy, setSortBy] = useState({ column: null, direction: null });

  // Show latest first: assume incoming rows are chronological (append), so reverse to show newest first
  const baseRows = useMemo(() => (Array.isArray(rows) ? [...rows].reverse() : []), [rows]);

  const uniqueKeywords = useMemo(() => {
    const set = new Set();
    for (const r of baseRows) {
      const kw = (r.keyword ?? r.Keyword ?? '').toString().trim();
      if (kw) set.add(kw);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [baseRows]);

  const filtered = useMemo(() => {
    let out = baseRows;
    const toLower = s => (s || '').toString().toLowerCase();

    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      out = out.filter(r => columns.some(c => toLower(r[c]).includes(q)));
    }
    if (addressFilter) out = out.filter(r => toLower(r['formatted_address']).includes(addressFilter.toLowerCase()));
    if (keywordFilter) out = out.filter(r => toLower(r['keyword'] ?? r['Keyword']) === keywordFilter.toLowerCase());

    return out;
  }, [baseRows, globalSearch, addressFilter, keywordFilter, columns]);

  // Apply sorting to filtered rows
  const sorted = useMemo(() => {
    const copy = [...filtered];
    // If there is an explicit column sort, use it
    if (sortBy && sortBy.column) {
      const col = sortBy.column;
      const dir = sortBy.direction === 'asc' ? 1 : -1;
      copy.sort((a, b) => {
        const va = (a[col] ?? '').toString();
        const vb = (b[col] ?? '').toString();
        // try numeric compare if both are numeric
        const na = Number(va.replace(/[^0-9.-]+/g, ''));
        const nb = Number(vb.replace(/[^0-9.-]+/g, ''));
        if (!Number.isNaN(na) && !Number.isNaN(nb)) {
          return (na - nb) * dir;
        }
        return va.localeCompare(vb) * dir;
      });
      return copy;
    }

    // No explicit column sort — apply default weighted descending sort.
    // Fixed weights for sections/columns (adjustable here):
    const WEIGHTS = {
      Name: 1,
      website: 1,
      formatted_phone_number: 1,
      formatted_address: 1.5,
    };

    function scoreRow(r) {
      let score = 0;
      if (r.Name && r.Name.toString().trim() !== '') score += WEIGHTS.Name;
      if (r.website && r.website.toString().trim() !== '') score += WEIGHTS.website;
      if (r.formatted_phone_number && r.formatted_phone_number.toString().trim() !== '') score += WEIGHTS.formatted_phone_number;
      if (r.formatted_address && r.formatted_address.toString().trim() !== '') score += WEIGHTS.formatted_address;
      return score;
    }

    copy.sort((a, b) => {
      const sa = scoreRow(a);
      const sb = scoreRow(b);
      if (sa !== sb) return sb - sa; // descending by score
      // tie-breaker: Name descending (so 'Z' before 'A')
      const na = (a.Name ?? '').toString();
      const nb = (b.Name ?? '').toString();
      return nb.localeCompare(na);
    });
    return copy;
  }, [filtered, sortBy]);

  useEffect(() => { setPage(0); }, [globalSearch, addressFilter, keywordFilter, perPage]);

  // Keep perPage in sync if parent changes pageSize prop
  useEffect(() => {
    setPerPage(pageSize || 100);
  }, [pageSize]);

  // Reset sorting when parent issues a reset signal
  useEffect(() => {
    if (typeof resetSortSignal === 'undefined') return;
    setSortBy({ column: null, direction: null });
    setPage(0);
  }, [resetSortSignal]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const pageRows = sorted.slice(page * perPage, (page + 1) * perPage);

  function exportCsv() {
    downloadCsv('sheet-data.csv', sorted);
  }

  function goto(p) {
    if (p < 0 || p >= pageCount) return;
    setPage(p);
  }

  // Header click: first click -> asc, second click -> desc, toggles between asc/desc for the same column.
  function onHeaderClick(col) {
    setPage(0);
    setSortBy(prev => {
      if (!prev || prev.column !== col) {
        return { column: col, direction: 'asc' };
      }
      // same column: toggle between asc and desc (if prev was desc, go asc; if asc, go desc)
      if (prev.direction === 'desc') return { column: col, direction: 'asc' };
      return { column: col, direction: 'desc' };
    });
  }

  function displayHeaderLabel(c) {
    if (c === 'formatted_phone_number') return 'Phone';
    if (c === 'formatted_address') return 'Address';
    if (c === 'website') return 'Website';
    if (c === 'keyword') return 'Keyword';
    return c;
  }

  return (
    <div>
      <div className="controls" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search anythings..." />
        {/* <input value={addressFilter} onChange={e => setAddressFilter(e.target.value)} placeholder="Filter by Address" /> */}
        <select value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)} aria-label="Filter by Keyword">
          <option value="">All keywords</option>
          {uniqueKeywords.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
  <button className="btn" onClick={() => { setGlobalSearch(''); setAddressFilter(''); setKeywordFilter(''); }}>Clear</button>
  <button className="btn" onClick={() => { setSortBy({ column: null, direction: null }); setPage(0); if (typeof onReset === 'function') onReset(); }}>Reset Sort</button>
  <button className="btn" onClick={exportCsv}>Export CSV</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }} className="small">
          <div>{filtered.length} row(s)</div>
          <label className="small">Show</label>
          <select value={perPage} onChange={e => setPerPage(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="small">per page</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>SL</th>
            {columns.map(c => (
              <th key={c} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onHeaderClick(c)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>{displayHeaderLabel(c)}</span>
                  {sortBy && sortBy.column === c ? (
                    sortBy.direction === 'asc' ? <FiArrowUp title="Ascending" aria-label="ascending" /> : <FiArrowDown title="Descending" aria-label="descending" />
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r, i) => {
            const overallIndex = page * perPage + i;
            const sl = overallIndex + 1;
            return (
              <tr key={i}>
                <td>{sl}</td>
                {columns.map(c => (
                  <td key={c} className={c === 'website' ? 'website-cell' : (c === 'formatted_phone_number' ? 'phone-cell' : '')}>
                    {c === 'website' && r[c] ? (
                      <a title={r[c]} href={ensureUrl(r[c])} target="_blank" rel="noreferrer">{r[c]}</a>
                    ) : c === 'keyword' && r[c] ? (
                      (() => {
                        const keywordValue = r[c].toString().trim();
                        const colors = getKeywordColor(keywordValue);
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            backgroundColor: colors.bg,
                            color: colors.text,
                          }}>
                            {keywordValue}
                          </span>
                        );
                      })()
                    ) : (
                      r[c] ?? ''
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pagination">
          <button className="btn" onClick={() => goto(0)} disabled={page === 0}>First</button>
          <button className="btn" onClick={() => goto(page - 1)} disabled={page === 0}>Prev</button>
          <span style={{ padding: '0 8px' }}>Page {page + 1} / {pageCount}</span>
          <button className="btn" onClick={() => goto(page + 1)} disabled={page >= pageCount - 1}>Next</button>
          <button className="btn" onClick={() => goto(pageCount - 1)} disabled={page >= pageCount - 1}>Last</button>
        </div>
        <div className="small">Showing {pageRows.length} rows</div>
      </div>
    </div>
  );
}
