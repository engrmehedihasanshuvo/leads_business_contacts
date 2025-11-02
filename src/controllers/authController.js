import { parseCSVTextToRows } from '../models/leadModel';
import UserModel from '../models/userModel';
import { fetchSheetRows } from '../services/apiService';

// Authenticate a user against the USER sheet and return a UserModel instance
export async function loginWithSheet(sheetId, email, password) {
  const rows = await fetchSheetRows(sheetId, 'USER');
  if (!rows || rows.length === 0) return null;

  // normalize header keys for lookup
  const normalizedRows = rows.map(r => {
    const nr = {};
    Object.keys(r).forEach(k => {
      const nk = k.toString().toLowerCase().trim().replace(/\s+/g, '_');
      nr[nk] = (r[k] || '').toString().trim();
    });
    return nr;
  });

  const match = normalizedRows.find(r => {
    const e = (r.email || r.e || '').toString().trim();
    const p = (r.password || r.p || '').toString().trim();
    return e.toLowerCase() === (email || '').toLowerCase() && p === (password || '');
  });

  if (!match) return null;
  return UserModel.fromNormalizedRow(match);
}

export function persistUserToLocal(userModel) {
  try {
    localStorage.setItem('zensoft_user', JSON.stringify(userModel.toJSON()));
  } catch (e) { /* ignore */ }
}

export function loadUserFromLocal() {
  try {
    const raw = localStorage.getItem('zensoft_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw || '{}');
    return new UserModel(parsed);
  } catch (e) { return null; }
}

export function clearLocalUser() {
  try { localStorage.removeItem('zensoft_user'); } catch (e) { }
}

// Fetch the latest user row from the USER sheet by email. Returns UserModel or null.
export async function fetchUserFromSheet(sheetId, email) {
  if (!email) return null;
  try {
    const rows = await fetchSheetRows(sheetId, 'USER');
    if (!rows || rows.length === 0) return null;
    const normalizedRows = rows.map(r => {
      const nr = {};
      Object.keys(r).forEach(k => {
        const nk = k.toString().toLowerCase().trim().replace(/\s+/g, '_');
        nr[nk] = (r[k] || '').toString().trim();
      });
      return nr;
    });
    const match = normalizedRows.find(r => ((r.email || r.e || '').toString().trim().toLowerCase() === (email || '').toLowerCase()));
    if (!match) return null;
    return UserModel.fromNormalizedRow(match);
  } catch (err) {
    console.error('fetchUserFromSheet error', err);
    return null;
  }
}

export default { loginWithSheet, persistUserToLocal, loadUserFromLocal, clearLocalUser, fetchUserFromSheet };
