/* eslint-disable react/prop-types */
// SVG theme illustrations for template cards.
// Each component fills 100% of its container via viewBox + preserveAspectRatio.

const S = '#111111'; // stroke
const O = '#f97316'; // orange accent

// ── Individual themes ────────────────────────────────────────────────

function Testimonial({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Speech bubble */}
      <rect x="48" y="16" width="208" height="90" rx="16" fill="white" stroke={S} strokeWidth="2.5" />
      {/* Bubble tail */}
      <path d="M108 106 L90 130 L136 106Z" fill="white" stroke={S} strokeWidth="2" strokeLinejoin="round" />
      {/* Large open-quote decoration */}
      <text x="68" y="98" fontSize="76" fontFamily="Georgia, serif" fill={textColor} opacity="0.12" fontWeight="900">"</text>
      {/* Stars */}
      <text x="162" y="74" textAnchor="middle" fontSize="22" fill={O} letterSpacing="4">★★★★★</text>
      {/* Text-line stubs */}
      <rect x="76" y="86" width="136" height="7" rx="3.5" fill={S} opacity="0.08" />
      <rect x="76" y="98" width="100" height="7" rx="3.5" fill={S} opacity="0.08" />
    </svg>
  );
}

function ClientIntake({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Clipboard body */}
      <rect x="90" y="22" width="140" height="118" rx="8" fill="white" stroke={S} strokeWidth="2.5" />
      {/* Clip */}
      <rect x="130" y="14" width="60" height="22" rx="7" fill="white" stroke={S} strokeWidth="2.5" />
      <rect x="144" y="10" width="32" height="14" rx="5" fill={textColor} />
      {/* Four field rows */}
      {[52, 72, 92, 112].map((y, i) => (
        <g key={y}>
          <rect x="108" y={y - 10} width={i === 3 ? 48 : 60} height="6" rx="3" fill={textColor} opacity="0.2" />
          <rect x="108" y={y + 0} width="104" height="11" rx="4" fill="white" stroke={S} strokeWidth="1.5" />
          {i < 2 && (
            <path
              d={`M112 ${y + 5.5} L116 ${y + 9} L124 ${y + 1}`}
              fill="none" stroke={O} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

function LeadCapture({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Funnel */}
      <path d="M82 20 L238 20 L196 68 L196 124 L124 124 L124 68 Z" fill="white" stroke={S} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Funnel shading lines */}
      {[102, 132, 162, 192].map((x, i) => (
        <line key={x} x1={x} y1="20" x2={x - 20 + i * 2} y2="62" stroke={textColor} strokeWidth="1.5" strokeOpacity="0.15" />
      ))}
      {/* Dots going in */}
      {[110, 150, 190, 130, 170].map((x, i) => (
        <circle key={x + i} cx={x} cy={i < 3 ? 10 : 7} r={i < 3 ? 5 : 3} fill={textColor} opacity={i < 3 ? 0.5 : 0.3} />
      ))}
      {/* Output arrow + dot */}
      <circle cx="160" cy="138" r="8" fill={O} stroke={S} strokeWidth="2" />
      <line x1="160" y1="124" x2="160" y2="132" stroke={O} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Contact({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Envelope body */}
      <rect x="52" y="26" width="216" height="106" rx="12" fill="white" stroke={S} strokeWidth="2.5" />
      {/* Envelope open flap (V) */}
      <path d="M52 36 L160 94 L268 36" fill="none" stroke={S} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Bottom fold lines */}
      <line x1="52" y1="132" x2="116" y2="100" stroke={S} strokeWidth="1.5" strokeOpacity="0.18" />
      <line x1="268" y1="132" x2="204" y2="100" stroke={S} strokeWidth="1.5" strokeOpacity="0.18" />
      {/* @ symbol */}
      <text x="162" y="128" textAnchor="middle" fontSize="34" fill={textColor} opacity="0.22" fontFamily="monospace" fontWeight="900">@</text>
      {/* Stamp */}
      <rect x="226" y="36" width="34" height="26" rx="4" fill={color} stroke={S} strokeWidth="1.5" />
      <rect x="230" y="40" width="26" height="18" rx="2" fill={textColor} opacity="0.2" />
    </svg>
  );
}

function JobApplication({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Shadow paper */}
      <rect x="100" y="18" width="128" height="124" rx="7" fill={textColor} opacity="0.12" />
      {/* Main resume */}
      <rect x="92" y="12" width="128" height="124" rx="7" fill="white" stroke={S} strokeWidth="2.5" />
      {/* Dog-ear */}
      <path d="M188 12 L220 12 L220 36Z" fill={color} stroke={S} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Header section */}
      <rect x="106" y="24" width="82" height="28" rx="5" fill={color} stroke={S} strokeWidth="1.5" />
      {/* Avatar circle */}
      <circle cx="120" cy="38" r="11" fill="white" stroke={S} strokeWidth="1.5" />
      {/* Name + role stubs */}
      <rect x="136" y="28" width="44" height="6" rx="3" fill={textColor} opacity="0.45" />
      <rect x="136" y="38" width="30" height="5" rx="2.5" fill={textColor} opacity="0.25" />
      {/* Content lines */}
      {[68, 82, 96, 110, 124].map((y, i) => (
        <rect key={y} x="106" y={y} width={i % 2 === 0 ? 100 : 76} height="6" rx="3" fill={S} opacity="0.1" />
      ))}
      {/* Section label */}
      <rect x="106" y="60" width="38" height="5" rx="2.5" fill={textColor} opacity="0.35" />
      {/* HIRED stamp */}
      <circle cx="240" cy="80" r="32" fill={color} stroke={textColor} strokeWidth="2.5" strokeDasharray="5 3" opacity="0.9" />
      <text x="240" y="77" textAnchor="middle" fontSize="10" fill={textColor} fontWeight="900">APPLIED</text>
      <text x="240" y="92" textAnchor="middle" fontSize="20" fill={O} fontWeight="900">✓</text>
    </svg>
  );
}

function OrderForm({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Cart body */}
      <path d="M56 30 L76 30 L96 104 L236 104 L256 58 L86 58" fill="white" stroke={S} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Handle nub */}
      <circle cx="44" cy="30" r="8" fill={textColor} stroke={S} strokeWidth="2" opacity="0.7" />
      <line x1="52" y1="30" x2="56" y2="30" stroke={S} strokeWidth="2.5" strokeLinecap="round" />
      {/* Wheels */}
      <circle cx="120" cy="118" r="11" fill="white" stroke={S} strokeWidth="2.5" />
      <circle cx="208" cy="118" r="11" fill="white" stroke={S} strokeWidth="2.5" />
      <circle cx="120" cy="118" r="4" fill={textColor} />
      <circle cx="208" cy="118" r="4" fill={textColor} />
      {/* Items in cart */}
      <rect x="112" y="63" width="28" height="28" rx="5" fill={color} stroke={S} strokeWidth="1.5" />
      <rect x="148" y="63" width="28" height="28" rx="5" fill={color} stroke={S} strokeWidth="1.5" />
      <rect x="184" y="63" width="28" height="28" rx="5" fill={color} stroke={S} strokeWidth="1.5" />
      {/* Price badge */}
      <rect x="246" y="18" width="60" height="30" rx="10" fill={O} stroke={S} strokeWidth="2" />
      <text x="276" y="37" textAnchor="middle" fontSize="13" fill="white" fontWeight="900" fontFamily="monospace">$79</text>
    </svg>
  );
}

function MarketResearch({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Bars — increasing height */}
      {[
        { x: 44, h: 42 },
        { x: 88, h: 62 },
        { x: 132, h: 80 },
        { x: 176, h: 106 },
      ].map(({ x, h }, i) => (
        <rect key={x} x={x} y={128 - h} width="34" height={h} rx="4"
          fill={i === 3 ? textColor : 'white'} stroke={S} strokeWidth="2"
          opacity={i === 3 ? 0.85 : 1}
        />
      ))}
      {/* Baseline */}
      <line x1="34" y1="128" x2="224" y2="128" stroke={S} strokeWidth="2" />
      {/* Magnifying glass */}
      <circle cx="252" cy="56" r="30" fill="white" stroke={S} strokeWidth="3" />
      <circle cx="252" cy="56" r="18" fill={color} stroke={S} strokeWidth="2" />
      <line x1="274" y1="78" x2="292" y2="96" stroke={S} strokeWidth="5" strokeLinecap="round" />
      {/* Trend arrow inside glass */}
      <polyline points="240,62 248,52 256,57 264,42" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="264" cy="42" r="4" fill={O} />
    </svg>
  );
}

function SaasOnboarding({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Dashed trajectory arc */}
      <path d="M50 138 Q110 16 270 26" fill="none" stroke={textColor} strokeWidth="2" strokeDasharray="6 4" strokeOpacity="0.3" />
      {/* Rocket body */}
      <ellipse cx="208" cy="72" rx="20" ry="38" fill="white" stroke={S} strokeWidth="2.5" transform="rotate(-35 208 72)" />
      {/* Nose */}
      <path d="M222 38 L248 20 L232 50Z" fill={textColor} stroke={S} strokeWidth="2" strokeLinejoin="round" />
      {/* Window */}
      <circle cx="200" cy="74" r="9" fill={color} stroke={S} strokeWidth="2" />
      {/* Fins */}
      <path d="M182 100 L168 118 L188 108Z" fill={textColor} stroke={S} strokeWidth="1.5" strokeLinejoin="round" opacity="0.65" />
      <path d="M212 88 L228 106 L216 100Z" fill={textColor} stroke={S} strokeWidth="1.5" strokeLinejoin="round" opacity="0.65" />
      {/* Flame */}
      <ellipse cx="185" cy="116" rx="9" ry="14" fill={O} stroke={S} strokeWidth="2" transform="rotate(35 185 116)" />
      <ellipse cx="187" cy="117" rx="4" ry="8" fill="#FEF9C3" transform="rotate(35 187 117)" />
      {/* Stars */}
      <text x="68" y="48" fontSize="16" fill={textColor} opacity="0.4">★</text>
      <text x="108" y="24" fontSize="11" fill={textColor} opacity="0.35">★</text>
      <text x="288" y="68" fontSize="13" fill={textColor} opacity="0.4">★</text>
      <text x="82" y="90" fontSize="9" fill={textColor} opacity="0.25">★</text>
    </svg>
  );
}

function Cancellation({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Door frame */}
      <rect x="96" y="18" width="128" height="126" rx="6" fill="white" stroke={S} strokeWidth="2.5" />
      {/* Open door panel */}
      <path d="M96 20 L96 140 L200 132 L200 28 Z" fill={color} stroke={S} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Doorknob */}
      <circle cx="188" cy="82" r="8" fill="white" stroke={S} strokeWidth="2" />
      <circle cx="188" cy="82" r="3.5" fill={textColor} opacity="0.5" />
      {/* Stick person walking out */}
      <circle cx="254" cy="60" r="12" fill={textColor} stroke={S} strokeWidth="2" opacity="0.8" />
      <line x1="254" y1="72" x2="254" y2="102" stroke={textColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      <line x1="254" y1="86" x2="242" y2="98" stroke={textColor} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <line x1="254" y1="86" x2="266" y2="98" stroke={textColor} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <line x1="254" y1="102" x2="244" y2="120" stroke={textColor} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <line x1="254" y1="102" x2="264" y2="120" stroke={textColor} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      {/* Exit arrow */}
      <polyline points="216,82 240,82 232,74" fill="none" stroke={O} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="232,90 240,82" fill="none" stroke={O} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NPS({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* 0–10 scale boxes */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n, i) => {
        const boxColor = n <= 6 ? '#FCA5A5' : n <= 8 ? '#FDE68A' : '#86EFAC';
        return (
          <g key={n} transform={`translate(${14 + i * 27}, 36)`}>
            <rect width="23" height="23" rx="5"
              fill={boxColor} stroke={S} strokeWidth={n >= 9 ? 2.5 : 1.5}
            />
            <text x="11.5" y="16" fontSize="10" textAnchor="middle" fill={S}
              fontWeight={n >= 9 ? '700' : '400'}
            >{n}</text>
          </g>
        );
      })}
      {/* Labels */}
      <text x="14" y="78" fontSize="8" fill={textColor} opacity="0.65">Not likely</text>
      <text x="306" y="78" fontSize="8" textAnchor="end" fill={textColor} opacity="0.65">Extremely likely</text>
      {/* Smiley row */}
      <text x="66" y="118" fontSize="28" textAnchor="middle" opacity="0.45">😞</text>
      <text x="160" y="118" fontSize="28" textAnchor="middle" opacity="0.5">😐</text>
      <text x="254" y="118" fontSize="28" textAnchor="middle">😊</text>
    </svg>
  );
}

function EmployeeSatisfaction({ color, textColor }) {
  const people = [76, 148, 220];
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {people.map((cx, i) => (
        <g key={cx}>
          {/* Head */}
          <circle cx={cx} cy="42" r="18" fill="white" stroke={S} strokeWidth="2.5" />
          {/* Body */}
          <path d={`M${cx - 20} 66 Q${cx - 20} 56 ${cx} 56 Q${cx + 20} 56 ${cx + 20} 66 L${cx + 20} 96 Q${cx + 20} 104 ${cx} 104 Q${cx - 20} 104 ${cx - 20} 96 Z`}
            fill="white" stroke={S} strokeWidth="2.5" />
          {/* Smile (happy for last two) */}
          <path
            d={i === 0 ? `M${cx - 8} 44 Q${cx} 52 ${cx + 8} 44` : `M${cx - 8} 44 Q${cx} 54 ${cx + 8} 44`}
            fill="none" stroke={i === 0 ? S : O} strokeWidth="2" strokeLinecap="round"
          />
          {/* Stars */}
          <text x={cx} y="122" textAnchor="middle" fontSize={i === 0 ? 11 : 13} fill={O} letterSpacing="1">
            {'★'.repeat(3 + Math.min(i + 1, 2))}{'☆'.repeat(2 - Math.min(i + 1, 2))}
          </text>
        </g>
      ))}
      {/* Pulse line at bottom */}
      <path d="M30 138 L70 138 L84 128 L96 146 L110 122 L124 138 L290 138"
        fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}

function PostEvent({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Stage screen */}
      <rect x="54" y="12" width="212" height="82" rx="8" fill="white" stroke={S} strokeWidth="2.5" />
      {/* Chart inside screen */}
      {[
        { x: 76, h: 42 }, { x: 104, h: 56 }, { x: 132, h: 34 }, { x: 160, h: 64 }, { x: 188, h: 48 }, { x: 216, h: 60 },
      ].map(({ x, h }, i) => (
        <rect key={x} x={x} y={82 - h} width="22" height={h} rx="3"
          fill={i === 3 ? textColor : color} stroke={S} strokeWidth="1.5" opacity={i === 3 ? 0.8 : 1}
        />
      ))}
      <line x1="66" y1="82" x2="254" y2="82" stroke={S} strokeWidth="1.5" />
      {/* Stage stand */}
      <path d="M126 94 L160 94 L170 108 L116 108 Z" fill={textColor} stroke={S} strokeWidth="2" strokeLinejoin="round" opacity="0.65" />
      {/* Spotlight */}
      <path d="M160 0 L140 12 L180 12 Z" fill="white" stroke={S} strokeWidth="1.5" strokeLinejoin="round" opacity="0.6" />
      <circle cx="160" cy="4" r="5" fill="white" stroke={S} strokeWidth="1.5" />
      {/* Audience — row 1 */}
      {[52, 84, 116, 148, 180, 212, 244, 276].map((x, i) => (
        <circle key={x} cx={x} cy="130" r="8" fill={textColor} stroke={S} strokeWidth="1.5" opacity={0.35 + i * 0.06} />
      ))}
      {/* Audience — row 2 */}
      {[68, 106, 144, 182, 220, 258].map((x, i) => (
        <circle key={x} cx={x} cy="114" r="7" fill={textColor} stroke={S} strokeWidth="1.5" opacity={0.28 + i * 0.07} />
      ))}
    </svg>
  );
}

function DigitalMarketing({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Phone */}
      <rect x="104" y="8" width="80" height="130" rx="14" fill="white" stroke={S} strokeWidth="2.5" />
      <rect x="112" y="22" width="64" height="98" rx="5" fill={color} />
      <rect x="130" y="12" width="28" height="7" rx="3.5" fill={S} opacity="0.25" />
      <circle cx="144" cy="128" r="5" fill={S} opacity="0.25" />
      {/* Graph on screen */}
      <polyline points="120,108 130,92 140,98 154,74 166,82 174,60"
        fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="174" cy="60" r="5" fill={O} stroke={S} strokeWidth="1.5" />
      {/* Metric badges — right */}
      <rect x="198" y="26" width="78" height="26" rx="8" fill="white" stroke={S} strokeWidth="2" />
      <text x="208" y="43" fontSize="11" fill="#15803D" fontWeight="700">↑ 24% CTR</text>
      <rect x="198" y="62" width="78" height="26" rx="8" fill="white" stroke={S} strokeWidth="2" />
      <text x="208" y="79" fontSize="11" fill={textColor} fontWeight="700">ROAS 4.2×</text>
      <rect x="198" y="98" width="78" height="26" rx="8" fill="white" stroke={S} strokeWidth="2" />
      <text x="208" y="115" fontSize="11" fill={textColor} fontWeight="700">CPA $12.50</text>
      {/* Ad frame — left */}
      <rect x="24" y="36" width="66" height="80" rx="7" fill="white" stroke={S} strokeWidth="2" strokeDasharray="5 3" />
      <rect x="34" y="46" width="46" height="36" rx="4" fill={color} />
      <text x="57" y="68" textAnchor="middle" fontSize="20">📱</text>
      <rect x="34" y="88" width="46" height="5" rx="2.5" fill={S} opacity="0.15" />
      <rect x="34" y="97" width="46" height="12" rx="4" fill={O} opacity="0.85" />
    </svg>
  );
}

function PersonalityQuiz({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Brain — left hemisphere */}
      <path d="M158 28 Q116 10 98 42 Q80 76 100 104 Q118 124 158 120Z"
        fill="white" stroke={S} strokeWidth="2.5" />
      {/* Brain — right hemisphere */}
      <path d="M162 28 Q204 10 222 42 Q240 76 220 104 Q202 124 162 120Z"
        fill="white" stroke={S} strokeWidth="2.5" />
      {/* Center divide */}
      <line x1="160" y1="28" x2="160" y2="120" stroke={S} strokeWidth="1.5" strokeDasharray="5 4" />
      {/* Left color sections */}
      <path d="M158 28 Q120 16 102 44 L130 58 Z" fill="#DBEAFE" stroke={S} strokeWidth="1" opacity="0.9" />
      <path d="M102 44 L100 104 L130 96 L130 58 Z" fill="#BBF7D0" stroke={S} strokeWidth="1" opacity="0.9" />
      <path d="M100 104 Q118 124 158 120 L130 96 Z" fill="#FDE68A" stroke={S} strokeWidth="1" opacity="0.9" />
      {/* Right color sections */}
      <path d="M162 28 Q200 16 218 44 L190 58 Z" fill="#FAE8FF" stroke={S} strokeWidth="1" opacity="0.9" />
      <path d="M218 44 L220 104 L190 96 L190 58 Z" fill="#FCA5A5" stroke={S} strokeWidth="1" opacity="0.9" />
      <path d="M220 104 Q202 124 162 120 L190 96 Z" fill="#FFEDD5" stroke={S} strokeWidth="1" opacity="0.9" />
      {/* Result badge */}
      <rect x="224" y="44" width="84" height="52" rx="12" fill={O} stroke={S} strokeWidth="2.5" />
      <text x="266" y="65" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" letterSpacing="1">YOUR TYPE</text>
      <text x="266" y="84" textAnchor="middle" fontSize="17" fill="white" fontWeight="900">CREATOR</text>
    </svg>
  );
}

function LeadGenQuiz({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Glow circle */}
      <circle cx="160" cy="60" r="48" fill="#FEF9C3" opacity="0.5" />
      {/* Bulb glass */}
      <circle cx="160" cy="58" r="38" fill="white" stroke={S} strokeWidth="2.5" />
      {/* Base */}
      <rect x="142" y="92" width="36" height="10" rx="4" fill="white" stroke={S} strokeWidth="2" />
      <rect x="146" y="102" width="28" height="8" rx="3" fill="white" stroke={S} strokeWidth="2" />
      <rect x="150" y="110" width="20" height="6" rx="3" fill={S} opacity="0.25" />
      {/* Filament */}
      <path d="M146 58 Q152 46 160 58 Q168 70 174 58"
        fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
      {/* Light rays */}
      <line x1="160" y1="12" x2="160" y2="22" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="194" y1="22" x2="187" y2="30" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="200" y1="54" x2="190" y2="56" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="126" y1="22" x2="133" y2="30" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="120" y1="54" x2="130" y2="56" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
      {/* Floating ?s */}
      <text x="60" y="58" fontSize="32" fill={textColor} opacity="0.22" fontWeight="900">?</text>
      <text x="240" y="48" fontSize="26" fill={textColor} opacity="0.18" fontWeight="900">?</text>
      <text x="254" y="88" fontSize="18" fill={textColor} opacity="0.15" fontWeight="900">?</text>
      <text x="44" y="84" fontSize="18" fill={textColor} opacity="0.15" fontWeight="900">?</text>
      {/* Recommendation tag */}
      <rect x="88" y="126" width="144" height="18" rx="6" fill={textColor} opacity="0.85" />
      <text x="160" y="139" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">→ RECOMMENDED: PRO PLAN</text>
    </svg>
  );
}

function ProductRecommender({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Left card */}
      <rect x="24" y="22" width="74" height="108" rx="8" fill="white" stroke={S} strokeWidth="2" opacity="0.7" />
      <rect x="34" y="32" width="54" height="40" rx="5" fill={color} opacity="0.85" />
      <text x="61" y="58" textAnchor="middle" fontSize="9" fill={S} opacity="0.45">★★★★☆</text>
      <text x="61" y="104" textAnchor="middle" fontSize="10" fill={S} opacity="0.5" fontWeight="500">$29</text>
      {/* Middle card — highlighted */}
      <rect x="120" y="10" width="80" height="124" rx="9" fill="white" stroke={S} strokeWidth="2.5" />
      <rect x="116" y="6" width="88" height="132" rx="11" fill="none" stroke={O} strokeWidth="3" />
      <rect x="130" y="20" width="60" height="46" rx="5" fill={color} />
      <text x="160" y="50" textAnchor="middle" fontSize="22" fill={textColor} opacity="0.6">🎯</text>
      <text x="160" y="82" textAnchor="middle" fontSize="10" fill={O}>★★★★★</text>
      <text x="160" y="100" textAnchor="middle" fontSize="14" fill={S} fontWeight="700">$79</text>
      <rect x="128" y="112" width="64" height="16" rx="5" fill={O} stroke={S} strokeWidth="1.5" />
      <text x="160" y="123" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">BEST MATCH ✓</text>
      {/* Right card */}
      <rect x="222" y="22" width="74" height="108" rx="8" fill="white" stroke={S} strokeWidth="2" opacity="0.7" />
      <rect x="232" y="32" width="54" height="40" rx="5" fill={color} opacity="0.85" />
      <text x="259" y="58" textAnchor="middle" fontSize="9" fill={S} opacity="0.45">★★★☆☆</text>
      <text x="259" y="104" textAnchor="middle" fontSize="10" fill={S} opacity="0.5" fontWeight="500">$199</text>
      {/* Arrows pointing to middle */}
      <polyline points="100,72 116,72 108,64" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="220,72 204,72 212,64" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="108,80 116,72" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
      <polyline points="212,80 204,72" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Trivia({ color, textColor }) {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {/* Trophy base plates */}
      <rect x="130" y="112" width="60" height="14" rx="5" fill={textColor} stroke={S} strokeWidth="2" opacity="0.8" />
      <rect x="118" y="122" width="84" height="14" rx="5" fill={textColor} stroke={S} strokeWidth="2" opacity="0.6" />
      {/* Trophy stem */}
      <rect x="151" y="96" width="18" height="18" rx="3" fill={textColor} stroke={S} strokeWidth="2" opacity="0.7" />
      {/* Trophy cup */}
      <path d="M108 20 L108 82 Q108 100 160 100 Q212 100 212 82 L212 20 Z"
        fill="white" stroke={S} strokeWidth="2.5" />
      {/* Handles */}
      <path d="M108 36 Q84 36 84 58 Q84 80 108 76" fill="none" stroke={S} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M212 36 Q236 36 236 58 Q236 80 212 76" fill="none" stroke={S} strokeWidth="3.5" strokeLinecap="round" />
      {/* Star inside trophy */}
      <text x="160" y="76" textAnchor="middle" fontSize="40" fill={O}>★</text>
      {/* Score badge */}
      <rect x="224" y="14" width="74" height="44" rx="12" fill={O} stroke={S} strokeWidth="2.5" />
      <text x="261" y="31" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" letterSpacing="1">SCORE</text>
      <text x="261" y="50" textAnchor="middle" fontSize="22" fill="white" fontWeight="900">5/5</text>
      {/* Decorative ?s */}
      <text x="36" y="72" fontSize="42" fill={textColor} opacity="0.15" fontWeight="900">?</text>
      <text x="276" y="108" fontSize="28" fill={textColor} opacity="0.12" fontWeight="900">?</text>
      {/* Confetti */}
      <rect x="46" y="20" width="9" height="9" rx="2" fill="#FECACA" stroke={S} strokeWidth="1" transform="rotate(22 50 24)" />
      <rect x="262" y="26" width="9" height="9" rx="2" fill="#BBF7D0" stroke={S} strokeWidth="1" transform="rotate(-15 266 30)" />
      <rect x="244" y="118" width="7" height="7" rx="1.5" fill="#DBEAFE" stroke={S} strokeWidth="1" transform="rotate(32 247 121)" />
      <rect x="56" y="110" width="7" height="7" rx="1.5" fill="#EDE9FE" stroke={S} strokeWidth="1" transform="rotate(-22 59 113)" />
      <circle cx="278" cy="50" r="5" fill="#FDE68A" stroke={S} strokeWidth="1" />
      <circle cx="44" cy="98" r="5" fill={O} stroke={S} strokeWidth="1" />
    </svg>
  );
}

function SkillsAssessment({ color, textColor }) {
  const bars = [
    { label: 'JavaScript',    pct: 85 },
    { label: 'UI / UX Design',pct: 62 },
    { label: 'Data Analysis', pct: 44 },
    { label: 'Project Mgmt',  pct: 78 },
  ];
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill={color} />
      {bars.map(({ label, pct }, i) => {
        const y = 16 + i * 32;
        const barW = Math.round(pct * 1.76); // max 176px wide
        const fillColor = pct > 74 ? textColor : pct > 54 ? O : '#93C5FD';
        return (
          <g key={label}>
            <text x="20" y={y + 10} fontSize="9" fill={textColor} fontWeight="600">{label}</text>
            <rect x="20" y={y + 14} width="176" height="13" rx="6.5" fill="white" stroke={S} strokeWidth="1.5" />
            <rect x="20" y={y + 14} width={barW} height="13" rx="6.5" fill={fillColor} stroke={S} strokeWidth="1.5" />
            <text x={20 + barW - 5} y={y + 23} fontSize="7.5" fill="white" fontWeight="700" textAnchor="end">{pct}%</text>
          </g>
        );
      })}
      {/* Grade badge */}
      <circle cx="258" cy="76" r="44" fill="white" stroke={S} strokeWidth="2.5" />
      <circle cx="258" cy="76" r="34" fill={color} stroke={S} strokeWidth="1.5" />
      <text x="258" y="68" textAnchor="middle" fontSize="9" fill={textColor} fontWeight="700">OVERALL</text>
      <text x="258" y="94" textAnchor="middle" fontSize="30" fill={textColor} fontWeight="900">B+</text>
    </svg>
  );
}

function Blank() {
  return (
    <svg viewBox="0 0 320 144" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="144" fill="#F3F4F6" />
      {/* Dot grid */}
      {[48, 96, 144, 192, 240, 288].flatMap(x =>
        [24, 54, 84, 114].map(y => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#D1D5DB" />
        ))
      )}
      {/* Plus symbol */}
      <line x1="160" y1="52" x2="160" y2="92" stroke="#9CA3AF" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="140" y1="72" x2="180" y2="72" stroke="#9CA3AF" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Theme map ────────────────────────────────────────────────────────

const THEMES = {
  testimonial:            Testimonial,
  'client-intake':        ClientIntake,
  'lead-capture':         LeadCapture,
  contact:                Contact,
  'job-application':      JobApplication,
  'order-form':           OrderForm,
  'market-research':      MarketResearch,
  'saas-onboarding':      SaasOnboarding,
  cancellation:           Cancellation,
  nps:                    NPS,
  'employee-satisfaction':EmployeeSatisfaction,
  'post-event':           PostEvent,
  'digital-marketing-quiz':DigitalMarketing,
  'personality-quiz':     PersonalityQuiz,
  'lead-gen-quiz':        LeadGenQuiz,
  'product-recommender':  ProductRecommender,
  trivia:                 Trivia,
  'skills-assessment':    SkillsAssessment,
  blank:                  Blank,
};

export function getTemplateTheme(id) {
  return THEMES[id] ?? Blank;
}
