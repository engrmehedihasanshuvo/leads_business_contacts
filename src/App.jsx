import React from 'react';
import SheetTable from './components/SheetTable';
import AnimatedBackground from './components/AnimatedBackground';
import Login from './components/Login';
import EmptyState from './components/EmptyState';
import Snackbar from './components/Snackbar';
import { useAppController } from './controllers/appController';

export default function App() {
  // useAppController contains all application logic (state, effects, actions)
  const controller = useAppController();
  const {
    query, setQuery, leads, sheetData, loading, resetSignal, user, searchError, toastMessage,
    setToastMessage, setSearchError, handleSubmit, handleReload, onResetSortAndReload, handleLogout, handleLogin,
    // auth
    authError, loginLoading, handleLoginSubmit,
    // duplicates
    rawRows, dedupedRows, duplicatesCount, showDuplicates, toggleShowDuplicates, removeDuplicates,
  } = controller;

  // Derived counters from user fields for display
  const totalQuery = Number((controller?.user?.totalQuery ?? controller?.user?.total_query) || 0);
  const generateDataCount = Number((controller?.user?.generateDataCount ?? controller?.user?.generate_data_count) || 0);
  // Current total data visible in the sheet = rows shown + duplicates found (10 + 0 in your example)
  const currentSheetTotal = Number((sheetData?.length || 0)) + Number(duplicatesCount || 0);
  // Deletions needed = how many more rows exist in sheet historically than are visible now
  // Example: Generated(40) - Current(10) = 30
  const deleteCount = generateDataCount > currentSheetTotal ? (generateDataCount - currentSheetTotal) : 0;

  // If user not logged in show login screen
  if (!user) {
    return (
      <div className="app-root">
        <AnimatedBackground />
        <Login onSubmit={handleLoginSubmit} loading={loginLoading} error={authError} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <AnimatedBackground />
      <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Zensoft Lab — Leads & Business Contacts</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right', marginRight: 6 }}>
            <div className="small" style={{ marginBottom: 4 }}>Signed in: <strong>{user.email}</strong></div>
            <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}>
              <span style={{ color: '#1e40af' }}>Search Limit: <strong>{Number(user.searchLimit) || '—'}</strong></span>
              <span style={{ color: '#047857' }}>Current Access: <strong>{Number(user.currentAccess) || 0}</strong></span>
              <span style={{ color: '#7c3aed' }}>Total Query: <strong>{totalQuery}</strong></span>
              <span style={{ color: '#ea580c' }}>Generated Data: <strong>{generateDataCount}</strong></span>
              <span style={{ color: '#dc2626' }}>Delete Item: <strong>{deleteCount}</strong> <span style={{ color:'#64748b' }}>({generateDataCount} - {currentSheetTotal})</span></span>
            </div>
          </div>
          <button className="btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 12 }}>
        <div className="controls">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSearchError(''); }}
            placeholder="Enter a niche, business type, or keyword (e.g. hospital, Dhaka)"
            style={{ flex: 1 }}
            disabled={loading || (user && Number(user.currentAccess) <= 0)}
            aria-disabled={loading || (user && Number(user.currentAccess) <= 0)}
            title={(user && Number(user.currentAccess) <= 0) ? 'You have completed your search limit' : ''}
          />
          {loading ? (
            <div title="Searching…" aria-label="Searching" className="spinner spinner-sm" />
          ) : (
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || (user && Number(user.currentAccess) <= 0)}
              title={(user && Number(user.currentAccess) <= 0) ? 'You have completed your search limit' : ''}
            >Search</button>
          )}
        </div>
        {/* {searchError && <div className="search-error">{searchError}</div>} */}
      </form>

      <section>
        <h3 className="text-center">Leads Data</h3>
        {duplicatesCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="small">Duplicates found: <strong>{duplicatesCount}</strong></div>
            <button className="btn" onClick={() => toggleShowDuplicates()}>{showDuplicates ? 'Hide duplicates' : 'Show duplicates'}</button>
            <button
              className="btn"
              onClick={() => removeDuplicates()}
              disabled={loading}
              aria-disabled={loading}
              title={loading ? 'Working…' : 'Remove duplicates'}
            >{loading ? 'Removing…' : 'Remove duplicates'}</button>
          </div>
        )}
        {(!loading && (!sheetData || sheetData.length === 0)) ? (
          <EmptyState
            title="No data found"
            message="Try a different keyword, adjust filters, or run a new search."
          />
        ) : (
          <SheetTable
            rows={sheetData}
            columns={["Name", "formatted_phone_number", "website", "formatted_address", "keyword"]}
            pageSize={100}
            resetSortSignal={resetSignal}
            onReset={onResetSortAndReload}
          />
        )}
      </section>
      </div>
      {/* Global lightweight loading overlay for long actions (search/remove) */}
      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
          <div className="loading-inner">
            <div className="spinner" aria-hidden="true" />
            <div className="loading-text">Working…</div>
          </div>
        </div>
      )}
      <footer className="app-footer" aria-label="Site footer">
        <div className="footer-inner">
          © {new Date().getFullYear()} Zensoft Lab — 
          <a className="footer-link" href="http://zensoftlab.com/" target="_blank" rel="noopener noreferrer">zensoftlab.com</a>
          <span style={{ margin: '0 8px', color: 'rgba(17,24,39,0.4)' }}>|</span>
          Made by <a className="footer-link" href="https://facebook.com/mehedi.hasan.shuvo.375976" target="_blank" rel="noopener noreferrer">Mehedi Hasan Shuvo</a>
        </div>
      </footer>
      {/* Snackbar / toast for validation & short messages */}
      <Snackbar message={toastMessage} duration={5000} onClose={() => setToastMessage('')} />
    </div>
  );
}
