const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '../../uploads/site');
const COVER_PATH = path.join(SITE_DIR, 'cover');

// ─── GET /api/settings ────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  // Find any cover file (jpg/png/webp/gif)
  let coverImageUrl = null;
  if (fs.existsSync(SITE_DIR)) {
    const files = fs.readdirSync(SITE_DIR);
    const coverFile = files.find(f => f.startsWith('cover.'));
    if (coverFile) coverImageUrl = `/uploads/site/${coverFile}`;
  }
  res.json({ success: true, data: { coverImageUrl } });
};

// ─── POST /api/settings/cover ────────────────────────────────────────────────────
exports.uploadCover = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided' });
  }
  // Remove any OLD cover files with a DIFFERENT extension (multer already saved the new one)
  if (fs.existsSync(SITE_DIR)) {
    fs.readdirSync(SITE_DIR)
      .filter(f => f.startsWith('cover.') && f !== req.file.filename)
      .forEach(f => { try { fs.unlinkSync(path.join(SITE_DIR, f)); } catch (_) {} });
  }
  const coverImageUrl = `/uploads/site/${req.file.filename}`;
  res.json({ success: true, data: { coverImageUrl } });
};

// ─── DELETE /api/settings/cover ───────────────────────────────────────────────
exports.deleteCover = async (req, res) => {
  if (fs.existsSync(SITE_DIR)) {
    fs.readdirSync(SITE_DIR)
      .filter(f => f.startsWith('cover.'))
      .forEach(f => fs.unlinkSync(path.join(SITE_DIR, f)));
  }
  res.json({ success: true, data: { coverImageUrl: null } });
};
