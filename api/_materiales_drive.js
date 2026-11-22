const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);
const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;

export function getDriveFileId(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !DRIVE_HOSTS.has(url.hostname.toLowerCase())) return null;

  const pathMatch = url.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
  const id = pathMatch?.[1] || url.searchParams.get('id');
  return id && DRIVE_ID.test(id) ? id : null;
}

export function drivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

