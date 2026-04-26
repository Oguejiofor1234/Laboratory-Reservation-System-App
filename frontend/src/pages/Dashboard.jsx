import { useState, useEffect } from 'react';
import { formatDateTimeET, formatTimeET } from '../utils/timezone';
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

// ─── Image Upload (Supervisor) — circular style matching the landing page circles
const ImageUpload = ({ equipmentId, currentImageUrl }) => {
  const [preview, setPreview]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]  = useState(false);
  const [hovered, setHovered]    = useState(false);
  const queryClient = useQueryClient();

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
      toast.success('Image uploaded! Visible on the home page.');
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      queryClient.invalidateQueries(['equipment-public']);
    } catch { toast.error('Upload failed.'); setPreview(null); }
    finally { setUploading(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this equipment photo?')) return;
    setDeleting(true);
    try {
      await api.delete(`/equipment/${equipmentId}/image`);
      toast.success('Photo removed.');
      setPreview(null);
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      queryClient.invalidateQueries(['equipment-public']);
    } catch { toast.error('Failed to remove.'); }
    finally { setDeleting(false); }
  };

  const shown = preview || currentImageUrl;
  const SIZE  = 160;

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

        {/* ── Circular upload zone ── */}
        <label
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: SIZE, height: SIZE,
            borderRadius: '50%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            position: 'relative', cursor: uploading ? 'wait' : 'pointer', overflow: 'hidden',
            flexShrink: 0,
            /* ring that matches the landing-page circle */
            background: shown
              ? 'transparent'
              : 'radial-gradient(circle at 38% 38%, rgba(0,181,189,0.14) 0%, rgba(0,59,92,0.07) 100%)',
            border: shown ? 'none' : '2px dashed rgba(0,181,189,0.45)',
            boxShadow: hovered ? '0 0 0 3px rgba(0,181,189,0.2)' : 'none',
            transition: 'box-shadow 0.2s',
          }}
        >
          {/* Dashed outer decorative ring (no image) */}
          {!shown && (
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: '1.5px dashed rgba(0,181,189,0.18)', pointerEvents: 'none',
            }} />
          )}

          {/* Image or placeholder */}
          {shown ? (
            <img
              src={shown}
              alt="equipment"
              style={{ width: SIZE, height: SIZE, objectFit: 'cover', borderRadius: '50%',
                       border: '2.5px solid rgba(0,181,189,0.3)', display: 'block' }}
            />
          ) : (
            <>
              <span style={{ fontSize: 22, marginBottom: 4 }}>📷</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#00B5BD',
                             textAlign: 'center', lineHeight: 1.3, letterSpacing: 0.5 }}>
                {uploading ? 'Uploading…' : 'Upload\nPhoto'}
              </span>
            </>
          )}

          {/* Hover overlay when image exists */}
          {shown && hovered && !uploading && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,30,48,0.62)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 18 }}>📷</span>
              <span style={{ fontSize: 9, color: '#fff', fontWeight: 700, letterSpacing: 0.5 }}>Change</span>
            </div>
          )}

          {/* Loading spinner overlay */}
          {uploading && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,181,189,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 9, color: '#00B5BD', fontWeight: 700 }}>…</span>
            </div>
          )}

          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={handleFile} disabled={uploading} />
        </label>

        {/* Remove button — only when an image exists */}
        {shown && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              fontSize: 9, fontWeight: 700, color: '#e74c3c',
              background: '#fff5f5', border: '1px solid #fcc',
              borderRadius: 6, padding: '2px 10px', cursor: 'pointer',
            }}
          >
            {deleting ? 'Removing…' : '× Remove Photo'}
          </button>
        )}

        <p style={{ fontSize: 9, color: '#9ab0c4', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
          {shown ? 'Shown in the circular frame on the home page' : 'Appears in the circular frame on the home page'}
        </p>
      </div>
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
    <div>
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
    <div>
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

// ─── Supervisor Picker (Supervisor) ───────────────────────────────────────
const SupervisorPicker = ({ equipmentId, currentPersonInChargeId }) => {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(currentPersonInChargeId || '');
  const queryClient = useQueryClient();

  const { data: techs = [] } = useQuery({
    queryKey: ['technologists'],
    queryFn: () => api.get('/auth/technologists').then(r => r.data.data),
    staleTime: 60000,
  });

  const handleChange = async (e) => {
    const val = e.target.value;
    setSelected(val);
    setSaving(true);
    try {
      await api.patch(`/equipment/${equipmentId}`, { personInChargeId: val || null });
      toast.success(val ? 'Supervisor assigned!' : 'Supervisor removed.');
      queryClient.invalidateQueries(['dashboard-tech']);
      queryClient.invalidateQueries(['equipment']);
      queryClient.invalidateQueries(['equipment-public']);
    } catch { toast.error('Failed to update supervisor.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <select
        value={selected}
        onChange={handleChange}
        disabled={saving}
        style={{
          width: '100%', fontSize: 12, color: selected ? '#003B5C' : '#9ab0c4',
          border: '1.5px solid #c8d8e8', borderRadius: 9, padding: '8px 10px',
          background: '#fff', outline: 'none', cursor: 'pointer',
          fontFamily: 'Inter,system-ui,sans-serif', fontWeight: selected ? 700 : 400,
        }}
      >
        <option value="">-- No supervisor assigned --</option>
        {techs.map(t => (
          <option key={t.id} value={t.id}>
            {t.firstName} {t.lastName} ({t.email})
          </option>
        ))}
      </select>
      {selected && (() => {
        const pic = techs.find(t => t.id === selected);
        return pic ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, padding:'8px 10px', background:'#f0fffe', borderRadius:9, border:'1px solid #b2e8ea' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#003B5C,#00B5BD)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12, flexShrink:0 }}>
              {pic.firstName[0]}
            </div>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'#003B5C', margin:0 }}>{pic.firstName} {pic.lastName}</p>
              <p style={{ fontSize:10, color:'#00B5BD', margin:0 }}>{pic.email}</p>
            </div>
          </div>
        ) : null;
      })()}
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

  const statusColor = { CONFIRMED:'#27ae60', RESCHEDULED:'#e67e22', REJECTED:'#e74c3c', PENDING:'#4a6278' }[s.status] || '#4a6278';
  const statusBg    = { CONFIRMED:'#f0fef4', RESCHEDULED:'#fff8f0', REJECTED:'#fff5f5', PENDING:'#EEF4FB' }[s.status] || '#EEF4FB';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding:'18px 20px' }}>

      {/* ── Header: equipment name + status badge on same row ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:8 }}>
        <p style={{ fontWeight:800, fontSize:14, color:'#003B5C', margin:0 }}>
          {s.equipment.icon} {s.equipment.name}
        </p>
        <span style={{ fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:20,
          background:statusBg, color:statusColor, border:`1px solid ${statusColor}44`,
          whiteSpace:'nowrap', flexShrink:0 }}>{s.status}</span>
      </div>

      {/* ── Student info ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10,
        padding:'8px 12px', background:'#f8fbff', borderRadius:10, border:'1px solid #dde8f0' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#003B5C,#00B5BD)',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13, flexShrink:0 }}>
          {s.student.firstName[0]}
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#003B5C', margin:0 }}>
            {s.student.firstName} {s.student.lastName}
          </p>
          <p style={{ fontSize:11, color:'#7a94a8', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {s.student.email}
          </p>
        </div>
      </div>

      {/* ── Requested time ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
        background:'#f8fbff', borderRadius:10, border:'1px solid #dde8f0',
        marginBottom: s.status === 'RESCHEDULED' && s.proposedAt ? 10 : 14 }}>
        <span style={{ fontSize:14 }}>📅</span>
        <div>
          <p style={{ fontSize:9, color:'#9ab0c4', fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 2px' }}>Requested</p>
          <p style={{ fontSize:13, color:'#003B5C', fontWeight:700, margin:0 }}>{formatDateTimeET(new Date(s.scheduledAt))}</p>
        </div>
      </div>

      {/* ── Awaiting student confirmation (RESCHEDULED) ── */}
      {s.status === 'RESCHEDULED' && s.proposedAt && (
        <div style={{ borderRadius:12, background:'#fff8f0', border:'2px solid #e67e2244',
          overflow:'hidden', marginBottom:14 }}>
          <div style={{ background:'#e67e22', padding:'7px 14px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>⏰</span>
            <p style={{ fontSize:12, fontWeight:800, color:'#fff', margin:0 }}>Proposed — awaiting student confirmation</p>
          </div>
          <div style={{ padding:'12px 14px' }}>
            <p style={{ fontSize:9, color:'#e67e22', fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 4px' }}>New Time</p>
            <p style={{ fontSize:13, color:'#003B5C', fontWeight:700, margin:0 }}>{formatDateTimeET(new Date(s.proposedAt))}</p>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {s.status === 'PENDING' && (
          <button onClick={() => trainingMutation.mutate({ id: s.id, action: 'confirm' })}
            className="btn-primary flex items-center gap-1" style={{ flex:1, justifyContent:'center', fontSize:13, padding:'9px 0' }}>
            <CheckCircle size={13} /> Confirm
          </button>
        )}
        {['PENDING','CONFIRMED'].includes(s.status) && (
          <button onClick={() => trainingMutation.mutate({ id: s.id, action: 'reject' })}
            style={{ flex:1, padding:'9px', borderRadius:9, border:'1.5px solid #e74c3c44',
              background:'#fff5f5', color:'#e74c3c', fontWeight:700, fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <XCircle size={13} /> Reject
          </button>
        )}
        {s.status === 'CONFIRMED' && (
          <button onClick={() => trainingMutation.mutate({ id: s.id, action: 'complete' })}
            style={{ flex:1, padding:'9px', borderRadius:9, border:'1.5px solid #00B5BD44',
              background:'#f0fffe', color:'#00B5BD', fontWeight:700, fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <GraduationCap size={13} /> Mark Complete
          </button>
        )}
        {['PENDING','CONFIRMED'].includes(s.status) && (
          <button onClick={() => setShowReschedule(r => !r)}
            style={{ flex:1, padding:'9px', borderRadius:9,
              border:'1.5px solid #e67e2244',
              background: showReschedule ? '#fff8f0' : 'transparent',
              color:'#e67e22', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            ⏰ Reschedule
          </button>
        )}
      </div>

      {/* ── Reschedule form ── */}
      {showReschedule && (
        <div style={{ marginTop:14, borderRadius:12, background:'#fff8f0',
          border:'2px solid #e67e2244', overflow:'hidden' }}>
          <div style={{ background:'#e67e22', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>⏰</span>
            <p style={{ fontSize:12, fontWeight:800, color:'#fff', margin:0 }}>Propose a New Training Time</p>
          </div>
          <div style={{ padding:'16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={lStyle}>Date *</label>
                <input type="date" value={proposedDate} min={today}
                  onChange={e => setProposedDate(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={lStyle}>Time *</label>
                <select value={proposedTime} onChange={e => setProposedTime(e.target.value)} style={iStyle}>
                  <option value="">-- Select --</option>
                  {Array.from({ length: 24 }, (_, h) => [
                    `${String(h).padStart(2,'0')}:00`,
                    `${String(h).padStart(2,'0')}:30`,
                  ]).flat().map(slot => (
                    <option key={slot} value={slot}>
                      {(() => { const [hh,mm]=slot.split(':'); const h=parseInt(hh); return `${h===0?12:h>12?h-12:h}:${mm} ${h<12?'AM':'PM'}`; })()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            {proposedDate && proposedTime && (
              <div style={{ padding:'9px 12px', borderRadius:9, background:'#fffbf0',
                border:'1px solid #e67e2244', marginBottom:12 }}>
                <p style={{ fontSize:9, color:'#e67e22', fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 3px' }}>Preview</p>
                <p style={{ fontSize:13, color:'#003B5C', fontWeight:700, margin:0 }}>
                  {formatDateTimeET(new Date(`${proposedDate}T${proposedTime}`))}
                </p>
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label style={lStyle}>Reason (optional)</label>
              <input value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)}
                placeholder="e.g. Equipment maintenance, prior commitment…" style={iStyle} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleReschedule}
                disabled={submitting || !proposedDate || !proposedTime}
                style={{ flex:1, padding:'10px', borderRadius:9,
                  background:(!proposedDate||!proposedTime)?'#ccc':'#e67e22',
                  color:'#fff', fontWeight:800, fontSize:13, border:'none',
                  cursor:(!proposedDate||!proposedTime)?'not-allowed':'pointer' }}>
                {submitting ? 'Sending…' : 'Send Proposal'}
              </button>
              <button onClick={() => { setShowReschedule(false); setProposedDate(''); setProposedTime(''); setRescheduleReason(''); }}
                style={{ padding:'10px 18px', borderRadius:9, background:'transparent',
                  color:'#999', fontWeight:600, fontSize:13, border:'1px solid #dde8f0', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Reservation Card (Supervisor) — Confirm / Reject / Reschedule ─────────────
const ReservationCard = ({ r, reservationMutation, queryClient, t }) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [pStartDate, setPStartDate] = useState('');
  const [pStartTime, setPStartTime] = useState('');
  const [pEndDate, setPEndDate] = useState('');
  const [pEndTime, setPEndTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const timeSlots = Array.from({ length: 24 }, (_, h) => [
    `${String(h).padStart(2, '0')}:00`,
    `${String(h).padStart(2, '0')}:30`,
  ]).flat();

  const formatTimeSlot = (slot) => {
    const [hh, mm] = slot.split(':');
    const h = parseInt(hh);
    return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  };

  const handleReschedule = async () => {
    if (!pStartDate || !pStartTime || !pEndDate || !pEndTime) {
      return toast.error('Please fill all date and time fields.');
    }
    const pStart = new Date(`${pStartDate}T${pStartTime}`);
    const pEnd = new Date(`${pEndDate}T${pEndTime}`);
    if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime())) return toast.error('Invalid date or time.');
    if (pStart >= pEnd) return toast.error('Start must be before end time.');
    if (pStart <= new Date()) return toast.error('Proposed start time must be in the future.');

    setSubmitting(true);
    try {
      await api.patch(`/reservations/${r.id}/reschedule`, {
        proposedStartTime: pStart.toISOString(),
        proposedEndTime: pEnd.toISOString(),
        reason: rescheduleReason || undefined,
      });
      toast.success('Reschedule proposal sent to student.');
      queryClient.invalidateQueries(['dashboard-tech']);
      setShowReschedule(false);
      setPStartDate('');
      setPStartTime('');
      setPEndDate('');
      setPEndTime('');
      setRescheduleReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const inputStyle = {
    width: '100%',
    fontSize: 13,
    color: '#1a2e44',
    border: '1.5px solid #c8d8e8',
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter,system-ui,sans-serif',
    background: '#fff',
  };
  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: '#003B5C',
    display: 'block',
    marginBottom: 5,
  };
  const statusColors = { CONFIRMED: '#27ae60', RESCHEDULED: '#e67e22', REJECTED: '#e74c3c', PENDING: '#4a6278' };
  const statusBgs = { CONFIRMED: '#f0fef4', RESCHEDULED: '#fff8f0', REJECTED: '#fff5f5', PENDING: '#EEF4FB' };
  const statusBorders = { CONFIRMED: '#27ae6044', RESCHEDULED: '#e67e2244', REJECTED: '#e74c3c44', PENDING: '#dde8f0' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <p style={{ fontWeight: 800, fontSize: 15, color: '#003B5C', margin: '0 0 4px' }}>
            {r.equipment.icon} {r.equipment.name}
          </p>
          <p className="text-xs" style={{ color: '#4a6278' }}>
            {r.user.firstName} {r.user.lastName} · {r.user.email}
          </p>
          <p className="text-xs mt-1" style={{ color: '#4a6278' }}>
            Start: {format(new Date(r.startTime), 'PPp')}
          </p>
          <p className="text-xs" style={{ color: '#4a6278' }}>
            End: &nbsp;&nbsp;{format(new Date(r.endTime), 'PPp')}
          </p>
          {r.experimentDescription && (
            <p className="text-xs mt-1 italic line-clamp-2" style={{ color: '#7a94a8' }}>“{r.experimentDescription}”</p>
          )}
          {r.status === 'RESCHEDULED' && r.proposedStartTime && (
            <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 9, background: '#fff8f0', border: '1.5px solid #e67e2233' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#e67e22', margin: '0 0 2px' }}>⏰ Awaiting student confirmation</p>
              <p style={{ fontSize: 12, color: '#4a6278', margin: 0 }}>
                Proposed: {format(new Date(r.proposedStartTime), 'PPp')} – {format(new Date(r.proposedEndTime), 'p')}
              </p>
              {r.rescheduleReason && (
                <p style={{ fontSize: 11, color: '#9ab0c4', margin: '2px 0 0' }}>{r.rescheduleReason}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2 flex-wrap justify-end">
            {r.status === 'PENDING' && (
              <button onClick={() => reservationMutation.mutate({ id: r.id, action: 'confirm' })}
                className="flex items-center gap-1 btn-primary text-xs px-3 py-1.5">
                <CheckCircle size={12} /> {t('dashboard.tech.confirm')}
              </button>
            )}
            {['PENDING', 'CONFIRMED'].includes(r.status) && (
              <button onClick={() => reservationMutation.mutate({ id: r.id, action: 'reject', reason: 'Rejected by supervisor' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-status-rejected text-status-rejected hover:bg-status-rejected/10 transition-colors">
                <XCircle size={12} /> {t('dashboard.tech.reject')}
              </button>
            )}
            {['PENDING', 'CONFIRMED'].includes(r.status) && (
              <button onClick={() => setShowReschedule(s => !s)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e67e22', background: showReschedule ? '#fff8f0' : 'transparent', color: '#e67e22', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                ⏰ Reschedule
              </button>
            )}
          </div>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 20,
            letterSpacing: 0.5,
            background: statusBgs[r.status] || '#EEF4FB',
            color: statusColors[r.status] || '#4a6278',
            border: `1px solid ${statusBorders[r.status] || '#dde8f0'}`,
          }}>
            {r.status}
          </span>
        </div>
      </div>
      {showReschedule && (
        <div style={{ marginTop: 16, padding: '18px 20px', background: '#fff8f0', borderRadius: 14, border: '1.5px solid #e67e2244', boxShadow: '0 2px 12px rgba(230,126,34,0.08)' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#e67e22', margin: '0 0 14px' }}>⏰ Propose New Date & Time</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>New Start Date *</label>
              <input type="date" value={pStartDate} min={today} onChange={e => setPStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Start Time *</label>
              <select value={pStartTime} onChange={e => setPStartTime(e.target.value)} style={inputStyle}>
                <option value="">-- Select --</option>
                {timeSlots.map(slot => <option key={slot} value={slot}>{formatTimeSlot(slot)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>New End Date *</label>
              <input type="date" value={pEndDate} min={pStartDate || today} onChange={e => setPEndDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End Time *</label>
              <select value={pEndTime} onChange={e => setPEndTime(e.target.value)} style={inputStyle}>
                <option value="">-- Select --</option>
                {timeSlots.map(slot => <option key={slot} value={slot}>{formatTimeSlot(slot)}</option>)}
              </select>
            </div>
          </div>
          {pStartDate && pStartTime && pEndDate && pEndTime && (
            <div style={{ padding: '9px 14px', borderRadius: 9, background: 'rgba(230,126,34,0.1)', border: '1px solid #e67e2233', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#e67e22', margin: 0 }}>
                📅 {new Date(`${pStartDate}T${pStartTime}`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                {' '}–{' '}
                {new Date(`${pEndDate}T${pEndTime}`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Reason (optional)</label>
            <input value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)}
              placeholder="e.g. Equipment maintenance, schedule conflict…" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleReschedule} disabled={submitting || !pStartDate || !pStartTime || !pEndDate || !pEndTime}
              style={{ flex: 1, padding: '10px', borderRadius: 9, background: (!pStartDate || !pStartTime || !pEndDate || !pEndTime) ? '#ccc' : '#e67e22', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: (!pStartDate || !pStartTime || !pEndDate || !pEndTime) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {submitting ? 'Sending…' : '⏰ Send Reschedule Proposal'}
            </button>
            <button onClick={() => {
              setShowReschedule(false);
              setPStartDate('');
              setPStartTime('');
              setPEndDate('');
              setPEndTime('');
              setRescheduleReason('');
            }}
              style={{ padding: '10px 18px', borderRadius: 9, background: 'transparent', color: '#999', fontWeight: 600, fontSize: 13, border: '1px solid #dde8f0', cursor: 'pointer' }}>
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
                    {/* Tutorial videos — only shown when booking is CONFIRMED */}
                    {r.status === 'CONFIRMED' && (() => {
                      const vids = Array.isArray(r.equipment?.videos) && r.equipment.videos.length > 0
                        ? r.equipment.videos
                        : r.equipment?.videoUrl ? [{ name: 'Equipment Tutorial', url: r.equipment.videoUrl }] : [];
                      if (vids.length === 0) return null;
                      return (
                        <div className="mt-3 p-3 rounded-lg bg-teal/5 border border-teal/20">
                          <p className="text-[10px] text-teal font-bold uppercase tracking-wider mb-3">
                            🎬 Equipment Tutorial{vids.length > 1 ? 's' : ''}
                          </p>
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
                      );
                    })()}
                    {/* Reference materials — only shown when booking is CONFIRMED */}
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
                {r.status === 'RESCHEDULED' && r.proposedStartTime && (
                  <div style={{ marginTop:12, borderRadius:12, background:'#fff8f0', border:'2px solid #e67e2244', overflow:'hidden' }}>
                    {/* Banner */}
                    <div style={{ background:'#e67e22', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:15 }}>⏰</span>
                      <p style={{ fontSize:12, fontWeight:800, color:'#fff', margin:0 }}>Supervisor proposed a new booking time</p>
                    </div>
                    <div style={{ padding:'14px' }}>
                      {/* Start → Finish row */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10,
                        padding:'10px 12px', background:'#fffbf0', borderRadius:9, border:'1px solid #e67e2244' }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:9, color:'#00B5BD', fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 2px' }}>Start</p>
                          <p style={{ fontSize:13, color:'#003B5C', fontWeight:700, margin:0 }}>{formatDateTimeET(new Date(r.proposedStartTime))}</p>
                        </div>
                        <span style={{ color:'#e67e22', fontWeight:800, fontSize:16 }}>→</span>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:9, color:'#8e44ad', fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 2px' }}>Finish</p>
                          <p style={{ fontSize:13, color:'#003B5C', fontWeight:700, margin:0 }}>{formatDateTimeET(new Date(r.proposedEndTime))}</p>
                        </div>
                      </div>
                      {r.rescheduleReason && (
                        <div style={{ padding:'8px 12px', background:'#f8fbff', borderRadius:8, border:'1px solid #dde8f0', marginBottom:12 }}>
                          <p style={{ fontSize:10, color:'#9ab0c4', fontWeight:700, letterSpacing:1, textTransform:'uppercase', margin:'0 0 3px' }}>Reason</p>
                          <p style={{ fontSize:12, color:'#4a6278', margin:0 }}>{r.rescheduleReason}</p>
                        </div>
                      )}
                      <div style={{ display:'flex', gap:10 }}>
                        <button onClick={async () => {
                          try {
                            await api.patch(`/reservations/${r.id}/accept-reschedule`);
                            toast.success('New time accepted! Booking confirmed.');
                            queryClient.invalidateQueries(['dashboard-student']);
                          } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
                        }} style={{ flex:1, padding:'10px', borderRadius:9, background:'#27ae60', color:'#fff',
                          fontWeight:800, fontSize:13, border:'none', cursor:'pointer', boxShadow:'0 2px 8px rgba(39,174,96,0.3)' }}>
                          ✅ Accept New Time
                        </button>
                        <button onClick={async () => {
                          try {
                            await api.patch(`/reservations/${r.id}/reject-reschedule`);
                            toast.success('Reschedule rejected — original booking restored.');
                            queryClient.invalidateQueries(['dashboard-student']);
                          } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
                        }} style={{ flex:1, padding:'10px', borderRadius:9, background:'#fff5f5',
                          color:'#e74c3c', border:'1.5px solid #e74c3c44', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                          ❌ Keep Original Time
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
            {trainingSessions.map(s => {
              const statusColor = { CONFIRMED:'#27ae60', RESCHEDULED:'#e67e22', REJECTED:'#e74c3c', PENDING:'#4a6278', COMPLETED:'#003B5C' }[s.status] || '#4a6278';
              const statusBg    = { CONFIRMED:'#f0fef4', RESCHEDULED:'#fff8f0', REJECTED:'#fff5f5', PENDING:'#EEF4FB', COMPLETED:'#EEF4FB' }[s.status] || '#EEF4FB';
              return (
                <div key={s.id} className="card" style={{ padding: '18px 20px' }}>

                  {/* ── Header row: equipment + status badge ── */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                    <p style={{ fontWeight:800, fontSize:14, color:'#003B5C', margin:0 }}>
                      {s.equipment.icon} {s.equipment.name}
                    </p>
                    <span style={{ fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:20,
                      background:statusBg, color:statusColor,
                      border:`1px solid ${statusColor}44`, whiteSpace:'nowrap', flexShrink:0 }}>
                      {s.status}
                    </span>
                  </div>

                  {/* ── Scheduled time ── */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                    background:'#f8fbff', borderRadius:10, border:'1px solid #dde8f0', marginBottom: s.status==='RESCHEDULED' ? 12 : 0 }}>
                    <span style={{ fontSize:14 }}>📅</span>
                    <div>
                      <p style={{ fontSize:10, color:'#9ab0c4', fontWeight:700, letterSpacing:1, textTransform:'uppercase', margin:'0 0 2px' }}>Scheduled</p>
                      <p style={{ fontSize:13, color:'#003B5C', fontWeight:700, margin:0 }}>{formatDateTimeET(new Date(s.scheduledAt))}</p>
                    </div>
                  </div>

                  {/* ── Reschedule proposal (only when RESCHEDULED) ── */}
                  {s.status === 'RESCHEDULED' && s.proposedAt && (
                    <div style={{ borderRadius:12, background:'#fff8f0', border:'2px solid #e67e2244', overflow:'hidden' }}>
                      {/* Banner */}
                      <div style={{ background:'#e67e22', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:15 }}>⏰</span>
                        <p style={{ fontSize:12, fontWeight:800, color:'#fff', margin:0, letterSpacing:0.3 }}>
                          Supervisor proposed a new training time
                        </p>
                      </div>
                      <div style={{ padding:'14px' }}>
                        {/* New time */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10,
                          padding:'10px 12px', background:'#fffbf0', borderRadius:9, border:'1px solid #e67e2244' }}>
                          <span style={{ fontSize:13 }}>📅</span>
                          <div>
                            <p style={{ fontSize:9, color:'#e67e22', fontWeight:800, letterSpacing:1.5,
                              textTransform:'uppercase', margin:'0 0 2px' }}>New Proposed Time</p>
                            <p style={{ fontSize:13, color:'#003B5C', fontWeight:700, margin:0 }}>
                              {formatDateTimeET(new Date(s.proposedAt))}
                            </p>
                          </div>
                        </div>
                        {s.rescheduleReason && (
                          <div style={{ padding:'8px 12px', background:'#f8fbff', borderRadius:8,
                            border:'1px solid #dde8f0', marginBottom:12 }}>
                            <p style={{ fontSize:10, color:'#9ab0c4', fontWeight:700, letterSpacing:1,
                              textTransform:'uppercase', margin:'0 0 3px' }}>Reason</p>
                            <p style={{ fontSize:12, color:'#4a6278', margin:0 }}>{s.rescheduleReason}</p>
                          </div>
                        )}
                        {/* Action buttons */}
                        <div style={{ display:'flex', gap:10 }}>
                          <button onClick={async () => {
                            try { await api.patch(`/training/${s.id}/accept-reschedule`);
                              toast.success('New time accepted!');
                              queryClient.invalidateQueries(['dashboard-student']);
                            } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
                          }} style={{ flex:1, padding:'10px', borderRadius:9, background:'#27ae60', color:'#fff',
                            fontWeight:800, fontSize:13, border:'none', cursor:'pointer',
                            boxShadow:'0 2px 8px rgba(39,174,96,0.3)' }}>
                            ✅ Accept New Time
                          </button>
                          <button onClick={async () => {
                            try { await api.patch(`/training/${s.id}/reject-reschedule`);
                              toast.success('Reschedule rejected — supervisor notified.');
                              queryClient.invalidateQueries(['dashboard-student']);
                            } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
                          }} style={{ flex:1, padding:'10px', borderRadius:9, background:'#fff5f5',
                            color:'#e74c3c', border:'1.5px solid #e74c3c44', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                            ❌ Reject Proposal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Machine Usage chart */}
      <section>
        <p className="section-title mb-3">🔬 Machine Usage (Last 30 Days)</p>
        <div className="card">
          {data.equipmentRanking.length === 0 ? (
            <p className="text-[11px] text-text-muted italic text-center py-4">No booking data yet.</p>
          ) : (() => {
            const maxCount = Math.max(...data.equipmentRanking.map(e => e.count), 1);
            const barColors = [
              'linear-gradient(90deg,#00B5BD,#007b82)',
              'linear-gradient(90deg,#003B5C,#0059a0)',
              'linear-gradient(90deg,#27ae60,#1e8449)',
              'linear-gradient(90deg,#e67e22,#d35400)',
              'linear-gradient(90deg,#8e44ad,#6c3483)',
              'linear-gradient(90deg,#e74c3c,#c0392b)',
              'linear-gradient(90deg,#1abc9c,#148f77)',
              'linear-gradient(90deg,#f39c12,#d68910)',
            ];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.equipmentRanking.map((eq, i) => {
                  const pct = maxCount > 0 ? Math.max((eq.count / maxCount) * 100, eq.count > 0 ? 4 : 0) : 0;
                  const isTop = i === 0 && eq.count > 0;
                  return (
                    <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Machine name */}
                      <div style={{ width: 120, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{eq.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#003B5C', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={eq.name}>{eq.name}</span>
                      </div>
                      {/* Bar track */}
                      <div style={{ flex: 1, background: '#EEF4FB', borderRadius: 20, height: 18, overflow: 'hidden', position: 'relative' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.06 }}
                          style={{
                            height: '100%', borderRadius: 20,
                            background: barColors[i % barColors.length],
                            boxShadow: isTop ? '0 0 8px rgba(0,181,189,0.4)' : 'none',
                            position: 'relative',
                          }}
                        />
                      </div>
                      {/* Count + TOP badge */}
                      <div style={{ width: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: isTop ? '#00B5BD' : '#4a6278' }}>{eq.count}</span>
                        {isTop && (
                          <span style={{ fontSize: 8, fontWeight: 800, background: '#00B5BD', color: '#fff', borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5 }}>TOP</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-text-muted mt-2">Number of confirmed + completed bookings per machine</p>
              </div>
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

      {/* Reservations — pending, confirmed, rescheduled */}
      <section>
        <p className="section-title">📋 Booking Requests &amp; Active Reservations</p>
        {pendingReservations.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">No active reservation requests</div>
        ) : (
          <div className="space-y-3">
            {pendingReservations.map(r => (
              <ReservationCard key={r.id} r={r} reservationMutation={reservationMutation} queryClient={queryClient} t={t} />
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
        {equipment.length === 0 && (
          <div style={{ background:'#f0fffe', border:'2px dashed #00B5BD44', borderRadius:16, padding:'32px 24px', marginBottom:20, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔬</div>
            <h3 style={{ color:'#003B5C', fontWeight:800, fontSize:18, margin:'0 0 8px' }}>No equipment registered yet</h3>
            <p style={{ color:'#7a94a8', fontSize:13, margin:'0 0 20px', lineHeight:1.6 }}>
              Click <strong style={{color:'#00B5BD'}}>Add Equipment</strong> below to register your first machine.<br/>
              Once added, you can upload a photo, set the name &amp; description, manage availability, add tutorial videos and reference materials.
            </p>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:20 }}>
          {/* Add equipment card always first */}
          <AddEquipmentCard />
          {equipment.map(eq => (
            <div key={eq.id} style={{
              background:'#fff', borderRadius:20,
              border: eq.maintenanceMode ? '2px solid #e67e2244' : '2px solid #e8f4fb',
              boxShadow:'0 2px 16px rgba(0,59,92,0.07)',
              overflow:'hidden',
            }}>

              {/* ── Card header ── */}
              <div style={{ background: eq.maintenanceMode ? 'linear-gradient(135deg,#e67e22,#f39c12)' : 'linear-gradient(135deg,#003B5C,#00B5BD)', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {eq.maintenanceMode && <AlertTriangle size={14} color="#fff" />}
                  <span style={{ fontSize:13, fontWeight:800, color:'#fff', letterSpacing:0.3 }}>{eq.name}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, background:'rgba(255,255,255,0.2)', color:'#fff', borderRadius:20, padding:'2px 10px' }}>
                    {eq.activeNow > 0 ? `🟡 In Use` : eq.maintenanceMode ? '🔧 Maintenance' : '🟢 Available'}
                  </span>
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
                    style={{ fontSize:11, fontWeight:700, color:'#fff', background:'rgba(231,76,60,0.75)', border:'none', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div style={{ padding:'20px 20px 16px' }}>

                {/* ── 1. Machine Photo ── */}
                <div style={{ marginBottom:20, padding:'16px', background:'#f8fbff', borderRadius:14, border:'1.5px solid #e8f4fb' }}>
                  <p style={{ fontSize:11, fontWeight:800, color:'#003B5C', letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
                    📷 Machine Photo
                    <span style={{ fontSize:10, color:'#9ab0c4', fontWeight:500, textTransform:'none', letterSpacing:0 }}>— shown on homepage &amp; booking page</span>
                  </p>
                  <ImageUpload equipmentId={eq.id} currentImageUrl={eq.imageUrl || null} />
                </div>

                {/* ── 2. Machine Info ── */}
                <div style={{ marginBottom:20, padding:'16px', background:'#f8fbff', borderRadius:14, border:'1.5px solid #e8f4fb' }}>
                  <p style={{ fontSize:11, fontWeight:800, color:'#003B5C', letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 12px' }}>📝 Machine Information</p>

                  <div style={{ marginBottom:10 }}>
                    <span style={{ fontSize:9, fontWeight:800, color:'#9ab0c4', letterSpacing:1.5, textTransform:'uppercase', display:'block', marginBottom:4 }}>English</span>
                    <EquipmentNameEditor equipmentId={eq.id} currentName={eq.name} />
                    <EquipmentDescriptionEditor equipmentId={eq.id} currentDescription={eq.description} />
                  </div>

                  <div style={{ borderTop:'1px dashed #dde8f0', paddingTop:10 }}>
                    <span style={{ fontSize:9, fontWeight:800, color:'#00B5BD', letterSpacing:1.5, textTransform:'uppercase', display:'block', marginBottom:4 }}>Français</span>
                    <FieldEditor equipmentId={eq.id} field="nameFr" currentValue={eq.nameFr} label="Nom (FR)" />
                    <FieldEditor equipmentId={eq.id} field="descriptionFr" currentValue={eq.descriptionFr} label="Description (FR)" multiline />
                  </div>

                  <div style={{ marginTop:10, display:'flex', gap:16, fontSize:11, color:'#9ab0c4' }}>
                    <span>📊 {eq.reservationsThisMonth} bookings (30 days)</span>
                    <span>⚡ {eq.activeNow} active now</span>
                  </div>

                  <div style={{ borderTop:'1px dashed #dde8f0', paddingTop:10, marginTop:10 }}>
                    <span style={{ fontSize:9, fontWeight:800, color:'#003B5C', letterSpacing:1.5, textTransform:'uppercase', display:'block', marginBottom:6 }}>Supervisor In Charge</span>
                    <SupervisorPicker equipmentId={eq.id} currentPersonInChargeId={eq.personInChargeId} />
                  </div>
                </div>

                {/* ── 3. Availability ── */}
                <div style={{ marginBottom:20, padding:'16px', background:'#f8fbff', borderRadius:14, border:'1.5px solid #e8f4fb' }}>
                  <p style={{ fontSize:11, fontWeight:800, color:'#003B5C', letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 12px' }}>⚙️ Availability</p>
                  <MaintenanceToggle equipmentId={eq.id} maintenanceMode={eq.maintenanceMode} maintenanceNote={eq.maintenanceNote} />
                </div>

                {/* ── 4. Tutorial Videos ── */}
                <div style={{ marginBottom:20, padding:'16px', background:'#f8fbff', borderRadius:14, border:'1.5px solid #e8f4fb' }}>
                  <p style={{ fontSize:11, fontWeight:800, color:'#003B5C', letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 12px' }}>🎬 Tutorial Videos</p>
                  <VideosManager equipmentId={eq.id} currentVideos={eq.videos || []} />
                </div>

                {/* ── 5. Reference Materials ── */}
                <div style={{ padding:'16px', background:'#f8fbff', borderRadius:14, border:'1.5px solid #e8f4fb' }}>
                  <p style={{ fontSize:11, fontWeight:800, color:'#003B5C', letterSpacing:1.5, textTransform:'uppercase', margin:'0 0 12px' }}>📎 Reference Materials</p>
                  <MaterialsManager equipmentId={eq.id} currentMaterials={eq.materials || []} />
                </div>

              </div>
            </div>
          ))}
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
