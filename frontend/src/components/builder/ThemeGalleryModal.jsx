import { useState } from 'react';
import { X } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

// Pre-built library themes
export const LIBRARY_THEMES = [
  { id: 'light',           name: 'Light',           bg: '#FFFFFF', questionColor: '#111111', answerColor: '#374151', buttonColor: '#3b82f6', buttonTextColor: '#FFFFFF', starColor: '#f97316', alignment: 'left' },
  { id: 'dark',            name: 'Dark',             bg: '#1e293b', questionColor: '#f1f5f9', answerColor: '#cbd5e1', buttonColor: '#f97316', buttonTextColor: '#FFFFFF', starColor: '#fbbf24', alignment: 'left' },
  { id: 'aqua-shadow',     name: 'Aqua Shadow',      bg: '#e8f4f8', questionColor: '#1e40af', answerColor: '#1e40af', buttonColor: '#7c3aed', buttonTextColor: '#FFFFFF', starColor: '#f97316', alignment: 'left' },
  { id: 'ocean-bliss',     name: 'Ocean Bliss',      bg: '#0f0f0f', questionColor: '#e2e8f0', answerColor: '#94a3b8', buttonColor: '#7c3aed', buttonTextColor: '#FFFFFF', starColor: '#a78bfa', alignment: 'left' },
  { id: 'skyline',         name: 'Skyline',          bg: '#fce7f3', questionColor: '#111111', answerColor: '#374151', buttonColor: '#111111', buttonTextColor: '#FFFFFF', starColor: '#f97316', alignment: 'left' },
  { id: 'golden-forest',   name: 'Golden Forest',    bg: '#fefce8', questionColor: '#14532d', answerColor: '#166534', buttonColor: '#15803d', buttonTextColor: '#FFFFFF', starColor: '#ca8a04', alignment: 'left' },
  { id: 'lavender-storm',  name: 'Lavender Storm',   bg: '#f5f3ff', questionColor: '#4c1d95', answerColor: '#5b21b6', buttonColor: '#f97316', buttonTextColor: '#FFFFFF', starColor: '#7c3aed', alignment: 'left' },
  { id: 'violet-night',    name: 'Violet Night',     bg: '#0d4d4d', questionColor: '#ffffff', answerColor: '#a7f3d0', buttonColor: '#fbbf24', buttonTextColor: '#111111', starColor: '#fbbf24', alignment: 'left' },
  { id: 'blush-dusk',      name: 'Blush Dusk',       bg: '#fce7f3', questionColor: '#111111', answerColor: '#374151', buttonColor: '#111111', buttonTextColor: '#FFFFFF', starColor: '#ec4899', alignment: 'left' },
  { id: 'teal-glow',       name: 'Teal Glow',        bg: '#f0fdfa', questionColor: '#134e4a', answerColor: '#0f766e', buttonColor: '#0d9488', buttonTextColor: '#FFFFFF', starColor: '#f97316', alignment: 'left' },
  { id: 'citrus-pop',      name: 'Citrus Pop',       bg: '#fffbeb', questionColor: '#92400e', answerColor: '#b45309', buttonColor: '#f97316', buttonTextColor: '#FFFFFF', starColor: '#f59e0b', alignment: 'left' },
  { id: 'tropical-sunset', name: 'Tropical Sunset',  bg: '#022c22', questionColor: '#ecfdf5', answerColor: '#a7f3d0', buttonColor: '#fbbf24', buttonTextColor: '#111111', starColor: '#fbbf24', alignment: 'left' },
  { id: 'slate-minimal',   name: 'Slate Minimal',    bg: '#f8fafc', questionColor: '#0f172a', answerColor: '#475569', buttonColor: '#0f172a', buttonTextColor: '#FFFFFF', starColor: '#f97316', alignment: 'left' },
  { id: 'rose-quartz',     name: 'Rose Quartz',      bg: '#fff1f2', questionColor: '#881337', answerColor: '#be123c', buttonColor: '#e11d48', buttonTextColor: '#FFFFFF', starColor: '#f43f5e', alignment: 'center' },
  { id: 'midnight-ink',    name: 'Midnight Ink',     bg: '#020617', questionColor: '#e2e8f0', answerColor: '#94a3b8', buttonColor: '#6366f1', buttonTextColor: '#FFFFFF', starColor: '#818cf8', alignment: 'left' },
  { id: 'spring-fresh',    name: 'Spring Fresh',     bg: '#f0fdf4', questionColor: '#14532d', answerColor: '#166534', buttonColor: '#22c55e', buttonTextColor: '#FFFFFF', starColor: '#16a34a', alignment: 'left' },
  // Enterprise-grade presets
  { id: 'corporate-navy',  name: 'Corporate Navy',  bg: '#0B1929', questionColor: '#F0F4F8', answerColor: '#94A3B8', buttonColor: '#2563EB', buttonTextColor: '#FFFFFF', starColor: '#F59E0B', fontFamily: 'Inter, system-ui, sans-serif', alignment: 'left' },
  { id: 'executive-sand',  name: 'Executive Sand',  bg: '#F5F0E8', questionColor: '#1A1410', answerColor: '#4B3F30', buttonColor: '#B07C45', buttonTextColor: '#FFFFFF', starColor: '#B07C45', fontFamily: 'Playfair Display, Georgia, serif', alignment: 'left' },
  { id: 'modern-graphite', name: 'Modern Graphite', bg: '#F4F5F7', questionColor: '#1B1D21', answerColor: '#4A4D55', buttonColor: '#1B1D21', buttonTextColor: '#FFFFFF', starColor: '#F97316', fontFamily: 'Inter, system-ui, sans-serif', alignment: 'left' },
  // Bold editorial presets — dark bg + vivid accent
  { id: 'forest-lime',     name: 'Forest Lime',     bg: '#193808', questionColor: '#AAEE14', answerColor: '#7CC214', buttonColor: '#C8F030', buttonTextColor: '#0D1F04', starColor: '#C8F030', fontFamily: 'Space Grotesk, system-ui, sans-serif', alignment: 'left' },
  { id: 'electric-cobalt', name: 'Electric Cobalt', bg: '#060B1A', questionColor: '#38BEFF', answerColor: '#1E8EC4', buttonColor: '#38BEFF', buttonTextColor: '#060B1A', starColor: '#FFB800', fontFamily: 'Space Grotesk, system-ui, sans-serif', alignment: 'left' },
  { id: 'raspberry-noir',  name: 'Raspberry Noir',  bg: '#120208', questionColor: '#FF4D82', answerColor: '#CC2255', buttonColor: '#FF4D82', buttonTextColor: '#FFFFFF', starColor: '#FF4D82', fontFamily: 'Inter, system-ui, sans-serif', alignment: 'left' },
  { id: 'amber-obsidian',  name: 'Amber Obsidian',  bg: '#0C0A04', questionColor: '#FFBB14', answerColor: '#CC8C00', buttonColor: '#FFBB14', buttonTextColor: '#0C0A04', starColor: '#FFBB14', fontFamily: 'Space Grotesk, system-ui, sans-serif', alignment: 'left' },
  { id: 'aurora-deep',     name: 'Aurora Deep',     bg: '#080C20', questionColor: '#A78BFA', answerColor: '#7C5FCC', buttonColor: '#A78BFA', buttonTextColor: '#080C20', starColor: '#34D399', fontFamily: 'Space Grotesk, system-ui, sans-serif', alignment: 'left' },
];

function ThemePreviewCard({ theme, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:-translate-y-0.5 ${isActive ? 'border-[#f97316]' : 'border-[#111]'}`}
      style={{ boxShadow: isActive ? '3px 3px 0 #f97316' : '3px 3px 0 #111' }}
    >
      {/* Mini preview */}
      <div className="h-24 p-3 flex flex-col gap-1.5 justify-center" style={{ backgroundColor: theme.bg }}>
        <p className="text-[10px] font-bold leading-tight" style={{ color: theme.questionColor }}>Question</p>
        <div
          className="text-[9px] px-2.5 py-1 rounded-md font-bold inline-block w-fit"
          style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor }}
        >
          Button
        </div>
      </div>
      {/* Label */}
      <div className="px-2.5 py-2 bg-white border-t-2 border-[#111]">
        <p className="text-xs font-bold text-[#111] truncate" style={SG}>{theme.name}</p>
      </div>
    </div>
  );
}

export default function ThemeGalleryModal({ onClose, myForms = [] }) {
  const [tab, setTab] = useState('library');
  const { form, updateTheme } = useBuilderStore();

  function applyTheme(theme) {
    const { id: _id, name: _name, ...colors } = theme;
    updateTheme(colors);
    onClose();
  }

  function applyFromForm(f) {
    if (f.theme) {
      updateTheme(f.theme);
      onClose();
    }
  }

  const currentThemeId = LIBRARY_THEMES.find(t =>
    t.buttonColor === form?.theme?.buttonColor && t.bg === form?.theme?.backgroundColor
  )?.id;

  return (
    <>
      <div className="fixed inset-0 bg-[#111]/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#FFFBF2] rounded-2xl border-2 border-[#111] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          style={{ boxShadow: '8px 8px 0 #111' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#111] bg-white shrink-0">
            <div>
              <h2 className="text-lg font-bold text-[#111]" style={SG}>Select a theme</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose from handpicked designs, or copy from one of your forms.</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-[#FFFBF2] transition-colors"
              style={{ boxShadow: '2px 2px 0 #111' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 py-3 border-b-2 border-[#111] bg-white shrink-0">
            {['library', 'my-forms'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
                  tab === t
                    ? 'bg-[#111] text-white border-[#111]'
                    : 'bg-white text-[#111] border-[#111] hover:-translate-y-px'
                }`}
                style={{ ...SG, boxShadow: tab === t ? '2px 2px 0 #f97316' : '2px 2px 0 #111' }}
              >
                {t === 'library' ? 'Library' : 'My Forms'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === 'library' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {LIBRARY_THEMES.map(theme => (
                  <ThemePreviewCard
                    key={theme.id}
                    theme={theme}
                    isActive={theme.id === currentThemeId}
                    onClick={() => applyTheme(theme)}
                  />
                ))}
              </div>
            ) : (
              <div>
                {myForms.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-gray-400 text-sm font-bold" style={SG}>No other forms yet</p>
                    <p className="text-gray-400 text-xs mt-1">Create more forms to copy their designs here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {myForms.filter(f => f.id !== form?.id && f.theme).map(f => (
                      <div
                        key={f.id}
                        onClick={() => applyFromForm(f)}
                        className="rounded-xl overflow-hidden border-2 border-[#111] cursor-pointer transition-all hover:-translate-y-0.5"
                        style={{ boxShadow: '3px 3px 0 #111' }}
                      >
                        <div
                          className="h-24 p-3 flex flex-col gap-1.5 justify-center"
                          style={{ backgroundColor: f.theme?.backgroundColor ?? '#FFFFFF' }}
                        >
                          <p className="text-[10px] font-bold" style={{ color: f.theme?.questionColor ?? '#111' }}>Question</p>
                          <div
                            className="text-[9px] px-2.5 py-1 rounded-md font-bold inline-block w-fit"
                            style={{ backgroundColor: f.theme?.buttonColor ?? '#6366f1', color: f.theme?.buttonTextColor ?? '#fff' }}
                          >
                            Button
                          </div>
                        </div>
                        <div className="px-2.5 py-2 bg-white border-t-2 border-[#111]">
                          <p className="text-xs font-bold text-[#111] truncate" style={SG}>{f.title || 'Untitled'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
