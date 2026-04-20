import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Plus, AlertTriangle, GraduationCap } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { STATUS_BG } from '../utils/constants';

// ─── Video URL resolver ───────────────────────────────────────────────────────
const resolveVideo = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
  return { type: 'video', src: url };
};

const VideoPlayer = ({ url }) => {
  const v = resolveVideo(url);
  if (!v) return null;
  if (v.type === 'iframe') return (
    <iframe src={v.src} className="w-full rounded-lg" style={{ height: 200 }}
      frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen title="Equipment Tutorial" />
  );
  return (
    <video controls className="w-full rounded-lg" style={{ maxHeight: 200 }}>
      <source src={v.src} />
      <a href={v.src} target="_blank" rel="noreferrer" className="text-xs text-teal underline">Watch Tutorial →</a>
    </video>
  );
};

// ─── Equipment Name Editor (Supervisor) ─────────────────────────────────────────
const EquipmentNameEditor = ({ equipmentId, currentName }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error('Name cannot be empty.');
    if (trimmed === currentName) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.patch(`/equipment/${equipmentId}`, { name: trimmed });
      toast.success('Name updated!');
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      setEditing(false);
    } catch { toast.error('Failed to update name.'); }
    finally { setSaving(false); }
  };

  if (editing) return (
    <div style={{ marginBottom: 4 }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(currentName); setEditing(false); } }}
        style={{ width: '100%', fontSize: 13, fontWeight: 700, color: '#003B5C', border: '1.5px solid #00B5BD', borderRadius: 8, padding: '4px 8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', boxShadow: '0 0 0 3px rgba(0,181,189,0.12)' }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, fontSize: 10, fontWeight: 700, background: '#00B5BD', color: '#fff', border: 'none', borderRadius: 7, padding: '4px 0', cursor: 'pointer' }}>
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={() => { setName(currentName); setEditing(false); }}
          style={{ flex: 1, fontSize: 10, fontWeight: 700, background: 'transparent', color: '#9ab0c4', border: '1px solid #dde8f0', borderRadius: 7, padding: '4px 0', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', group: true }}
      onClick={() => setEditing(true)} title="Click to rename">
      <p style={{ fontWeight: 700, fontSize: 13, color: '#003B5C', margin: 0, flex: 1 }}>{currentName}</p>
      <span style={{ fontSize: 11, color: '#00B5BD', flexShrink: 0, opacity: 0.7 }}>✏️</span>
    </div>
  );
};

// ─── Generic field editor (reused for EN + FR name/description) ─────────────────
// eslint-disable-next-line no-unused-vars
const FieldEditor = ({ equipmentId, field, currentValue, label, multiline = false }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentValue || '');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const save = async () => {
    const trimmed = val.trim();
    if (trimmed === (currentValue || '').trim()) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.patch(`/equipment/${equipmentId}`, { [field]: trimmed || null });
      toast.success(`${label} updated!`);
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      setEditing(false);
    } catch { toast.error('Failed to update.'); }
    finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', fontSize: 11, color: '#4a6278', border: '1.5px solid #00B5BD', borderRadius: 8, padding: '4px 8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', boxShadow: '0 0 0 3px rgba(0,181,189,0.12)' };

  if (editing) return (
    <div style={{ marginBottom: 4 }}>
      {multiline
        ? <textarea value={val} onChange={e => setVal(e.target.value)} rows={3}
            onKeyDown={e => e.key === 'Escape' && (setVal(currentValue || ''), setEditing(false))}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} autoFocus />
        : <input value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(currentValue || ''); setEditing(false); } }}
            style={{ ...inputStyle, fontWeight: 600 }} autoFocus />
      }
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button onClick={save} disabled={saving} style={{ flex: 1, fontSize: 10, fontWeight: 700, background: '#00B5BD', color: '#fff', border: 'none', borderRadius: 7, padding: '4px 0', cursor: 'pointer' }}>
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={() => { setVal(currentValue || ''); setEditing(false); }} style={{ flex: 1, fontSize: 10, fontWeight: 700, background: 'transparent', color: '#9ab0c4', border: '1px solid #dde8f0', borderRadius: 7, padding: '4px 0', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 4, cursor: 'pointer' }}
      onClick={() => setEditing(true)} title={`Click to edit ${label}`}>
      <p style={{ fontSize: 11, color: currentValue ? '#7a94a8' : '#c8d8e8', fontStyle: currentValue ? 'normal' : 'italic', margin: 0, flex: 1, lineHeight: 1.4 }}>
        {currentValue || `Add ${label}…`}
      </p>
      <span style={{ fontSize: 10, color: '#00B5BD', flexShrink: 0, marginTop: 1, opacity: 0.7 }}>✏️</span>
    </div>
  );
};

// ─── Equipment Description Editor (Supervisor)
const EquipmentDescriptionEditor = ({ equipmentId, currentDescription }) => {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(currentDescription || '');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const save = async () => {
    const trimmed = desc.trim();
    if (trimmed === (currentDescription || '').trim()) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.patch(`/equipment/${equipmentId}`, { description: trimmed });
      toast.success('Description updated!');
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      setEditing(false);
    } catch { toast.error('Failed to update.'); }
    finally { setSaving(false); }
  };

  if (editing) return (
    <div style={{ marginBottom: 6 }}>
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        rows={3}
        onKeyDown={e => { if (e.key === 'Escape') { setDesc(currentDescription || ''); setEditing(false); } }}
        style={{ width: '100%', fontSize: 11, color: '#4a6278', border: '1.5px solid #00B5BD', borderRadius: 8, padding: '6px 8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', resize: 'none', lineHeight: 1.5, boxShadow: '0 0 0 3px rgba(0,181,189,0.12)' }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, fontSize: 10, fontWeight: 700, background: '#00B5BD', color: '#fff', border: 'none', borderRadius: 7, padding: '4px 0', cursor: 'pointer' }}>
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={() => { setDesc(currentDescription || ''); setEditing(false); }}
          style={{ flex: 1, fontSize: 10, fontWeight: 700, background: 'transparent', color: '#9ab0c4', border: '1px solid #dde8f0', borderRadius: 7, padding: '4px 0', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 6, cursor: 'pointer' }}
      onClick={() => setEditing(true)} title="Click to edit description">
      <p style={{ fontSize: 11, color: '#7a94a8', margin: 0, flex: 1, lineHeight: 1.4 }}>
        {currentDescription || <span style={{ color: '#c8d8e8', fontStyle: 'italic' }}>Add description…</span>}
      </p>
      <span style={{ fontSize: 10, color: '#00B5BD', flexShrink: 0, marginTop: 1, opacity: 0.7 }}>✏️</span>
    </div>
  );
};

// ─── Image Upload (Supervisor)
const ImageUpload = ({ equipmentId, currentImageUrl, onUpdated }) => {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const inputRef = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      await api.post(`/equipment/${equipmentId}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Image uploaded!');
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
    } catch { toast.error('Upload failed.'); setPreview(null); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this image?')) return;
    setDeleting(true);
    try {
      await api.delete(`/equipment/${equipmentId}/image`);
      toast.success('Image removed.');
      setPreview(null);
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
    } catch { toast.error('Failed to remove.'); }
    finally { setDeleting(false); }
  };

  const shown = preview || currentImageUrl;

  return (
    <div className="mt-2 pt-2 border-t border-dark-border">
      <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-1">Equipment Photo</p>
      {shown ? (
        <div style={{ position: 'relative', width: '100%', marginBottom: 6 }}>
          <img src={shown} alt="equipment" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #dde8f0' }} />
          <button onClick={handleDelete} disabled={deleting}
            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(231,76,60,0.85)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', cursor: 'pointer' }}>
            {deleting ? '…' : '× Remove'}
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', height: 60, borderRadius: 8, border: '1.5px dashed #c8d8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#9ab0c4' }}>No photo yet</span>
        </div>
      )}
      <label style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#00B5BD', cursor: 'pointer', padding: '4px 8px', border: '1.5px solid #00B5BD', borderRadius: 8 }}>
        {uploading ? 'Uploading…' : shown ? '📷 Change Photo' : '📷 Upload Photo'}
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
};

// ─── Videos Manager (Supervisor — multi-video) ──────────────────────────────────
const VideosManager = ({ equipmentId, currentVideos }) => {
  const [items, setItems] = useState(Array.isArray(currentVideos) ? currentVideos : []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const persist = async (updated) => {
    setSaving(true);
    try {
      await api.patch(`/equipment/${equipmentId}/videos`, { videos: updated });
      toast.success('Videos updated!');
      queryClient.invalidateQueries(['dashboard-tech']);
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const add = () => {
    if (!name.trim() || !url.trim()) return toast.error('Both title and URL are required.');
    const updated = [...items, { name: name.trim(), url: url.trim() }];
    setItems(updated); persist(updated);
    setName(''); setUrl(''); setAdding(false);
  };

  const remove = (idx) => {
    if (!window.confirm(`Remove "${items[idx].name}"?`)) return;
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated); persist(updated);
  };

  return (
    <div className="mt-2 pt-2 border-t border-dark-border">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Tutorial Videos</p>
        <button onClick={() => setAdding(a => !a)}
          className="text-[9px] font-mono text-teal hover:underline">
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {items.length === 0 && !adding && (
        <p className="text-[10px] text-text-muted italic">No videos yet.</p>
      )}
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-1 py-0.5 group">
          <span className="text-[9px]">🎬</span>
          <span className="text-[10px] text-text-secondary flex-1 truncate" title={v.url}>{v.name}</span>
          <button onClick={() => remove(i)}
            className="text-[10px] text-status-rejected opacity-0 group-hover:opacity-100 transition-opacity hover:underline shrink-0">
            🗑 Delete
          </button>
        </div>
      ))}

      {adding && (
        <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-dark-border">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Video title (e.g. Machine Overview)"
            className="text-[10px] font-mono border border-dark-border rounded px-2 py-1 bg-dark-bg text-text-primary" />
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="YouTube link or direct MP4 URL"
            className="text-[10px] font-mono border border-dark-border rounded px-2 py-1 bg-dark-bg text-text-primary" />
          <button onClick={add} disabled={saving}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal text-dark-bg font-bold self-start">
            {saving ? '…' : 'Save Video'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Materials Manager (Supervisor) ──────────────────────────────────────────
const MaterialsManager = ({ equipmentId, currentMaterials }) => {
  const [items, setItems] = useState(Array.isArray(currentMaterials) ? currentMaterials : []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const persist = async (updated) => {
    setSaving(true);
    try {
      await api.patch(`/equipment/${equipmentId}/materials`, { materials: updated });
      toast.success('Materials updated!');
      queryClient.invalidateQueries(['dashboard-tech']);
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const add = () => {
    if (!name.trim() || !url.trim()) return toast.error('Both name and URL are required.');
    const updated = [...items, { name: name.trim(), url: url.trim() }];
    setItems(updated); persist(updated);
    setName(''); setUrl(''); setAdding(false);
  };

  const remove = (idx) => {
    if (!window.confirm(`Remove "${items[idx].name}"?`)) return;
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated); persist(updated);
  };

  return (
    <div className="mt-2 pt-2 border-t border-dark-border">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Materials</p>
        <button onClick={() => setAdding(a => !a)}
          className="text-[9px] font-mono text-teal hover:underline">
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Existing items — always visible */}
      {items.length === 0 && !adding && (
        <p className="text-[10px] text-text-muted italic">No materials yet.</p>
      )}
      {items.map((m, i) => (
        <div key={i} className="flex items-center gap-1 py-0.5 group">
          <span className="text-[9px]">📄</span>
          <span className="text-[10px] text-text-secondary flex-1 truncate" title={m.url}>{m.name}</span>
          <button onClick={() => remove(i)}
            className="text-[10px] text-status-rejected opacity-0 group-hover:opacity-100 transition-opacity hover:underline shrink-0">
            🗑 Delete
          </button>
        </div>
      ))}

      {/* Add form */}
      {adding && (
        <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-dark-border">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Name (e.g. Safety Manual)"
            className="text-[10px] font-mono border border-dark-border rounded px-2 py-1 bg-dark-bg text-text-primary" />
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="Public URL (PDF, Drive, etc.)"
            className="text-[10px] font-mono border border-dark-border rounded px-2 py-1 bg-dark-bg text-text-primary" />
          <p className="text-[9px] font-mono text-text-muted">⚠ Make sure the link is set to public / anyone with link.</p>
          <button onClick={add} disabled={saving}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal text-dark-bg font-bold self-start">
            {saving ? '…' : 'Save Material'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Maintenance Toggle (Supervisor) ─────────────────────────────────────────
const MaintenanceToggle = ({ equipmentId, maintenanceMode, maintenanceNote }) => {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const submit = async (enable, note = '') => {
    setSaving(true);
    try {
      await api.patch(`/equipment/${equipmentId}/maintenance`, {
        maintenanceMode: enable,
        maintenanceNote: note || null,
      });
      toast.success(enable ? '🔧 Equipment marked unavailable' : '✅ Equipment marked available');
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      setShowForm(false);
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #dde8f0' }}>
      {/* Status badge */}
      <div style={{ marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 0.5, borderRadius: 20, padding: '2px 10px',
          background: maintenanceMode ? '#fff3e0' : '#f0fef4',
          color: maintenanceMode ? '#e67e22' : '#27ae60',
          border: `1px solid ${maintenanceMode ? '#e67e2244' : '#27ae6044'}`,
        }}>
          {maintenanceMode ? '🔧 UNAVAILABLE' : '✅ AVAILABLE'}
        </span>
      </div>

      {maintenanceMode ? (
        // Currently unavailable — show note + restore button
        <>
          {maintenanceNote && (
            <p style={{ fontSize: 11, color: '#7a94a8', fontStyle: 'italic', margin: '0 0 6px', lineHeight: 1.4 }}>
              "{maintenanceNote}"
            </p>
          )}
          <button onClick={() => submit(false)} disabled={saving}
            style={{ width: '100%', fontSize: 11, fontWeight: 700, background: '#f0fef4', color: '#27ae60', border: '1.5px solid #27ae6044', borderRadius: 8, padding: '6px 0', cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? '…' : '✅ Mark as Available'}
          </button>
        </>
      ) : showForm ? (
        // Reason form before marking unavailable
        <>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (e.g. calibration, repair, inspection…)"
            rows={2}
            style={{ width: '100%', fontSize: 11, color: '#4a6278', border: '1.5px solid #e67e22', borderRadius: 8, padding: '6px 8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter,system-ui,sans-serif', resize: 'none', marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => submit(true, reason)} disabled={saving}
              style={{ flex: 1, fontSize: 10, fontWeight: 700, background: '#e67e22', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 0', cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? '…' : 'Confirm'}
            </button>
            <button onClick={() => { setShowForm(false); setReason(''); }}
              style={{ flex: 1, fontSize: 10, fontWeight: 700, background: 'transparent', color: '#9ab0c4', border: '1px solid #dde8f0', borderRadius: 7, padding: '5px 0', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        // Available — show button to mark unavailable
        <button onClick={() => setShowForm(true)}
          style={{ width: '100%', fontSize: 11, fontWeight: 700, background: '#fff8f0', color: '#e67e22', border: '1.5px solid #e67e2244', borderRadius: 8, padding: '6px 0', cursor: 'pointer' }}>
          🔧 Mark as Unavailable
        </button>
      )}
    </div>
  );
};

// ─── Add Equipment Card (Supervisor) ───────────────────────────────────────────────────
const AddEquipmentCard = () => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name:'', description:'', type:'Analytical', totalUnits:1, requiresTraining:true });

  const iStyle = { width:'100%', fontSize:12, color:'#1a2e44', border:'1.5px solid #c8d8e8', borderRadius:8, padding:'7px 10px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,system-ui,sans-serif' };
  const lStyle = { display:'block', fontSize:11, fontWeight:700, color:'#003B5C', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim()) return toast.error('Name and description are required.');
    setSaving(true);
    try {
      await api.post('/equipment', { ...form, icon: '⚙️', totalUnits: Number(form.totalUnits) });
      toast.success(`${form.name} added!`);
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      setForm({ name:'', description:'', type:'Analytical', totalUnits:1, requiresTraining:true });
      setOpen(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add equipment.'); }
    finally { setSaving(false); }
  };

  if (!open) return (
    <motion.div
      whileHover={{ scale:1.02, boxShadow:'0 8px 24px rgba(0,181,189,0.18)' }}
      whileTap={{ scale:0.97 }}
      onClick={() => setOpen(true)}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'2px dashed #00B5BD', borderRadius:16, padding:'32px 16px', cursor:'pointer', background:'#f0fffe', transition:'all 0.2s', minHeight:180 }}
    >
      <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#003B5C,#00B5BD)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12, boxShadow:'0 4px 12px rgba(0,181,189,0.3)' }}>
        <span style={{ color:'#fff', fontSize:28, lineHeight:1, fontWeight:300 }}>+</span>
      </div>
      <p style={{ fontWeight:800, fontSize:14, color:'#003B5C', margin:'0 0 4px' }}>Add Equipment</p>
      <p style={{ fontSize:11, color:'#7a94a8', margin:0, textAlign:'center', lineHeight:1.4 }}>Register a new machine for future bookings</p>
    </motion.div>
  );

  return (
    <div style={{ border:'2px solid #00B5BD', borderRadius:16, padding:16, background:'#f0fffe', boxShadow:'0 4px 16px rgba(0,181,189,0.12)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ fontWeight:800, fontSize:13, color:'#003B5C', margin:0 }}>➕ New Equipment</p>
        <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#9ab0c4', lineHeight:1 }}>×</button>
      </div>


      <div style={{ marginBottom:8 }}>
        <label style={lStyle}>Machine Name *</label>
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. X-ray Diffraction (XRD)" style={iStyle} />
      </div>
      <div style={{ marginBottom:8 }}>
        <label style={lStyle}>Description *</label>
        <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What does this machine do?" rows={2} style={{...iStyle, resize:'none'}} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <div>
          <label style={lStyle}>Type</label>
          <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={iStyle}>
            {['Analytical','Fabrication','Measurement','Imaging','Electronics','Other'].map(tp => <option key={tp}>{tp}</option>)}
          </select>
        </div>
        <div>
          <label style={lStyle}>Units</label>
          <input type="number" min={1} value={form.totalUnits} onChange={e=>setForm(f=>({...f,totalUnits:e.target.value}))} style={iStyle} />
        </div>
      </div>
      <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, cursor:'pointer', fontSize:12, fontWeight:600, color:'#003B5C' }}>
        <input type="checkbox" checked={form.requiresTraining} onChange={e=>setForm(f=>({...f,requiresTraining:e.target.checked}))} />
        Requires Training
      </label>
      <button onClick={handleSubmit} disabled={saving}
        style={{ width:'100%', padding:'10px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#003B5C,#00B5BD)', color:'#fff', fontWeight:800, fontSize:13, cursor:saving?'wait':'pointer', boxShadow:'0 4px 12px rgba(0,181,189,0.3)' }}>
        {saving ? 'Adding…' : `Add ${form.name || 'Equipment'}`}
      </button>
    </div>
  );
};

// ─── Training Card (Supervisor) — Confirm / Reject / Reschedule ───────────────
const TrainingCard = ({ s, trainingMutation, queryClient, t }) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReschedule = async () => {
    if (!proposedDate || !proposedTime) return toast.error('Please select both a date and a time.');
    const combined = new Date(`${proposedDate}T${proposedTime}`);
    if (isNaN(combined.getTime())) return toast.error('Invalid date or time.');
    if (combined <= new Date()) return toast.error('Proposed time must be in the future.');
    setSubmitting(true);
    try {
      await api.patch(`/training/${s.id}/reschedule`, {
        proposedAt: combined.toISOString(),
        reason: rescheduleReason || undefined,
      });
      toast.success('Reschedule proposal sent to student.');
      queryClient.invalidateQueries(['dashboard-tech']);
      setShowReschedule(false);
      setProposedDate(''); setProposedTime(''); setRescheduleReason('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reschedule.'); }
    finally { setSubmitting(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const iStyle = { width:'100%', fontSize:13, color:'#1a2e44', border:'1.5px solid #c8d8e8', borderRadius:8, padding:'9px 12px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,system-ui,sans-serif', background:'#fff' };
  const lStyle = { fontSize:12, fontWeight:700, color:'#003B5C', display:'block', marginBottom:5 };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, color: '#003B5C', margin: '0 0 4px' }}>
            {s.equipment.icon} {s.equipment.name}
          </p>
          <p className="text-xs" style={{color:'#4a6278'}}>
            {s.student.firstName} {s.student.lastName} · {s.student.email}
          </p>
          <p className="text-xs" style={{color:'#4a6278'}}>
            Requested: {format(new Date(s.scheduledAt), 'PPp')}
          </p>
          {s.status === 'RESCHEDULED' && s.proposedAt && (
            <p style={{ fontSize:12, fontWeight:700, color:'#e67e22', margin:'4px 0 0' }}>
              ⏰ Proposed: {format(new Date(s.proposedAt), 'PPp')} — awaiting student confirmation
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2 flex-wrap">
            {s.status === 'PENDING' && (
              <button onClick={() => trainingMutation.mutate({ id: s.id, action: 'confirm' })}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                <CheckCircle size={12} /> {t('dashboard.tech.confirm')}
              </button>
            )}
            {['PENDING','CONFIRMED'].includes(s.status) && (
              <button onClick={() => trainingMutation.mutate({ id: s.id, action: 'reject' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-status-rejected text-status-rejected hover:bg-status-rejected/10 transition-colors">
                <XCircle size={12} /> {t('dashboard.tech.reject')}
              </button>
            )}
            {s.status === 'CONFIRMED' && (
              <button onClick={() => trainingMutation.mutate({ id: s.id, action: 'complete' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-teal text-teal hover:bg-teal/10 transition-colors">
                <GraduationCap size={12} /> {t('dashboard.tech.complete')}
              </button>
            )}
            {['PENDING','CONFIRMED'].includes(s.status) && (
              <button onClick={() => setShowReschedule(r => !r)}
                style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid #e67e22', background: showReschedule ? '#fff8f0':'transparent', color:'#e67e22', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                ⏰ Reschedule
              </button>
            )}
          </div>
          <span style={{
            fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, letterSpacing:0.5,
            background: s.status==='CONFIRMED'?'#f0fef4':s.status==='RESCHEDULED'?'#fff8f0':s.status==='REJECTED'?'#fff5f5':'#EEF4FB',
            color: s.status==='CONFIRMED'?'#27ae60':s.status==='RESCHEDULED'?'#e67e22':s.status==='REJECTED'?'#e74c3c':'#4a6278',
            border: `1px solid ${s.status==='CONFIRMED'?'#27ae6044':s.status==='RESCHEDULED'?'#e67e2244':s.status==='REJECTED'?'#e74c3c44':'#dde8f0'}`,
          }}>{s.status}</span>
        </div>
      </div>
      {showReschedule && (
        <div style={{ marginTop:16, padding:'18px 20px', background:'#fff8f0', borderRadius:14, border:'1.5px solid #e67e2244', boxShadow:'0 2px 12px rgba(230,126,34,0.08)' }}>
          <p style={{ fontSize:13, fontWeight:800, color:'#e67e22', margin:'0 0 14px', display:'flex', alignItems:'center', gap:6 }}>
            ⏰ Propose New Date & Time
          </p>

          {/* Row 1: Date + Time */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            {/* Date */}
            <div>
              <label style={lStyle}>Date *</label>
              <input
                type="date"
                value={proposedDate}
                min={today}
                onChange={e => setProposedDate(e.target.value)}
                style={iStyle}
              />
            </div>
            {/* Time */}
            <div>
              <label style={lStyle}>Time *</label>
              <select
                value={proposedTime}
                onChange={e => setProposedTime(e.target.value)}
                style={iStyle}
              >
                <option value="">-- Select time --</option>
                {Array.from({ length: 24 }, (_, h) => [
                  `${String(h).padStart(2,'0')}:00`,
                  `${String(h).padStart(2,'0')}:30`,
                ]).flat().map(slot => (
                  <option key={slot} value={slot}>
                    {(() => {
                      const [hh, mm] = slot.split(':');
                      const h = parseInt(hh);
                      return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
                    })()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          {proposedDate && proposedTime && (
            <div style={{ padding:'9px 14px', borderRadius:9, background:'rgba(230,126,34,0.1)', border:'1px solid #e67e2233', marginBottom:12 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#e67e22', margin:0 }}>
                📅 Proposed: {new Date(`${proposedDate}T${proposedTime}`).toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' })}
              </p>
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>Reason for reschedule (optional)</label>
            <input
              value={rescheduleReason}
              onChange={e => setRescheduleReason(e.target.value)}
              placeholder="e.g. Equipment maintenance, prior commitment…"
              style={iStyle}
            />
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleReschedule} disabled={submitting || !proposedDate || !proposedTime}
              style={{ flex:1, padding:'10px', borderRadius:9, background: (!proposedDate||!proposedTime) ? '#ccc':'#e67e22', color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:(!proposedDate||!proposedTime)?'not-allowed':'pointer', transition:'all 0.2s' }}>
              {submitting ? 'Sending…' : '⏰ Send Reschedule Proposal'}
            </button>
            <button onClick={() => { setShowReschedule(false); setProposedDate(''); setProposedTime(''); setRescheduleReason(''); }}
              style={{ padding:'10px 18px', borderRadius:9, background:'transparent', color:'#999', fontWeight:600, fontSize:13, border:'1px solid #dde8f0', cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Status badge ──────────────────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span className={`status-badge ${STATUS_BG[status] || 'bg-gray-800 text-text-secondary'}`}>
      {t(`status.${status}`)}
    </span>
  );
};

// ─── Student Dashboard ────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-student'],
    queryFn: () => api.get('/dashboard/student').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/reservations/${id}/cancel`),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      queryClient.invalidateQueries(['dashboard-student']);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('common.error')),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const { upcoming = [], history = [], trainingSessions = [], stats = {} } = data || {};

  return (
    <div style={{ minHeight: '100vh', background: '#f4f9f9' }}>
      {/* Header banner */}
      <div style={{ background: 'linear-gradient(135deg, #003B5C 0%, #00B5BD 100%)', padding: '36px 24px 28px' }}>
        <div style={{ maxWidth: 896, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>REGAL Laboratory</p>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>{t('dashboard.welcome', { name: user.firstName })} 👋</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6 }}>{t('app.lab')}</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="dash-stat-card">
          <p className="text-2xl font-bold" style={{ color: '#00B5BD' }}>{stats.pending || 0}</p>
          <p className="text-xs text-text-muted mt-1">{t('dashboard.stats.pending')}</p>
        </div>
        <div className="dash-stat-card col-span-2 sm:col-span-1 flex items-center justify-center">
          <Link to="/book" className="btn-primary text-xs inline-flex items-center gap-2">
            <Plus size={14} />{t('nav.book')}
          </Link>
        </div>
      </div>

      {/* Upcoming reservations */}
      <section>
        <p className="section-title">{t('dashboard.upcoming')}</p>
        {upcoming.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">{t('dashboard.noUpcoming')}</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-bold text-text-primary text-sm">{r.equipment.icon} {r.equipment.name}</p>
                    <p className="text-xs text-text-secondary font-mono mt-1">
                      Start: {format(new Date(r.startTime), 'PPp')}
                    </p>
                    <p className="text-xs" style={{color:"#4a6278"}}>
                      End: &nbsp;&nbsp;{format(new Date(r.endTime), 'PPp')}
                    </p>
                    {r.personInCharge && (
                      <p className="text-xs text-text-muted mt-1">
                        Person in charge: <span className="text-teal">{r.personInCharge.firstName} {r.personInCharge.lastName}</span>
                      </p>
                    )}
                    {r.experimentDescription && (
                      <p className="text-[10px] text-text-muted mt-1 line-clamp-2 italic">"{r.experimentDescription}"</p>
                    )}
                    {/* Tutorial videos — shown when booking is confirmed */}
                    {r.status === 'CONFIRMED' && (() => {
                      const vids = Array.isArray(r.equipment?.videos) && r.equipment.videos.length > 0
                        ? r.equipment.videos
                        : r.equipment?.videoUrl ? [{ name: 'Equipment Tutorial', url: r.equipment.videoUrl }] : [];
                      return vids.length > 0 ? (
                        <div className="mt-3 p-3 rounded-lg bg-teal/5 border border-teal/20">
                          <p className="text-[10px] text-teal font-bold uppercase tracking-wider mb-3">🎬 Equipment Tutorial{vids.length > 1 ? 's' : ''}</p>
                          <div className="space-y-4">
                            {vids.map((v, i) => (
                              <div key={i}>
                                {vids.length > 1 && (
                                  <p className="text-[10px] text-text-muted mb-1">{i + 1}. {v.name}</p>
                                )}
                                <VideoPlayer url={v.url} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {/* Reference materials — shown when booking is confirmed */}
                    {r.status === 'CONFIRMED' && Array.isArray(r.equipment?.materials) && r.equipment.materials.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-dark-surface border border-dark-border">
                        <p className="text-[10px] text-teal font-bold uppercase tracking-wider mb-2">📎 Reference Materials</p>
                        <div className="space-y-1.5">
                          {r.equipment.materials.map((m, i) => (
                            <a key={i} href={m.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-xs font-mono text-text-secondary hover:text-teal transition-colors group">
                              <span>📄</span>
                              <span className="group-hover:underline flex-1">{m.name}</span>
                              <span className="text-[10px] text-text-muted">↗</span>
                            </a>
                          ))}
                        </div>
                        <p className="text-[9px] font-mono text-text-muted mt-2">⚠ If a link doesn't open, ask your supervisor to set the file to "Anyone with the link can view".</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === 'PENDING' || r.status === 'CONFIRMED' ? (
                      <button
                        onClick={() => cancelMutation.mutate(r.id)}
                        className="text-xs font-mono text-status-rejected hover:underline"
                      >
                        {t('common.cancel')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Training sessions */}
      {trainingSessions.length > 0 && (
        <section>
          <p className="section-title">{t('dashboard.trainingSessions')}</p>
          <div className="space-y-3">
            {trainingSessions.map(s => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <p className="font-sans font-bold text-text-primary text-sm">{s.equipment.icon} {s.equipment.name}</p>
                    <p className="text-xs" style={{color:'#4a6278'}}>Scheduled: {format(new Date(s.scheduledAt), 'PPp')}</p>
                    {s.status === 'RESCHEDULED' && s.proposedAt && (
                      <div style={{ marginTop:8, padding:'12px 14px', borderRadius:10, background:'#fff8f0', border:'1.5px solid #e67e2244' }}>
                        <p style={{ fontSize:13, fontWeight:800, color:'#e67e22', margin:'0 0 4px' }}>⏰ Supervisor proposed a new time</p>
                        <p style={{ fontSize:14, color:'#003B5C', fontWeight:700, margin:'0 0 6px' }}>{format(new Date(s.proposedAt), 'PPp')}</p>
                        {s.rescheduleReason && (
                          <p style={{ fontSize:12, color:'#7a94a8', margin:'0 0 10px' }}>Reason: {s.rescheduleReason}</p>
                        )}
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={async () => {
                            try { await api.patch(`/training/${s.id}/accept-reschedule`); toast.success('New time accepted!'); queryClient.invalidateQueries(['dashboard-student']); }
                            catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
                          }} style={{ padding:'8px 18px', borderRadius:8, background:'#27ae60', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                            ✅ Accept New Time
                          </button>
                          <button onClick={async () => {
                            try { await api.patch(`/training/${s.id}/reject-reschedule`); toast.success('Reschedule rejected — supervisor notified.'); queryClient.invalidateQueries(['dashboard-student']); }
                            catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
                          }} style={{ padding:'8px 18px', borderRadius:8, background:'transparent', color:'#e74c3c', border:'1.5px solid #e74c3c', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, letterSpacing:0.5, flexShrink:0,
                    background: s.status==='CONFIRMED'?'#f0fef4':s.status==='RESCHEDULED'?'#fff8f0':s.status==='REJECTED'?'#fff5f5':'#EEF4FB',
                    color: s.status==='CONFIRMED'?'#27ae60':s.status==='RESCHEDULED'?'#e67e22':s.status==='REJECTED'?'#e74c3c':'#4a6278',
                    border: `1px solid ${s.status==='CONFIRMED'?'#27ae6044':s.status==='RESCHEDULED'?'#e67e2244':s.status==='REJECTED'?'#e74c3c44':'#dde8f0'}`,
                  }}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      </div>
      {/* Delete Account */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
      <section className="pt-4 border-t border-dark-border">
        <p className="section-title" style={{ borderLeftColor: '#e74c3c', color: '#e74c3c', background: 'linear-gradient(135deg,#fff5f5,#fee8e8)' }}>Danger Zone</p>
        <div className="card border-status-rejected/20">
          <p className="text-xs text-text-muted mb-3">Permanently delete your account and all your booking data. This cannot be undone.</p>
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                try {
                  await api.delete('/auth/account');
                  localStorage.removeItem('accessToken');
                  window.location.href = '/login';
                } catch {
                  toast.error('Failed to delete account.');
                }
              }
            }}
            className="text-xs font-mono px-4 py-2 rounded-lg border border-status-rejected text-status-rejected hover:bg-status-rejected/10 transition-colors"
          >
            Delete My Account
          </button>
        </div>
      </section>

      {/* History */}
      <section>
        <p className="section-title">{t('dashboard.history')}</p>
        {history.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">{t('dashboard.noHistory')}</div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-dark-surface border border-dark-border rounded-lg">
                <div>
                  <p className="text-xs font-bold text-text-primary">{r.equipment.icon} {r.equipment.name}</p>
                  <p className="text-[10px] text-text-muted">{format(new Date(r.startTime), 'PP')}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

// ─── AI Insights Panel ────────────────────────────────────────────────────────────────────────
const fmt12h = (hour) => { const h = hour % 12 || 12; return `${h}${hour < 12 ? 'am' : 'pm'}`; };

// ─── Donut chart (SVG, no library) ────────────────────────────────────────
const DonutChart = ({ segments, size = 140, centerLabel, centerValue }) => {
  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF4FB" strokeWidth={18} />
      {segments.map((s, i) => {
        const pct = s.value / total;
        const dash = pct * circumference;
        const rotate = (offset / total) * 360 - 90;
        offset += s.value;
        if (!s.value) return null;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={18}
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(${rotate} ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 22, fontWeight: 900, fill: '#003B5C', fontFamily: 'Inter,sans-serif' }}>{centerValue}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: '#7a94a8', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>{centerLabel}</text>
    </svg>
  );
};

// ─── Week comparison bars ─────────────────────────────────────────────
const WeekBar = ({ value, max, label, color, sub }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 18, fontWeight: 900, color }}>{value}</span>
      <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(pct, 4)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ width: '60%', background: color, borderRadius: '6px 6px 0 0', minHeight: 4 }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#003B5C' }}>{label}</span>
      <span style={{ fontSize: 10, color: '#7a94a8' }}>{sub}</span>
    </div>
  );
};

const InsightsPanel = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/dashboard/insights').then(r => r.data.data),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (!data) return null;

  const insightBg = { trend: '#f0fffe', warning: '#fff8f0', success: '#f0fef4', info: '#f4f9ff' };
  const insightBorder = { trend: '#00B5BD', warning: '#e67e22', success: '#27ae60', info: '#003B5C' };

  return (
    <div className="space-y-6">

      {/* ── Booking Overview stats ── */}
      <section>
        <p className="section-title">📈 Booking Overview</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Confirm Rate', value: `${data.confirmRate}%`, color: '#27ae60', sub: 'of all bookings confirmed' },
            { label: 'This Week', value: data.thisWeek, color: '#003B5C', sub: 'new bookings this week' },
            { label: 'Last 30 Days', value: data.total, color: '#00B5BD', sub: 'total bookings' },
          ].map(s => (
            <div key={s.label} className="card text-center" style={{ borderTop: `3px solid ${s.color}` }}>
              <p style={{ fontSize: 32, fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#003B5C', margin: '8px 0 3px' }}>{s.label}</p>
              <p style={{ fontSize: 12, color: '#7a94a8', margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Visual charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Booking Status Donut */}
        <div className="card">
          <p className="section-title">Booking Status</p>
          {(() => {
            const pending = data.total - data.confirmed - data.rejected;
            const segments = [
              { label: 'Confirmed', value: data.confirmed, color: '#27ae60' },
              { label: 'Rejected',  value: data.rejected,  color: '#e74c3c' },
              { label: 'Pending',   value: Math.max(0, pending), color: '#e67e22' },
            ];
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <DonutChart segments={segments} size={140} centerValue={data.total} centerLabel="Total" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {segments.map(s => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#003B5C', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                          {s.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</span>
                      </div>
                      <div style={{ height: 6, background: '#EEF4FB', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${data.total > 0 ? Math.round((s.value / data.total) * 100) : 0}%`, background: s.color, borderRadius: 9999, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Week Comparison Bars */}
        <div className="card">
          <p className="section-title">Week Comparison</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '8px 0' }}>
            <WeekBar value={data.lastWeek} max={Math.max(data.thisWeek, data.lastWeek, 1)} label="Last Week" sub="prev 7 days" color="#c8d8e8" />
            <div style={{ width: 1, background: '#dde8f0', alignSelf: 'stretch' }} />
            <WeekBar value={data.thisWeek} max={Math.max(data.thisWeek, data.lastWeek, 1)} label="This Week" sub="current 7 days" color={data.thisWeek >= data.lastWeek ? '#00B5BD' : '#e67e22'} />
          </div>
          <p style={{ fontSize: 11, color: '#7a94a8', marginTop: 8, textAlign: 'center' }}>
            {data.weekTrend > 0 ? `↑ ${data.weekTrend}% more bookings` : data.weekTrend < 0 ? `↓ ${Math.abs(data.weekTrend)}% fewer bookings` : 'Same as last week'}
          </p>
        </div>
      </div>

      {/* Equipment usage vertical bar chart */}
      {data.equipmentRanking.length > 0 && (
        <section>
          <p className="section-title">📊 Equipment Usage — Last 30 Days</p>
          <div className="card">
            {/* Chart area */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, padding: '0 4px 0', overflowX: 'auto' }}>
              {data.equipmentRanking.map((eq, i) => {
                const isTop = i === 0;
                const pct = data.maxUsage > 0 ? (eq.count / data.maxUsage) : 0;
                const barH = Math.max(Math.round(pct * 150), eq.count > 0 ? 10 : 3);
                return (
                  <div key={eq.id} style={{ flex: '1 0 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 48 }}>
                    {/* Count label */}
                    <span style={{ fontSize: 13, fontWeight: 900, color: isTop ? '#00B5BD' : '#003B5C', minHeight: 20 }}>
                      {eq.count > 0 ? eq.count : ''}
                    </span>
                    {/* Bar */}
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: barH, opacity: 1 }}
                      transition={{ duration: 0.6, delay: i * 0.07, ease: 'easeOut' }}
                      style={{
                        width: '100%',
                        borderRadius: '8px 8px 0 0',
                        background: isTop
                          ? 'linear-gradient(to top, #003B5C, #00B5BD)'
                          : eq.count > 0
                            ? 'linear-gradient(to top, #c8d8e8, #dde8f0)'
                            : '#EEF4FB',
                        boxShadow: isTop ? '0 4px 14px rgba(0,181,189,0.35)' : 'none',
                        position: 'relative',
                      }}
                    >
                      {isTop && (
                        <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', background: '#00B5BD', color: '#fff', fontSize: 8, fontWeight: 800, borderRadius: 20, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                          TOP
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Divider line */}
            <div style={{ height: 2, background: '#dde8f0', margin: '0 4px' }} />

            {/* X-axis labels */}
            <div style={{ display: 'flex', gap: 10, padding: '10px 4px 4px', overflowX: 'auto' }}>
              {data.equipmentRanking.map((eq, i) => (
                <div key={eq.id} style={{ flex: '1 0 48px', minWidth: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, lineHeight: 1.2 }}>{eq.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? '#003B5C' : '#4a6278', lineHeight: 1.3, marginTop: 2, wordBreak: 'break-word' }}>
                    {eq.name.length > 10 ? eq.name.slice(0, 10) + '…' : eq.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Most requested callout */}
            {data.equipmentRanking[0] && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#f0fffe,#e0f7f4)', border: '1.5px solid #b2e8ea', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{data.equipmentRanking[0].icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#003B5C', margin: 0 }}>
                    {data.equipmentRanking[0].name}
                  </p>
                  <p style={{ fontSize: 12, color: '#4a6278', margin: '2px 0 0' }}>
                    Most requested &mdash; <strong style={{ color: '#00B5BD' }}>{data.equipmentRanking[0].count} booking{data.equipmentRanking[0].count !== 1 ? 's' : ''}</strong> in the last 30 days
                  </p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, background: '#00B5BD', color: '#fff', borderRadius: 20, padding: '3px 10px', letterSpacing: 1, textTransform: 'uppercase' }}>#1</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Peak hours heatmap */}
      <section>
        <p className="section-title mb-3">⏰ Peak Booking Hours</p>
        <div className="card">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {data.peakHours.map(({ hour, count }) => {
              const intensity = data.maxHour > 0 ? count / data.maxHour : 0;
              return (
                <div key={hour} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded"
                    style={{
                      height: 32,
                      background: intensity > 0
                        ? `rgba(0,181,189,${0.15 + intensity * 0.85})`
                        : 'rgba(200,216,232,0.6)',
                    }}
                    title={`${fmt12h(hour)}: ${count} bookings`}
                  />
                  <span className="text-[9px] font-mono text-text-muted">{fmt12h(hour)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-text-muted mt-3">Darker teal = more bookings at that hour</p>
        </div>
      </section>

      {/* Busiest days bar chart */}
      <section>
        <p className="section-title mb-3">📅 Busiest Days of the Week</p>
        <div className="card">
          {(() => {
            const maxDay = Math.max(...data.busiestDays.map(d => d.count), 1);
            const CHART_H = 130;
            return (
              <>
                <div className="flex gap-2 items-end" style={{ height: CHART_H }}>
                  {data.busiestDays.map(({ day, count }) => {
                    const barH = count > 0 ? Math.max(Math.round((count / maxDay) * CHART_H), 8) : 3;
                    const isBusiest = count === maxDay && count > 0;
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center justify-end">
                        {count > 0 && (
                          <span className="text-[9px] font-mono mb-1" style={{ color: isBusiest ? '#00bfa5' : '#8b949e' }}>
                            {count}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: barH }}
                          transition={{ duration: 0.55, ease: 'easeOut' }}
                          className="w-full rounded-t"
                          style={{
                            background: isBusiest
                              ? 'linear-gradient(to top, #00bfa5, #4dd0c4)'
                              : count > 0
                                ? 'rgba(0,191,165,0.28)'
                        : 'rgba(200,216,232,0.5)',
                            boxShadow: isBusiest ? '0 0 8px rgba(0,191,165,0.4)' : 'none',
                          }}
                          title={`${day}: ${count} booking${count !== 1 ? 's' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  {data.busiestDays.map(({ day, count }) => {
                    const isBusiest = count === maxDay && count > 0;
                    return (
                      <div key={day} className="flex-1 text-center">
                        <span className="text-[9px] font-mono" style={{ color: isBusiest ? '#00bfa5' : '#8b949e', fontWeight: isBusiest ? 700 : 400 }}>
                          {day.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-muted mt-3">Bright teal = busiest day · faded = lighter activity</p>
              </>
            );
          })()}
        </div>
      </section>
    </div>
  );
};

// ─── Cover Photo Upload (Supervisor) ────────────────────────────────────────────────────────────
const CoverPhotoUpload = () => {
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => setCoverUrl(r.data.data.coverImageUrl)).catch(() => {});
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('cover', file);
      const res = await api.post('/settings/cover', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCoverUrl(res.data.data.coverImageUrl);
      setCoverPreview(null);
      queryClient.invalidateQueries(['site-settings']);
      toast.success('Cover photo updated! Visit the home page to see it.');
    } catch { toast.error('Upload failed.'); setCoverPreview(null); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove the home page cover photo?')) return;
    setDeleting(true);
    try {
      await api.delete('/settings/cover');
      setCoverUrl(null); setCoverPreview(null);
      toast.success('Cover photo removed.');
    } catch { toast.error('Failed to remove.'); }
    finally { setDeleting(false); }
  };

  const shown = coverPreview || coverUrl;
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto', width: 220 }}>
          {shown ? (
            <div style={{ position: 'relative' }}>
              <img src={shown} alt="cover" style={{ width: 220, height: 120, objectFit: 'cover', borderRadius: 12, border: '1.5px solid #dde8f0' }} />
              <button onClick={handleDelete} disabled={deleting}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(231,76,60,0.88)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>
                {deleting ? '…' : '× Remove'}
              </button>
            </div>
          ) : (
            <div style={{ width: 220, height: 120, borderRadius: 12, border: '1.5px dashed #c8d8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF4FB' }}>
              <p style={{ fontSize: 11, color: '#9ab0c4', margin: 0, textAlign: 'center' }}>No cover photo<br/>Default gradient used</p>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#003B5C', margin: '0 0 6px' }}>Home Page Hero Background</p>
          <p style={{ fontSize: 12, color: '#7a94a8', margin: '0 0 16px', lineHeight: 1.6 }}>
            This image appears behind the hero section on the public home page.<br/>
            <strong style={{ color: '#003B5C' }}>Recommended:</strong> wide landscape photo, min 1400×600 px, max 15 MB.
          </p>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#003B5C,#00B5BD)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,181,189,0.3)' }}>
            {uploading ? 'Uploading…' : shown ? '📷 Change Cover Photo' : '📷 Upload Cover Photo'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  );
};

// ─── Technologist Dashboard ────────────────────────────────────────────────────────────────────────
const TechDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-tech'],
    queryFn: () => api.get('/dashboard/tech').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const reservationMutation = useMutation({
    mutationFn: ({ id, action, reason }) => api.patch(`/reservations/${id}/${action}`, { reason }),
    onSuccess: (_, vars) => {
      toast.success(`Reservation ${vars.action}ed`);
      queryClient.invalidateQueries(['dashboard-tech']);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('common.error')),
  });

  const trainingMutation = useMutation({
    mutationFn: ({ id, action }) => api.patch(`/training/${id}/${action}`),
    onSuccess: (_, vars) => {
      toast.success(`Training ${vars.action}ed`);
      queryClient.invalidateQueries(['dashboard-tech']);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('common.error')),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const { pendingReservations = [], pendingTraining = [], equipment = [], stats = {} } = data || {};

  return (
    <div style={{ minHeight: '100vh', background: '#f4f9f9' }}>
      {/* Header banner */}
      <div style={{ background: 'linear-gradient(135deg, #003B5C 0%, #00B5BD 100%)', padding: '36px 24px 28px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>REGAL Laboratory — Supervisor</p>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>{t('dashboard.welcome', { name: user.firstName })} 🔬</h1>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('dashboard.stats.pending'), value: stats.pendingCount || 0, accent: '#e67e22' },
          { label: t('dashboard.stats.confirmed'), value: stats.confirmedToday || 0, accent: '#27ae60' },
          { label: 'Training Pending', value: stats.pendingTrainingCount || 0, accent: '#00B5BD' },
          { label: t('dashboard.stats.thisWeek'), value: stats.totalReservationsWeek || 0, accent: '#003B5C' },
        ].map(s => (
          <div key={s.label} className="dash-stat-card" style={{ borderTopColor: s.accent }}>
            <p className="text-2xl font-bold font-mono" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs text-text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending reservations */}
      <section>
        <p className="section-title">{t('dashboard.tech.pendingRequests')}</p>
        {pendingReservations.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">No pending requests</div>
        ) : (
          <div className="space-y-3">
            {pendingReservations.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 800, fontSize: 15, color: '#003B5C', margin: '0 0 4px' }}>
                      {r.equipment.icon} {r.equipment.name}
                    </p>
                    <p className="text-xs" style={{color:"#4a6278"}}>
                      {r.user.firstName} {r.user.lastName} · {r.user.email}
                    </p>
                    <p className="text-xs mt-1" style={{color:"#4a6278"}}>
                      Start: {format(new Date(r.startTime), 'PPp')}
                    </p>
                    <p className="text-xs" style={{color:"#4a6278"}}>
                      End: &nbsp;&nbsp;{format(new Date(r.endTime), 'PPp')}
                    </p>
                    {r.experimentDescription && (
                      <p className="text-xs mt-1 italic line-clamp-2" style={{color:"#7a94a8"}}>“{r.experimentDescription}”</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reservationMutation.mutate({ id: r.id, action: 'confirm' })}
                      className="flex items-center gap-1 btn-primary text-xs px-3 py-1.5"
                    >
                      <CheckCircle size={12} />
                      {t('dashboard.tech.confirm')}
                    </button>
                    <button
                      onClick={() => reservationMutation.mutate({ id: r.id, action: 'reject', reason: 'Rejected by technologist' })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono
                                 border border-status-rejected text-status-rejected hover:bg-status-rejected/10 transition-colors"
                    >
                      <XCircle size={12} />
                      {t('dashboard.tech.reject')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Pending training */}
      <section>
        <p className="section-title">{t('dashboard.tech.trainingRequests')}</p>
        {pendingTraining.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">No training requests</div>
        ) : (
          <div className="space-y-3">
            {pendingTraining.map(s => (
              <TrainingCard key={s.id} s={s} trainingMutation={trainingMutation} queryClient={queryClient} t={t} />
            ))}
          </div>
        )}
      </section>

      {/* AI Insights */}
      <section>
        <InsightsPanel />
      </section>

      {/* Home Page Cover Photo */}
      <section>
        <p className="section-title">🏙️ Home Page Cover Photo</p>
        <CoverPhotoUpload />
      </section>

      {/* Equipment overview */}
      <section>
        {/* Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #003B5C 0%, #00B5BD 100%)',
          borderRadius: 18, padding: '22px 28px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Supervisor Dashboard</p>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: 0 }}>Equipment Overview</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>{equipment.length} machine{equipment.length !== 1 ? 's' : ''} managed</p>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Active', value: equipment.filter(e => !e.maintenanceMode).length, color: '#7af5c8' },
              { label: 'In Use Now', value: equipment.reduce((a, e) => a + (e.activeNow || 0), 0), color: '#fff' },
              { label: 'Maintenance', value: equipment.filter(e => e.maintenanceMode).length, color: '#ffd580' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 60 }}>
                <p style={{ color: s.color, fontSize: 28, fontWeight: 900, margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, margin: '4px 0 0', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {equipment.map(eq => (
            <div key={eq.id} className="card"
              style={{ borderTop: eq.maintenanceMode ? '3px solid #e67e22' : '3px solid #00B5BD' }}>
              {/* Delete button */}
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:6 }}>
                {eq.maintenanceMode && <AlertTriangle size={12} className="text-status-pending" style={{ marginRight:'auto' }} />}
                <button
                  onClick={async () => {
                    if (!window.confirm(`Delete "${eq.name}"? This cannot be undone.`)) return;
                    try {
                      await api.delete(`/equipment/${eq.id}`);
                      toast.success(`${eq.name} deleted.`);
                      queryClient.invalidateQueries(['dashboard-tech']);
                      queryClient.invalidateQueries(['equipment']);
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to delete.');
                    }
                  }}
                  style={{ fontSize:10, fontWeight:700, color:'#e74c3c', background:'#fff5f5', border:'1px solid #fcc', borderRadius:8, padding:'3px 10px', cursor:'pointer' }}
                >
                  🗑 Delete
                </button>
              </div>
              {/* English */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                <span style={{ fontSize:9, fontWeight:800, color:'#9ab0c4', letterSpacing:1.5, textTransform:'uppercase' }}>EN</span>
              </div>
              <EquipmentNameEditor equipmentId={eq.id} currentName={eq.name} />
              <EquipmentDescriptionEditor equipmentId={eq.id} currentDescription={eq.description} />
              {/* French */}
              <div style={{ borderTop:'1px dashed #dde8f0', paddingTop:6, marginTop:4 }}>
                <span style={{ fontSize:9, fontWeight:800, color:'#00B5BD', letterSpacing:1.5, textTransform:'uppercase' }}>FR</span>
              </div>
              <FieldEditor equipmentId={eq.id} field="nameFr" currentValue={eq.nameFr} label="Nom (FR)" />
              <FieldEditor equipmentId={eq.id} field="descriptionFr" currentValue={eq.descriptionFr} label="Description (FR)" multiline />
              <p style={{ fontSize: 12, color: '#00B5BD', margin: '2px 0' }}>
                {eq.reservationsThisMonth} {t('dashboard.tech.utilization')}
              </p>
              <p style={{ fontSize: 12, color: '#7a94a8', margin: 0 }}>In use now: {eq.activeNow}</p>
              <MaintenanceToggle
                equipmentId={eq.id}
                maintenanceMode={eq.maintenanceMode}
                maintenanceNote={eq.maintenanceNote}
              />
              <ImageUpload equipmentId={eq.id} currentImageUrl={eq.imageUrl || null} />
              <VideosManager equipmentId={eq.id} currentVideos={eq.videos || []} />
              <MaterialsManager equipmentId={eq.id} currentMaterials={eq.materials || []} />
            </div>
          ))}
          {/* Add new equipment slot */}
          <AddEquipmentCard />
        </div>
      </section>
      </div>
    </div>
  );
};

// ─── Dashboard router ─────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? <StudentDashboard /> : <TechDashboard />;
};

export default Dashboard;
