const fs = require('fs');
const path = require('path');

const PORTAL_AUDIO_DIR = path.join(__dirname, '../../tmp/patient-portal-audio');

if (!fs.existsSync(PORTAL_AUDIO_DIR)) {
  fs.mkdirSync(PORTAL_AUDIO_DIR, { recursive: true });
}

function getStoredAudioExtension(mimeType) {
  const normalized = String(mimeType || '').split(';')[0].trim().toLowerCase();

  switch (normalized) {
    case 'audio/mp4':
    case 'audio/x-m4a':
    case 'audio/aac':
      return 'm4a';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    default:
      return 'webm';
  }
}

function getStoredAudioPath(messageId, mimeType) {
  return path.join(PORTAL_AUDIO_DIR, `${messageId}.${getStoredAudioExtension(mimeType)}`);
}

function decodeHeaderValue(value) {
  if (!value) return null;

  const normalized = Array.isArray(value) ? value[0] : value;
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

module.exports = {
  PORTAL_AUDIO_DIR,
  getStoredAudioExtension,
  getStoredAudioPath,
  decodeHeaderValue,
};