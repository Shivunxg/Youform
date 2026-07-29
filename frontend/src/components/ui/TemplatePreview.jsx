const BRAND = '#f97316';
const SKIP = new Set(['welcome_screen', 'thank_you_screen']);

function FieldUI({ q, accent }) {
  const border = `1.5px solid ${accent}28`;

  switch (q.type) {
    case 'multiple_choice': {
      const opts = (q.config?.choices ?? []).slice(0, 3);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 7 }}>
          {opts.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 4, border,
              background: i === 0 ? accent : 'transparent',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${i === 0 ? '#fff' : accent}70`,
                background: i === 0 ? '#fff' : 'transparent',
              }} />
              <span style={{
                fontSize: 7.5, color: i === 0 ? '#fff' : accent,
                opacity: i === 0 ? 1 : 0.65,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      );
    }

    case 'rating':
      return (
        <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} style={{ fontSize: 14, lineHeight: 1, color: i <= 4 ? BRAND : `${accent}22` }}>★</span>
          ))}
        </div>
      );

    case 'nps':
      return (
        <div style={{ display: 'flex', gap: 1.5, marginTop: 8 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <div key={n} style={{
              flex: 1, textAlign: 'center', padding: '2px 0',
              background: n <= 6 ? '#FCA5A5' : n <= 8 ? '#FDE68A' : '#86EFAC',
              borderRadius: 2, fontSize: 6, fontWeight: 600, color: '#555',
            }}>{n}</div>
          ))}
        </div>
      );

    case 'yes_no':
      return (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {['Yes', 'No'].map((label, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '3px 0',
              borderRadius: 4, border,
              background: i === 0 ? accent : 'transparent',
            }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: i === 0 ? '#fff' : `${accent}70` }}>{label}</span>
            </div>
          ))}
        </div>
      );

    case 'long_text':
      return (
        <div style={{
          marginTop: 7, height: 30,
          border, borderRadius: 4,
          background: `${accent}06`,
        }} />
      );

    case 'file_upload':
      return (
        <div style={{
          marginTop: 7, height: 28,
          border: `1.5px dashed ${accent}35`,
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 7.5, color: `${accent}55` }}>↑ Upload file</span>
        </div>
      );

    case 'number':
      return (
        <div style={{ borderBottom: `2px solid ${accent}30`, paddingBottom: 3, marginTop: 9 }}>
          <div style={{ width: '25%', height: 8, background: `${accent}18`, borderRadius: 2 }} />
        </div>
      );

    default: // short_text, email, url, phone, date, etc.
      return (
        <div style={{ borderBottom: `2px solid ${accent}30`, paddingBottom: 3, marginTop: 9 }}>
          <div style={{ width: '55%', height: 8, background: `${accent}18`, borderRadius: 2 }} />
        </div>
      );
  }
}

export default function TemplatePreview({ questions = [], color, textColor }) {
  const fields = questions.filter(q => !SKIP.has(q.type));
  const total  = fields.length;
  const q      = fields[0];

  if (!q) return <div style={{ background: color, width: '100%', height: '100%' }} />;

  return (
    <div style={{
      background: color,
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '10px 12px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Peek shadow card beneath */}
      <div style={{
        position: 'absolute', bottom: 2, left: 20, right: 20, height: 7,
        background: '#fff', borderRadius: '0 0 7px 7px',
        opacity: 0.35, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }} />

      {/* Main form card */}
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: '11px 13px 13px',
        width: '100%',
        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Progress bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2.5,
          background: `${textColor}15`, borderRadius: '8px 8px 0 0',
        }}>
          <div style={{
            width: `${Math.round((1 / Math.max(total, 1)) * 100)}%`,
            height: '100%', background: textColor, borderRadius: '8px 0 0 0',
          }} />
        </div>

        {/* Counter */}
        <div style={{
          fontSize: 7, fontWeight: 700, color: `${textColor}65`,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginTop: 6, marginBottom: 5,
        }}>
          1 / {total}
        </div>

        {/* Question title */}
        <div style={{
          fontSize: 10.5, fontWeight: 700,
          color: textColor, lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {q.title}
        </div>

        <FieldUI q={q} accent={textColor} />
      </div>
    </div>
  );
}
