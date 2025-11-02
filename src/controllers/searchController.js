import { postWebhook, fetchSheetRows } from '../services/apiService';
import { normalizeRow, parseCSVTextToRows } from '../models/leadModel';
import UserModel from '../models/userModel';

// Run a search via webhook and return normalized leads/sheet rows and updated user
export async function doSearch(webhookUrl, query, user) {
  // Include the signed-in user's email with the search request so the webhook
  // can attribute/validate usage server-side (n8n/Apps Script, etc.)
  const payload = {
    query,
    email: (user && (user.email || user.e)) || '',
  };
  const data = await postWebhook(webhookUrl, payload);
  const leads = (data && data.leads) || [];

  let sheetRows = [];
  if (data && Array.isArray(data.sheetData)) sheetRows = data.sheetData;
  else if (data && Array.isArray(data.sheetRows)) sheetRows = data.sheetRows;
  else if (Array.isArray(data)) sheetRows = data;
  else if (typeof data === 'string') sheetRows = parseCSVTextToRows(data);

  const normalized = (sheetRows || []).map(r => normalizeRow(r));

  let updatedUser = null;
  try {
    if (user instanceof UserModel) {
      // clone and decrement
      updatedUser = new UserModel(user.toJSON());
      updatedUser.decrementAccess();
    } else if (user && typeof user === 'object') {
      updatedUser = new UserModel(user);
      updatedUser.decrementAccess();
    }
  } catch (e) { updatedUser = null; }

  return { leads, rows: normalized.slice().reverse(), updatedUser };
}

export async function fetchSheet(sheetId, sheetName = 'Sheet1') {
  const rows = await fetchSheetRows(sheetId, sheetName);
  const normalized = (rows || []).map(r => normalizeRow(r));
  return normalized.slice().reverse();
}

export default { doSearch, fetchSheet };
