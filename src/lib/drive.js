import { accessToken } from './stores.js';
import { get } from 'svelte/store';

export const FOLDERS = {
  input:     '1kh24IJPG_h_R3Jrp83oUZWi3M4RxkAQI',
  monday:    '1nuNs04PMRNeBMbCh5vwKo5687y-3guXe',
  tuesday:   '1uMeu0lqp5jQ9AqVLjGMtSKg9DH4MkH6f',
  wednesday: '1QRo0XUVn4Z51HYEwRs6K6FjyKDfimvXa',
  thursday:  '1vNxfwN1m7ygt5iBYyi021yInA6SG-9Pc',
  friday:    '1dl9bOAJv-4iYtl7JbX72smmVBcPC_Yq8',
  saturday:  '1qo7wck8u8Tp8AyzQBS2uirL9sLlTlOOY',
  sunday:    '1zgvnJvMz2q2yDAdtao4WhNEVGGJuUZOB',
  sewera:    '1Ni30IrmlkN8tEF2IHkWjP6DOJ4JH36-T',
  dobromir:  '1rt5sG17r_fC0PT1JhGWwTp2wvzskAedu',
};

let tokenClient = null;

function getClientId() {
  const meta = document.querySelector('meta[name="google-client-id"]');
  return meta ? meta.content : '';
}

function getToken() {
  return get(accessToken);
}

function requireAuth() {
  if (!getToken()) {
    throw new Error('Not authenticated. Please connect Google Drive first.');
  }
}

export function initDrive() {
  const clientId = getClientId();
  if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
    console.warn('Google Client ID not configured.');
    return;
  }

  if (typeof google === 'undefined' || !google.accounts) {
    console.warn('Google Identity Services library not loaded.');
    return;
  }

  google.accounts.id.disableAutoSelect();

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive',
    callback: (response) => {
      if (response.error) {
        console.error('OAuth error:', response.error);
        accessToken.set(null);
        return;
      }
      sessionStorage.setItem('driveToken', response.access_token);
      accessToken.set(response.access_token);
    },
  });

  const saved = sessionStorage.getItem('driveToken');
  if (saved) {
    fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + saved)
      .then((resp) => {
        if (resp.ok) {
          accessToken.set(saved);
        } else {
          sessionStorage.removeItem('driveToken');
        }
      })
      .catch(() => {
        sessionStorage.removeItem('driveToken');
      });
  }
}

export function signIn() {
  if (!tokenClient) {
    initDrive();
  }
  if (tokenClient) {
    tokenClient.requestAccessToken();
  }
}

export function disconnectDrive() {
  const token = getToken();
  if (token) {
    google.accounts.oauth2.revoke(token);
  }
  accessToken.set(null);
  sessionStorage.removeItem('driveToken');
}

export async function uploadFile(file, folderId) {
  requireAuth();
  const metadata = { name: file.name, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + getToken() },
    body: form,
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Upload failed: ' + err);
  }
  return resp.json();
}

export async function listFiles(folderId) {
  requireAuth();
  const q = encodeURIComponent("'" + folderId + "' in parents and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false");
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + q + '&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,webViewLink)';
  const resp = await fetch(url, {
    headers: { Authorization: 'Bearer ' + getToken() },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('List files failed: ' + err);
  }
  const data = await resp.json();
  return data.files || [];
}

export async function deleteFile(fileId) {
  requireAuth();
  const resp = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + getToken() },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Delete failed: ' + err);
  }
}

export async function downloadFile(fileId) {
  requireAuth();
  const resp = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + getToken() },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Download failed: ' + err);
  }
  return resp.arrayBuffer();
}

export function waitForGSI() {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window._gsiReady &&
          typeof google !== 'undefined' &&
          google.accounts &&
          google.accounts.oauth2 &&
          typeof google.accounts.oauth2.initTokenClient === 'function') {
        clearInterval(interval);
        resolve();
      }
    }, 100);
    setTimeout(() => { clearInterval(interval); resolve(); }, 10000);
  });
}
