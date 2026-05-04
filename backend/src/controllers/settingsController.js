const prisma = require('../config/database');
const AppError = require('../utils/AppError');

const COVER_KEY = 'coverImageUrl';

const hasCloudinary = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// ─── GET /api/settings ────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  // First try DB (Cloudinary path)
  const row = await prisma.siteSettings.findUnique({ where: { key: COVER_KEY } });
  if (row?.value) {
    return res.json({ success: true, data: { coverImageUrl: row.value } });
  }

  // Fallback: check local disk (local dev without Cloudinary)
  const fs   = require('fs');
  const path = require('path');
  const SITE_DIR = path.join(__dirname, '../../uploads/site');
  let coverImageUrl = null;
  if (fs.existsSync(SITE_DIR)) {
    const files = fs.readdirSync(SITE_DIR);
    const coverFile = files.find(f => f.startsWith('cover.') && !f.endsWith('.txt'));
    if (coverFile) coverImageUrl = `/uploads/site/${coverFile}`;
  }
  res.json({ success: true, data: { coverImageUrl } });
};

// ─── POST /api/settings/cover ─────────────────────────────────────────────────
exports.uploadCover = async (req, res) => {
  if (!req.file) throw new AppError('No image file provided', 400);

  let coverImageUrl;

  if (hasCloudinary()) {
    // Production: upload buffer to Cloudinary
    const cloudinary = require('../config/cloudinary');
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'lab1708/site', public_id: 'cover', overwrite: true, resource_type: 'image' },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(req.file.buffer);
    });
    coverImageUrl = result.secure_url;
  } else {
    // Local dev fallback: write buffer to disk
    const fs   = require('fs');
    const path = require('path');
    const SITE_DIR = path.join(__dirname, '../../uploads/site');
    if (!fs.existsSync(SITE_DIR)) fs.mkdirSync(SITE_DIR, { recursive: true });
    // Remove old cover files first
    fs.readdirSync(SITE_DIR)
      .filter(f => f.startsWith('cover.') && !f.endsWith('.txt'))
      .forEach(f => { try { fs.unlinkSync(path.join(SITE_DIR, f)); } catch (_) {} });
    const ext = path.extname(req.file.originalname).toLowerCase();
    fs.writeFileSync(path.join(SITE_DIR, `cover${ext}`), req.file.buffer);
    coverImageUrl = `/uploads/site/cover${ext}`;
  }

  // Persist URL to DB so it survives restarts
  await prisma.siteSettings.upsert({
    where:  { key: COVER_KEY },
    update: { value: coverImageUrl },
    create: { key: COVER_KEY, value: coverImageUrl },
  });

  res.json({ success: true, data: { coverImageUrl } });
};

// ─── DELETE /api/settings/cover ───────────────────────────────────────────────
exports.deleteCover = async (req, res) => {
  // Remove from Cloudinary if applicable
  const row = await prisma.siteSettings.findUnique({ where: { key: COVER_KEY } });
  if (row?.value?.includes('cloudinary.com')) {
    const cloudinary = require('../config/cloudinary');
    await cloudinary.uploader.destroy('lab1708/site/cover', { resource_type: 'image' }).catch(() => {});
  }

  // Clear local disk files too (for local dev)
  const fs   = require('fs');
  const path = require('path');
  const SITE_DIR = path.join(__dirname, '../../uploads/site');
  if (fs.existsSync(SITE_DIR)) {
    fs.readdirSync(SITE_DIR)
      .filter(f => f.startsWith('cover.') && !f.endsWith('.txt'))
      .forEach(f => { try { fs.unlinkSync(path.join(SITE_DIR, f)); } catch (_) {} });
  }

  // Clear DB
  await prisma.siteSettings.upsert({
    where:  { key: COVER_KEY },
    update: { value: null },
    create: { key: COVER_KEY, value: null },
  });

  res.json({ success: true, data: { coverImageUrl: null } });
};
