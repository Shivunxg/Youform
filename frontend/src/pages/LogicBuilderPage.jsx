import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, X, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import FormHeader from '@/components/builder/FormHeader';
import { nanoid } from 'nanoid';
import toast from 'react-hot-toast';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

// Block colors matching the builder sidebar
const BLOCK_COLORS = {
  welcome_screen:  '#fde68a',
  short_text:      '#dbeafe',
  long_text:       '#ddd6fe',
  multiple_choice: '#bbf7d0',
  rating:          '#fed7aa',
  yes_no:          '#fce7f3',
  email:           '#bfdbfe',
  phone:           '#c7d2fe',
  number:          '#d1fae5',
  nps:             '#fef9c3',
  date:            '#e0f2fe',
  file_upload:     '#fdf4ff',
  dropdown:        '#dcfce7',
  statement:       '#f1f5f9',
  thank_you_screen:'#f0fdf4',
};

const NODE_W = 180;
const NODE_H = 56;
const H_GAP  = 60;
const ROW_Y  = 0;

function truncate(str, n) {
  if (!str) return 'Untitled';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// Build node positions (horizontal chain)
function buildLayout(questions) {
  return questions.map((q, i) => ({
    ...q,
    x: i * (NODE_W + H_GAP),
    y: ROW_Y,
  }));
}

// ── Logic condition editor panel ───────────────────────────────────────────────
function ConditionEditor({ question, questions, onClose }) {
  const { updateQuestion } = useBuilderStore();
  const logic = question.logic ?? [];

  const addRule = () => {
    const rule = { id: nanoid(), condition: 'always', action: 'jump_to', targetId: '' };
    updateQuestion(question.id, { logic: [...logic, rule] });
  };

  const updateRule = (id, patch) => {
    updateQuestion(question.id, { logic: logic.map(r => r.id === id ? { ...r, ...patch } : r) });
  };

  const deleteRule = (id) => {
    updateQuestion(question.id, { logic: logic.filter(r => r.id !== id) });
  };

  const jumpTargets = questions.filter(q => q.id !== question.id);

  return (
    <div
      className="w-80 bg-white border-l-2 border-[#111] flex flex-col overflow-hidden shrink-0"
      style={{ boxShadow: '-4px 0 0 #111' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#111] bg-[#FFFBF2]">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={SG}>Logic Rules</p>
          <p className="text-sm font-bold text-[#111] truncate mt-0.5" style={SG}>
            {truncate(question.title, 28) || 'Untitled'}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Rules list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logic.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 font-medium" style={SG}>No logic rules yet</p>
            <p className="text-xs text-gray-400 mt-1">Add a rule to control the flow.</p>
          </div>
        ) : (
          logic.map((rule, i) => (
            <div
              key={rule.id}
              className="border-2 border-[#111] rounded-xl p-3 bg-[#FFFBF2]"
              style={{ boxShadow: '2px 2px 0 #111' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase" style={SG}>Rule {i + 1}</span>
                <button onClick={() => deleteRule(rule.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Condition type */}
              <select
                value={rule.condition}
                onChange={e => updateRule(rule.id, { condition: e.target.value })}
                className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-medium text-[#111] bg-white mb-2 outline-none"
                style={SG}
              >
                <option value="always">Always</option>
                <option value="answered">Is answered</option>
                <option value="equals">Equals</option>
                <option value="not_equals">Does not equal</option>
                <option value="contains">Contains</option>
              </select>

              {/* Value (for conditional types) */}
              {rule.condition !== 'always' && rule.condition !== 'answered' && (
                <input
                  type="text"
                  value={rule.value ?? ''}
                  onChange={e => updateRule(rule.id, { value: e.target.value })}
                  placeholder="Value…"
                  className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-medium text-[#111] bg-white mb-2 outline-none focus:border-[#f97316]"
                  style={SG}
                />
              )}

              {/* Action */}
              <div className="flex items-center gap-1.5 mb-1">
                <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-xs font-bold text-gray-500" style={SG}>Then</span>
              </div>
              <select
                value={rule.action}
                onChange={e => updateRule(rule.id, { action: e.target.value })}
                className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-medium text-[#111] bg-white mb-2 outline-none"
                style={SG}
              >
                <option value="jump_to">Jump to question</option>
                <option value="end_form">End the form</option>
              </select>

              {/* Target question */}
              {rule.action === 'jump_to' && (
                <select
                  value={rule.targetId ?? ''}
                  onChange={e => updateRule(rule.id, { targetId: e.target.value })}
                  className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-medium text-[#111] bg-white outline-none"
                  style={SG}
                >
                  <option value="">Select question…</option>
                  {jumpTargets.map(q => (
                    <option key={q.id} value={q.id}>{truncate(q.title, 40) || 'Untitled'}</option>
                  ))}
                </select>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add rule button */}
      <div className="p-4 border-t-2 border-[#111]">
        <button
          onClick={addRule}
          className="w-full py-2.5 border-2 border-[#111] rounded-xl text-sm font-bold text-[#111] bg-white hover:bg-[#FFFBF2] transition-all flex items-center justify-center gap-2"
          style={{ boxShadow: '3px 3px 0 #111', ...SG }}
        >
          <Plus className="w-4 h-4" /> Add rule
        </button>
      </div>
    </div>
  );
}

// ── Main Logic Builder ─────────────────────────────────────────────────────────
export default function LogicBuilderPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { form, questions, loadForm, save } = useBuilderStore();

  const [selectedId, setSelectedId] = useState(null);
  const [transform, setTransform] = useState({ x: 60, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadForm(formId).catch(() => toast.error('Could not load form'));
  }, [formId]);

  // Auto-fit on load
  useEffect(() => {
    if (!questions.length || !containerRef.current) return;
    const totalW = questions.length * (NODE_W + H_GAP) - H_GAP;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const scale = Math.min(1, (containerW - 80) / totalW);
    const x = (containerW - totalW * scale) / 2;
    const y = containerH / 2 - (NODE_H * scale) / 2;
    setTransform({ x, y, scale });
  }, [questions.length]);

  const nodes = buildLayout(questions);

  // Pan handlers
  const onMouseDown = (e) => {
    if (e.target.closest('[data-node]')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!isPanning || !panStart.current) return;
    setTransform(t => ({ ...t, x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }));
  }, [isPanning]);
  const onMouseUp = () => { setIsPanning(false); panStart.current = null; };

  // Wheel zoom
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform(t => {
      const newScale = Math.max(0.2, Math.min(2, t.scale * delta));
      const ratio = newScale / t.scale;
      return { scale: newScale, x: mx - (mx - t.x) * ratio, y: my - (my - t.y) * ratio };
    });
  };

  // Zoom controls
  const zoomIn  = () => setTransform(t => ({ ...t, scale: Math.min(2, t.scale * 1.2) }));
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale / 1.2) }));

  const fitView = useCallback(() => {
    if (!questions.length || !containerRef.current) return;
    const totalW = questions.length * (NODE_W + H_GAP) - H_GAP;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const scale = Math.min(1, (containerW - 80) / totalW);
    const x = (containerW - totalW * scale) / 2;
    const y = containerH / 2 - (NODE_H * scale) / 2;
    setTransform({ x, y, scale });
  }, [questions.length]);

  const handleSave = async () => {
    try { await save(); toast.success('Logic saved'); }
    catch { toast.error('Save failed'); }
  };

  const selectedQ = questions.find(q => q.id === selectedId);

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <FormHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-100 select-none"
          style={{ cursor: isPanning ? 'grabbing' : 'grab', backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          {/* SVG arrows */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
              {/* Default linear arrows */}
              {nodes.slice(0, -1).map((n, i) => {
                const next = nodes[i + 1];
                const x1 = n.x + NODE_W;
                const y1 = n.y + NODE_H / 2;
                const x2 = next.x;
                const y2 = next.y + NODE_H / 2;
                return (
                  <g key={`arrow-${n.id}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111" strokeWidth="2" strokeDasharray="6 3" />
                    <polygon
                      points={`${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}`}
                      fill="#111"
                    />
                  </g>
                );
              })}
              {/* Logic jump arrows */}
              {nodes.flatMap(n =>
                (n.logic ?? []).filter(r => r.action === 'jump_to' && r.targetId).map(rule => {
                  const target = nodes.find(t => t.id === rule.targetId);
                  if (!target) return null;
                  const x1 = n.x + NODE_W / 2;
                  const y1 = n.y + NODE_H;
                  const x2 = target.x + NODE_W / 2;
                  const y2 = target.y + NODE_H;
                  const cy = Math.max(y1, y2) + 40;
                  return (
                    <g key={`jump-${n.id}-${rule.id}`}>
                      <path
                        d={`M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`}
                        fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="5 3"
                      />
                      <polygon
                        points={`${x2},${y2 - 2} ${x2 - 5},${y2 + 8} ${x2 + 5},${y2 + 8}`}
                        fill="#f97316"
                      />
                    </g>
                  );
                })
              )}
            </g>
          </svg>

          {/* Question nodes */}
          <div
            style={{
              position: 'absolute',
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
            }}
          >
            {nodes.map((n, i) => {
              const hasLogic = (n.logic ?? []).length > 0;
              const isSelected = n.id === selectedId;
              const bgColor = BLOCK_COLORS[n.type] ?? '#f3f4f6';

              return (
                <div
                  key={n.id}
                  data-node="true"
                  onClick={() => setSelectedId(isSelected ? null : n.id)}
                  style={{
                    position: 'absolute',
                    left: n.x,
                    top: n.y,
                    width: NODE_W,
                    height: NODE_H,
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? '#f97316' : '#111'}`,
                    boxShadow: isSelected ? '3px 3px 0 #f97316' : '3px 3px 0 #111',
                    background: bgColor,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '8px 10px',
                    userSelect: 'none',
                    transition: 'box-shadow 0.1s, border-color 0.1s',
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 2 }}>
                    {i + 1}. {n.type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#111', fontFamily: 'Space Grotesk, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncate(n.title, 22) || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Untitled</span>}
                  </div>
                  {hasLogic && (
                    <div style={{ position: 'absolute', top: -6, right: -6, background: '#f97316', border: '2px solid #111', borderRadius: '50%', width: 14, height: 14, fontSize: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                      {(n.logic ?? []).length}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {questions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3">🔀</div>
                <p className="text-sm font-bold text-gray-500" style={SG}>No questions yet</p>
                <p className="text-xs text-gray-400 mt-1">Add questions in the builder first.</p>
                <button
                  onClick={() => navigate(`/forms/${formId}/builder`)}
                  className="mt-4 px-4 py-2 rounded-xl border-2 border-[#111] bg-white text-sm font-bold text-[#111] hover:bg-gray-50"
                  style={{ boxShadow: '2px 2px 0 #111', ...SG }}
                >
                  ← Go to Builder
                </button>
              </div>
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
            <button onClick={zoomIn}  className="w-8 h-8 bg-white rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ boxShadow: '2px 2px 0 #111' }}>
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={zoomOut} className="w-8 h-8 bg-white rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ boxShadow: '2px 2px 0 #111' }}>
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={fitView} className="w-8 h-8 bg-white rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ boxShadow: '2px 2px 0 #111' }} title="Fit view">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setTransform({ x: 60, y: 0, scale: 1 })} className="w-8 h-8 bg-white rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ boxShadow: '2px 2px 0 #111' }} title="Reset">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Input mode pills */}
          <div className="absolute top-4 left-4 flex gap-1.5 z-10">
            <span className="px-3 py-1 bg-white border-2 border-[#111] rounded-lg text-xs font-bold text-[#111]" style={{ boxShadow: '2px 2px 0 #111', ...SG }}>Mouse</span>
            <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-400">Trackpad</span>
          </div>

          {/* Save button */}
          {questions.some(q => (q.logic ?? []).length > 0) && (
            <div className="absolute bottom-4 right-4 z-10">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#111] text-white font-bold text-sm rounded-xl border-2 border-[#111] hover:bg-gray-800 transition-all"
                style={{ boxShadow: '3px 3px 0 #f97316', ...SG }}
              >
                Save logic
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-gray-500 z-10" style={SG}>
            <span className="flex items-center gap-1">
              <span className="w-6 border-t-2 border-dashed border-[#111]" />
              Default flow
            </span>
            <span className="flex items-center gap-1">
              <span className="w-6 border-t-2 border-dashed border-[#f97316]" />
              Logic jump
            </span>
          </div>
        </div>

        {/* Condition editor sidebar */}
        {selectedQ && (
          <ConditionEditor
            question={selectedQ}
            questions={questions}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
