import { useEffect, useRef, useState } from 'react';
import { doSearch as controllerDoSearch, fetchSheet as controllerFetchSheet } from './searchController';
import { dedupeRows } from '../models/leadModel';
import { loadUserFromLocal, persistUserToLocal, clearLocalUser, loginWithSheet, fetchUserFromSheet } from './authController';
import { postDeleteDuplicates } from '../services/apiService';

const WEBHOOK_URL = process.env.REACT_APP_WEBHOOK_URL || null;
const SHEET_ID = process.env.REACT_APP_SHEET_ID || null;
const REMOVE_DUPLICATES_WEBHOOK = process.env.REACT_APP_REMOVE_DUPLICATES_WEBHOOK_URL || null;
// Optional auto-refresh for repeating the last search (ms). 0 or unset disables.
const AUTO_REFRESH_MS = Number(process.env.REACT_APP_AUTO_REFRESH_MS || 0);

// Debug: show resolved env values in the browser console to help troubleshoot .env uptake
try {
  console.debug('ENV: REACT_APP_WEBHOOK_URL=', process.env.REACT_APP_WEBHOOK_URL);
  console.debug('ENV: REACT_APP_SHEET_ID=', process.env.REACT_APP_SHEET_ID);
  console.debug('ENV: REACT_APP_REMOVE_DUPLICATES_WEBHOOK_URL=', process.env.REACT_APP_REMOVE_DUPLICATES_WEBHOOK_URL);
    console.debug('ENV: REACT_APP_AUTO_REFRESH_MS=', process.env.REACT_APP_AUTO_REFRESH_MS);
} catch (e) {
  console.debug(e.toString);
  // ignore in non-browser contexts
}

// Hook that encapsulates all application state and operations.
export function useAppController() {
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState([]);
  const [sheetData, setSheetData] = useState([]);
  const [rawRows, setRawRows] = useState([]); // original rows as fetched
  const [dedupedRows, setDedupedRows] = useState([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastQueryRef = useRef('');
  const [resetSignal, setResetSignal] = useState(0);
  const [user, setUser] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Runs a search using the searchController and updates state & persisted user
  async function doSearch(q) {
    setLoading(true);
    try {
      const { leads: gotLeads, rows, updatedUser } = await controllerDoSearch(WEBHOOK_URL, q, user);
  setLeads(gotLeads || []);
  setRawRows(rows || []);
  // compute deduped set and duplicates count
  const { deduped, duplicateCount } = dedupeRows(rows || []);
  setDedupedRows(deduped || []);
  setDuplicatesCount(duplicateCount || 0);
  // by default hide duplicates (show deduped list)
  setSheetData(showDuplicates ? (rows || []) : (deduped || []));
      if (updatedUser) {
        const plain = updatedUser.toJSON ? updatedUser.toJSON() : updatedUser;
        console.debug('Updating user after search, before:', user, 'after:', plain);
        setUser(plain);
        try { persistUserToLocal(updatedUser); } catch (e) { /* ignore */ }
      }
      // Try to refresh authoritative user row from sheet (in case sheet was updated server-side)
      try {
        const fresh = await fetchUserFromSheet(SHEET_ID, user && user.email ? user.email : null);
        if (fresh) {
          const plainFresh = fresh.toJSON();
          setUser(plainFresh);
          try { persistUserToLocal(fresh); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.debug('Unable to refresh user from sheet after search', err);
      }
      lastQueryRef.current = q;
      // After the webhook responds, refresh the sheet from source to ensure UI shows most recent state.
      try {
        await fetchSheetDirect(user && user.sheetName ? user.sheetName : 'Sheet1');
      } catch (e) { /* ignore soft refresh failure */ }
    } catch (err) {
      console.error('Request error', err);
      setToastMessage('Error calling webhook. Check console.');
    } finally {
      setLoading(false);
    }
  }

  // Form submit handler (keeps validation logic out of UI)
  function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSearchError('');
    const trimmed = (query || '').toString().trim();
    if (!trimmed || trimmed.length < 6) {
      const msg = 'Please enter at least 6 characters to search.';
      setSearchError(msg);
      setToastMessage(msg);
      return;
    }
    // Kick off the search and immediately clear the input field
    doSearch(trimmed);
    try { setQuery(''); } catch (_) {}
  }

  function handleReload() { doSearch(lastQueryRef.current || query); }

  async function fetchSheetDirect(sheetName = 'Sheet1') {
    try {
  const rows = await controllerFetchSheet(SHEET_ID, sheetName);
  setRawRows(rows || []);
  const { deduped, duplicateCount } = dedupeRows(rows || []);
  setDedupedRows(deduped || []);
  setDuplicatesCount(duplicateCount || 0);
  setSheetData(showDuplicates ? (rows || []) : (deduped || []));
      console.log('Loaded sheet directly, rows:', (rows || []).length, 'sheet:', sheetName, 'duplicates:', duplicateCount);
    } catch (err) {
      console.error('Error fetching sheet directly:', err);
      setToastMessage('Failed to load sheet directly. Check console.');
    }
  }

  function onResetSortAndReload() {
    setResetSignal(s => s + 1);
    fetchSheetDirect(user && user.sheetName ? user.sheetName : 'Sheet1');
  }

  function toggleShowDuplicates() {
    const next = !showDuplicates;
    setShowDuplicates(next);
    setSheetData(next ? rawRows.slice() : dedupedRows.slice());
  }

  // Optional periodic refresh of the last search. Disabled by default.
  useEffect(() => {
    if (!AUTO_REFRESH_MS || AUTO_REFRESH_MS <= 0) return;
    const tick = () => {
      // Only refresh when the tab is visible and we are not already loading
      try {
        if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return;
      } catch (_) { /* ignore */ }
      if (loading) return;
      if (lastQueryRef.current) doSearch(lastQueryRef.current);
    };
    const t = setInterval(tick, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [user, loading]);

  useEffect(() => { fetchSheetDirect(); }, []);

  useEffect(() => {
    try {
      const loaded = loadUserFromLocal();
      if (loaded) setUser(loaded.toJSON());
    } catch (err) { console.warn('Failed to load cached user', err); }
  }, []);

  // After loading local user, try to refresh authoritative values from sheet (e.g., currentAccess)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = loadUserFromLocal();
        if (raw && raw.email) {
          const fresh = await fetchUserFromSheet(SHEET_ID, raw.email);
          if (mounted && fresh) {
            setUser(fresh.toJSON());
            try { persistUserToLocal(fresh); } catch (e) { /* ignore */ }
          }
        }
      } catch (err) {
        console.warn('Failed to refresh user from sheet', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (user && user.sheetName) fetchSheetDirect(user.sheetName);
  }, [user]);

  function handleLogout() { try { clearLocalUser(); } catch (e) {} setUser(null); }

  function handleLogin(u) { setUser(u); }

  // Perform login using authController and update state
  async function handleLoginSubmit(email, password) {
    setAuthError('');
    setLoginLoading(true);
    try {
      const userModel = await loginWithSheet(SHEET_ID, email, password);
      if (!userModel) {
        setAuthError('Invalid email or password');
        return null;
      }
      persistUserToLocal(userModel);
      const plain = userModel.toJSON();
      setUser(plain);
      return plain;
    } catch (err) {
      console.error('Login error', err);
      setAuthError('Error contacting sheet. Check network.');
      return null;
    } finally {
      setLoginLoading(false);
    }
  }

  // Remove duplicates from the currently loaded rawRows.
  // If REMOVE_DUPLICATES_WEBHOOK is configured the duplicates will be POSTed to that endpoint
  // so a server (n8n / Apps Script) can delete them from the remote sheet. Otherwise do local-only removal.
  async function removeDuplicates() {
    const info = dedupeRows(rawRows || []);
    const duplicates = info.duplicates || [];
    if (!duplicates || duplicates.length === 0) {
      setToastMessage('No duplicates to remove.');
      return;
    }

    // If webhook configured, POST duplicates to it and refresh sheet on success
    if (REMOVE_DUPLICATES_WEBHOOK) {
      setLoading(true);
      setToastMessage(`Removing ${duplicates.length} duplicates on the sheet...`);
      try {
        const payload = {
          sheetId: SHEET_ID,
          sheetName: user && user.sheetName ? user.sheetName : 'Sheet1',
          duplicates,
        };
        console.debug('Calling remove-duplicates webhook', REMOVE_DUPLICATES_WEBHOOK, 'payload:', payload);
        const res = await postDeleteDuplicates(REMOVE_DUPLICATES_WEBHOOK, payload);
        console.debug('Remove duplicates webhook response:', res);
        
        // Show the response message from webhook
        const responseMessage = res?.message || res?.status || 'Duplicate data remove successfully';
        setToastMessage(responseMessage);
        
        // Keep loading effect while refreshing the sheet
        setToastMessage(`${responseMessage}. Refreshing sheet...`);
        
        // Refresh the sheet data to reflect deletions performed server-side
        await fetchSheetDirect(user && user.sheetName ? user.sheetName : 'Sheet1');
        
        // Show final success message after refresh
        setToastMessage(`${responseMessage}. Sheet refreshed successfully!`);
      } catch (err) {
        console.error('Failed to call remove-duplicates webhook:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        });
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error';
        setToastMessage(`Failed to remove duplicates: ${errorMsg}. Removed locally instead.`);
        // fallback to local removal
        setSheetData(dedupedRows.slice());
        setDuplicatesCount(0);
        setRawRows(dedupedRows.slice());
        setDedupedRows(dedupedRows.slice());
        setShowDuplicates(false);
      } finally {
        setLoading(false);
      }
    } else {
      // No webhook configured — perform local-only removal and inform the user
      setSheetData(dedupedRows.slice());
      setDuplicatesCount(0);
      setRawRows(dedupedRows.slice());
      setDedupedRows(dedupedRows.slice());
      setShowDuplicates(false);
      setToastMessage('Removed duplicates locally. To remove them from the remote sheet configure REACT_APP_REMOVE_DUPLICATES_WEBHOOK_URL to point to an n8n or Apps Script endpoint that will delete the rows.');
    }
  }

  return {
    query, setQuery,
    leads, sheetData,
    rawRows, dedupedRows, duplicatesCount,
    showDuplicates, toggleShowDuplicates,
    loading, resetSignal,
    user, searchError, toastMessage,
    setToastMessage,
    setSearchError,
    handleSubmit, handleReload, onResetSortAndReload,
    handleLogout, handleLogin,
    // auth-related
    authError, setAuthError, loginLoading, handleLoginSubmit,
    // duplicates control
    removeDuplicates,
  };
}

export default { useAppController };
