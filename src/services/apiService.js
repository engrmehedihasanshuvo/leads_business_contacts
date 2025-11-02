import axios from 'axios';
import { parseCSVTextToRows } from '../models/leadModel';

const defaultSheetBase = id => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=`;

export async function postWebhook(url, payload) {
  const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
  return res.data;
}

// Post a delete-duplicates request to a webhook or service that will edit the Google Sheet.
export async function postDeleteDuplicates(url, payload) {
  if (!url) throw new Error('No remove-duplicates URL provided');
  const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
  return res.data;
}

// Fetch a public Google sheet tab and return parsed rows (array of objects)
export async function fetchSheetRows(sheetId, sheetName = 'Sheet1') {
  const base = defaultSheetBase(sheetId);
  const encoded = encodeURIComponent(sheetName || 'Sheet1');
  const url = `${base}${encoded}`;
  const res = await axios.get(url, { responseType: 'text' });
  const text = (res.data || '').trim();
  if (!text) return [];
  const rows = parseCSVTextToRows(text);
  return rows;
}

export default { postWebhook, fetchSheetRows };
