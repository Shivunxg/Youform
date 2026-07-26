import { useState, useRef } from 'react';
import { Search, Upload, Link, Image, Lock, ImageOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isPlanAtLeast } from '@/lib/plans';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };
const UTM = 'utm_source=youform&utm_medium=referral';

const CATEGORIES = [
  { id: 'people',    label: 'People'    },
  { id: 'workspace', label: 'Workspace' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'product',   label: 'Product'   },
];

const TABS = [
  { id: 'curated', label: 'Curated', Icon: Image,  free: true  },
  { id: 'search',  label: 'Search',  Icon: Search, free: false },
  { id: 'upload',  label: 'Upload',  Icon: Upload, free: false },
  { id: 'link',    label: 'Link',    Icon: Link,   free: true  },
];

function PlanLock({ feature }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center mb-3">
        <Lock className="w-4 h-4 text-orange-500" />
      </div>
      <p className="text-sm font-bold text-gray-800 mb-1" style={SG}>{feature} requires Pro</p>
      <p className="text-xs text-gray-500 leading-relaxed">
        Upgrade your plan to unlock this feature.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-gray-100 animate-pulse" style={{ aspectRatio: '4/3' }} />
      ))}
    </div>
  );
}

function PhotoThumb({ photo, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      title={photo.alt || photo.photographer}
      className="relative rounded-lg overflow-hidden transition-all group"
      style={{
        border: isActive ? '2px solid #f97316' : '2px solid #d1d5db',
        boxShadow: isActive ? '0 0 0 2px #f97316' : 'none',
        aspectRatio: '4/3',
      }}
    >
      <img
        src={photo.thumb}
        alt={photo.alt}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      />
      <div className="absolute inset-0 flex items-end bg-transparent group-hover:bg-black/30 transition-colors duration-150">
        <span
          className="w-full px-1 py-0.5 text-[8px] font-medium text-white text-center leading-tight opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate"
          style={SG}
        >
          {photo.photographer}
        </span>
      </div>
    </button>
  );
}

function UnsplashCredit() {
  return (
    <a
      href={`https://unsplash.com/?${UTM}`}
      target="_blank" rel="noopener noreferrer"
      className="block text-center text-[9px] text-gray-400 hover:text-gray-600 transition-colors mt-1"
    >
      Photos from Unsplash
    </a>
  );
}

function CuratedTab({ current, onSelect }) {
  const [category, setCategory] = useState('people');
  const { data, isLoading, error } = useQuery({
    queryKey: ['unsplash-curated', category],
    queryFn: () => api.images.curated(category),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={clsx(
              'text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 transition-colors',
              category === c.id
                ? 'bg-[#111] text-white border-[#111]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            )}
            style={SG}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && <Skeleton />}
      {error && <p className="text-xs text-red-500 text-center py-4">Failed to load photos. Check UNSPLASH_ACCESS_KEY.</p>}
      {data?.photos && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {data.photos.map(photo => (
              <PhotoThumb
                key={photo.id}
                photo={photo}
                isActive={current === photo.url}
                onClick={() => onSelect(current === photo.url ? null : photo.url, photo)}
              />
            ))}
          </div>
          <UnsplashCredit />
        </>
      )}
    </div>
  );
}

function SearchTab({ current, onSelect, workspaceId, plan }) {
  const [query, setQuery]           = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['unsplash-search', activeQuery, workspaceId],
    queryFn: () => api.images.search(activeQuery, workspaceId),
    enabled: !!activeQuery && isPlanAtLeast(plan, 'pro'),
    staleTime: 5 * 60_000,
  });

  if (!isPlanAtLeast(plan, 'pro')) return <PlanLock feature="Unsplash search" />;

  function submit() {
    const q = query.trim();
    if (q) setActiveQuery(q);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Search Unsplash…"
          className="flex-1 text-xs border-2 border-[#111] rounded-xl px-3 py-2 outline-none focus:border-[#f97316]"
          style={SG}
        />
        <button
          onClick={submit}
          className="px-3 py-2 rounded-xl bg-[#111] text-white border-2 border-[#111] hover:bg-gray-800 transition-colors"
          style={{ boxShadow: '2px 2px 0 #f97316' }}
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {!activeQuery && <p className="text-xs text-gray-400 text-center py-4">Search for any image on Unsplash</p>}
      {isLoading && <Skeleton />}
      {error && <p className="text-xs text-red-500 text-center py-4">Search failed</p>}
      {data?.photos?.length === 0 && activeQuery && (
        <p className="text-xs text-gray-400 text-center py-4">No results for "{activeQuery}"</p>
      )}
      {data?.photos && data.photos.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {data.photos.map(photo => (
              <PhotoThumb
                key={photo.id}
                photo={photo}
                isActive={current === photo.url}
                onClick={() => onSelect(current === photo.url ? null : photo.url, photo)}
              />
            ))}
          </div>
          <UnsplashCredit />
        </>
      )}
    </div>
  );
}

function UploadTab({ onSelect, workspaceId, plan }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  if (!isPlanAtLeast(plan, 'pro')) return <PlanLock feature="Image upload" />;

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    setUploading(true);
    try {
      const { url } = await api.images.upload(workspaceId, file);
      onSelect(url, null);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => fileRef.current?.click()}
      className={clsx(
        'w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 cursor-pointer transition-all',
        dragOver ? 'border-[#f97316] bg-orange-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
      )}
    >
      {uploading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Uploading…
        </div>
      ) : (
        <>
          <Upload className="w-6 h-6 text-gray-400 mb-2" />
          <p className="text-xs font-semibold text-gray-600 text-center" style={SG}>
            Drop an image or click to browse
          </p>
          <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WebP — max 10 MB</p>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

function LinkTab({ onSelect }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error

  function tryApply() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus('loading');
    const img = new window.Image();
    img.onload  = () => { setStatus('ok'); onSelect(trimmed, null); };
    img.onerror = () => setStatus('error');
    img.src = trimmed;
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500">Paste a public image URL</p>
      <div className="flex gap-1.5">
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setStatus('idle'); }}
          onKeyDown={e => e.key === 'Enter' && tryApply()}
          placeholder="https://example.com/image.jpg"
          className="flex-1 text-xs border-2 border-[#111] rounded-xl px-3 py-2 outline-none focus:border-[#f97316]"
          style={SG}
        />
        <button
          onClick={tryApply}
          className="px-3 py-2 rounded-xl bg-[#111] text-white border-2 border-[#111] hover:bg-gray-800 transition-colors text-xs font-bold"
          style={{ ...SG, boxShadow: '2px 2px 0 #f97316' }}
        >
          Use
        </button>
      </div>
      {status === 'loading' && <p className="text-[10px] text-gray-400">Checking URL…</p>}
      {status === 'error'   && <p className="text-[10px] text-red-500">Could not load image from this URL</p>}
      {status === 'ok'      && (
        <div className="rounded-xl overflow-hidden border-2 border-emerald-400" style={{ boxShadow: '2px 2px 0 #34d399' }}>
          <img src={url.trim()} alt="" className="w-full h-20 object-cover" />
          <p className="text-[9px] text-center text-emerald-600 py-1 font-semibold" style={SG}>✓ Image applied</p>
        </div>
      )}
    </div>
  );
}

export default function ImagePickerPanel({ selectedQuestion, onUpdateConfig, workspaceId, plan = 'free' }) {
  const [tab, setTab] = useState('curated');

  if (!selectedQuestion) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-xs text-gray-400 italic">Select a block to add an in-block image</p>
      </div>
    );
  }

  const current  = selectedQuestion.config?.blockImage ?? null;
  const position = selectedQuestion.config?.blockImagePosition ?? 'right';
  const attribution = selectedQuestion.config?.blockImageAttribution ?? null;

  function handleSelect(url, photo) {
    if (!url) {
      onUpdateConfig({ blockImage: null, blockImagePosition: undefined, blockImageAttribution: undefined, blockImageSource: undefined });
      return;
    }
    const source = tab === 'upload' ? 'upload' : tab === 'link' ? 'link' : 'unsplash';
    onUpdateConfig({
      blockImage: url,
      blockImagePosition: position,
      blockImageSource: source,
      blockImageAttribution: photo
        ? { photographer: photo.photographer, photographerUrl: photo.photographerUrl, unsplashUrl: photo.unsplashUrl }
        : null,
    });
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Current image preview */}
      {current && (
        <div
          className="relative w-full h-16 rounded-xl border-2 border-[#111] overflow-hidden"
          style={{ boxShadow: '2px 2px 0 #111' }}
        >
          <img src={current} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => handleSelect(null, null)}
            title="Remove image"
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
          >
            <ImageOff className="w-3 h-3 text-gray-600" />
          </button>
          {attribution?.photographer && (
            <a
              href={attribution.photographerUrl}
              target="_blank" rel="noopener noreferrer"
              className="absolute bottom-1 left-1.5 text-[8px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded hover:bg-black/60 transition-colors"
            >
              {attribution.photographer} / Unsplash
            </a>
          )}
        </div>
      )}

      {/* None + position controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSelect(null, null)}
          className={clsx(
            'text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 transition-all shrink-0',
            !current
              ? 'border-[#111] bg-[#111] text-white'
              : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50'
          )}
          style={!current ? { boxShadow: '1.5px 1.5px 0 #f97316' } : {}}
        >
          None
        </button>
        {current && (
          <div className="flex gap-1 ml-auto">
            {['left', 'right'].map(pos => (
              <button
                key={pos}
                onClick={() => onUpdateConfig({ blockImagePosition: pos })}
                className={clsx(
                  'text-[10px] font-bold px-2 py-1 rounded-lg border-2 transition-colors',
                  position === pos
                    ? 'bg-[#f97316] text-white border-[#f97316]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                {pos === 'left' ? '← Left' : 'Right →'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map(({ id, label, Icon, free }) => {
          const locked = !free && !isPlanAtLeast(plan, 'pro');
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                'flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold border-b-2 transition-colors shrink-0',
                tab === id
                  ? 'border-[#f97316] text-[#111]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
              style={SG}
            >
              <Icon className="w-3 h-3" />
              {label}
              {locked && <Lock className="w-2.5 h-2.5 text-orange-400" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'curated' && (
          <CuratedTab current={current} onSelect={handleSelect} />
        )}
        {tab === 'search' && (
          <SearchTab current={current} onSelect={handleSelect} workspaceId={workspaceId} plan={plan} />
        )}
        {tab === 'upload' && (
          <UploadTab onSelect={handleSelect} workspaceId={workspaceId} plan={plan} />
        )}
        {tab === 'link' && (
          <LinkTab onSelect={handleSelect} />
        )}
      </div>
    </div>
  );
}
