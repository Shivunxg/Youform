import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, Zap } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try FormFlow at your own pace.',
    monthly: 0,
    yearly: 0,
    cta: 'Start for free',
    ctaLink: '/signup',
    accent: '#111111',
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Automation, branding, and team tools.',
    monthly: 25,
    yearly: 20,
    yearlySuffix: '$240 billed annually',
    cta: 'Get Pro',
    ctaLink: '/signup?plan=pro',
    accent: '#f97316',
    badge: 'Most popular',
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Scale, verify, and audit at team speed.',
    monthly: 89,
    yearly: 60,
    yearlySuffix: '$720 billed annually',
    cta: 'Get Business',
    ctaLink: '/signup?plan=business',
    accent: '#7c3aed',
    badge: null,
  },
];

// Usage limits shown in the cards
const CARD_LIMITS = {
  free:     ['500 responses / mo', '1 team member', '100 MB storage', '10 MB uploads'],
  pro:      ['5,000 responses / mo', '3 team members', '2 GB storage', 'Unlimited uploads'],
  business: ['25,000 responses / mo', '10 team members', '10 GB storage', 'Unlimited uploads'],
};

// Full comparison table
const COMPARISON = [
  {
    section: 'Usage',
    rows: [
      { label: 'Responses / month',  free: '500',       pro: '5,000',  business: '25,000'    },
      { label: 'Team members',       free: '1',         pro: '3',      business: '10'         },
      { label: 'Storage',            free: '100 MB',    pro: '2 GB',   business: '10 GB'      },
      { label: 'File upload size',   free: '10 MB',     pro: 'Unlimited', business: 'Unlimited' },
    ],
  },
  {
    section: 'Form building',
    rows: [
      { label: 'All question types',          free: true, pro: true, business: true  },
      { label: 'Conditional logic',           free: true, pro: true, business: true  },
      { label: 'Template library',            free: true, pro: true, business: true  },
      { label: 'Form password protection',    free: true, pro: true, business: true  },
      { label: 'Scheduling & response caps',  free: true, pro: true, business: true  },
    ],
  },
  {
    section: 'Analytics & data',
    rows: [
      { label: 'Completion analytics',           free: true,  pro: true, business: true },
      { label: 'Drop-off by question',           free: true,  pro: true, business: true },
      { label: 'CSV export',                     free: true,  pro: true, business: true },
      { label: 'Google Sheets integration',      free: true,  pro: true, business: true },
      { label: 'Partial submissions & drop-off', free: false, pro: true, business: true },
    ],
  },
  {
    section: 'Branding & customisation',
    rows: [
      { label: 'Remove FormFlow branding',       free: false, pro: true, business: true },
      { label: 'Custom domain',                  free: false, pro: true, business: true },
      { label: 'Custom thank-you page + redirect', free: false, pro: true, business: true },
      { label: 'Respondent email notifications', free: false, pro: true, business: true },
    ],
  },
  {
    section: 'Integrations & automation',
    rows: [
      { label: 'Slack, Webhook, Zapier',           free: false, pro: true, business: true },
      { label: 'HubSpot, Airtable, Mailchimp, Notion', free: false, pro: true, business: true },
      { label: 'AI form generator',               free: false, pro: true, business: true },
      { label: 'AI block rewriter',               free: false, pro: true, business: true },
      { label: 'Import from Typeform & Google Forms', free: false, pro: true, business: true },
    ],
  },
  {
    section: 'Identity verification',
    rows: [
      { label: 'Phone OTP verification', free: false, pro: false, business: true },
      { label: 'Email OTP verification', free: false, pro: false, business: true },
    ],
  },
  {
    section: 'Admin & compliance',
    rows: [
      { label: 'Workspace activity log', free: false, pro: false, business: true },
      { label: 'Audit trail',            free: false, pro: false, business: true },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [yearly, setYearly] = useState(true);

  return (
    <div style={{ backgroundColor: '#FFFBF2', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{ borderBottom: '2px solid #111', backgroundColor: '#FFFBF2' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: '#111', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#f97316', fontWeight: 900, fontSize: 16, fontFamily: 'Space Grotesk, system-ui' }}>F</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#111', fontFamily: 'Space Grotesk, system-ui' }}>FormFlow</span>
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: '#555', textDecoration: 'none' }}>Sign in</Link>
            <Link to="/signup" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: '#111', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', border: '2px solid #111', boxShadow: '2px 2px 0 #f97316' }}>
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', padding: '72px 0 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111', color: '#FFFBF2', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 20, fontFamily: 'Space Grotesk, system-ui' }}>
            <Zap style={{ width: 12, height: 12, color: '#f97316' }} />
            Simple, transparent pricing
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: '#111', lineHeight: 1.1, margin: '0 0 16px', fontFamily: 'Space Grotesk, system-ui', textWrap: 'balance' }}>
            One price. No hidden fees.<br />
            <span style={{ color: '#f97316' }}>Cancel anytime.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#666', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Start free and upgrade as your team grows. Every plan includes all question types, logic branching, and analytics.
          </p>

          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#fff', border: '2px solid #111', borderRadius: 999, padding: '6px 6px 6px 16px', boxShadow: '3px 3px 0 #111' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Billed</span>
            <button
              onClick={() => setYearly(false)}
              style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .15s', background: !yearly ? '#111' : 'transparent', color: !yearly ? '#fff' : '#888' }}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s', background: yearly ? '#111' : 'transparent', color: yearly ? '#fff' : '#888' }}
            >
              Yearly
              <span style={{ background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999, letterSpacing: '0.04em' }}>SAVE 33%</span>
            </button>
          </div>
        </div>

        {/* ── Plan cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 80 }}>
          {PLANS.map(plan => {
            const price = yearly ? plan.yearly : plan.monthly;
            const isHighlighted = plan.id === 'pro';
            return (
              <div
                key={plan.id}
                style={{
                  background: '#fff',
                  border: `2px solid ${isHighlighted ? plan.accent : '#111'}`,
                  borderRadius: 20,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isHighlighted ? `4px 4px 0 ${plan.accent}` : '4px 4px 0 #111',
                  position: 'relative',
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div style={{ position: 'absolute', top: 16, right: 16, background: plan.accent, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999, letterSpacing: '0.05em', fontFamily: 'Space Grotesk, system-ui' }}>
                    {plan.badge}
                  </div>
                )}

                {/* Header */}
                <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: plan.id === 'free' ? '#f5f5f5' : plan.accent, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16 }}>{plan.id === 'free' ? '✦' : plan.id === 'pro' ? '⚡' : '◆'}</span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 4px', fontFamily: 'Space Grotesk, system-ui' }}>{plan.name}</h2>
                  <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px', lineHeight: 1.5 }}>{plan.tagline}</p>

                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: '#111', fontFamily: 'Space Grotesk, system-ui' }}>
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && <span style={{ fontSize: 15, color: '#888', marginLeft: 4 }}>/mo</span>}
                  </div>
                  {yearly && plan.yearlySuffix && (
                    <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600, margin: '0 0 0' }}>{plan.yearlySuffix}</p>
                  )}
                  {!yearly && plan.id !== 'free' && (
                    <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>billed monthly</p>
                  )}
                </div>

                {/* Limits */}
                <div style={{ padding: '16px 28px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CARD_LIMITS[plan.id].map(l => (
                    <span key={l} style={{ fontSize: 11, fontWeight: 700, color: '#555', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, padding: '3px 10px' }}>
                      {l}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ padding: '20px 28px 24px' }}>
                  <Link
                    to={plan.ctaLink}
                    style={{
                      display: 'block', textAlign: 'center', padding: '13px 0',
                      borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none',
                      background: plan.id === 'free' ? 'transparent' : plan.accent,
                      color: plan.id === 'free' ? '#111' : '#fff',
                      border: `2px solid ${plan.id === 'free' ? '#111' : plan.accent}`,
                      boxShadow: plan.id === 'free' ? '2px 2px 0 #111' : `2px 2px 0 ${plan.id === 'pro' ? '#c2410c' : '#5b21b6'}`,
                      transition: 'opacity .15s',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                  >
                    {plan.cta} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Comparison table ── */}
        <div style={{ marginBottom: 96 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111', textAlign: 'center', marginBottom: 8, fontFamily: 'Space Grotesk, system-ui' }}>
            Compare all features
          </h2>
          <p style={{ fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 40 }}>
            Every plan gets access to the full form builder. Here's how the plans differ.
          </p>

          <div style={{ border: '2px solid #111', borderRadius: 16, overflow: 'hidden', boxShadow: '4px 4px 0 #111' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', background: '#111', color: '#fff', fontFamily: 'Space Grotesk, system-ui' }}>
              <div style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#FFFBF2' }}>Feature</div>
              {PLANS.map(p => (
                <div key={p.id} style={{ padding: '16px 0', textAlign: 'center', fontSize: 14, fontWeight: 800, color: p.id === 'free' ? '#aaa' : p.id === 'pro' ? '#fb923c' : '#a78bfa' }}>
                  {p.name}
                </div>
              ))}
            </div>

            {/* Sections */}
            {COMPARISON.map((section, si) => (
              <div key={section.section}>
                {/* Section header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', background: '#FFFBF2', borderTop: si === 0 ? 'none' : '2px solid #111' }}>
                  <div style={{ padding: '10px 24px', fontSize: 11, fontWeight: 800, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Space Grotesk, system-ui' }}>
                    {section.section}
                  </div>
                  <div /><div /><div />
                </div>

                {/* Rows */}
                {section.rows.map((row, ri) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px',
                      background: ri % 2 === 0 ? '#fff' : '#fafafa',
                      borderTop: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ padding: '13px 24px', fontSize: 14, color: '#333', fontWeight: 500 }}>{row.label}</div>
                    {['free', 'pro', 'business'].map(plan => (
                      <div key={plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px 8px' }}>
                        <Cell value={row[plan]} plan={plan} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ textAlign: 'center', padding: '0 0 96px' }}>
          <div style={{ display: 'inline-block', background: '#111', borderRadius: 24, padding: '56px 80px', boxShadow: '6px 6px 0 #f97316' }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: '#FFFBF2', margin: '0 0 12px', fontFamily: 'Space Grotesk, system-ui' }}>
              Start building for free
            </h2>
            <p style={{ fontSize: 16, color: '#aaa', margin: '0 0 32px', lineHeight: 1.6 }}>
              No credit card required. Upgrade whenever you're ready.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link
                to="/signup"
                style={{ background: '#f97316', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: 'none', border: '2px solid #f97316', boxShadow: '3px 3px 0 #c2410c' }}
              >
                Create free account →
              </Link>
              <Link
                to="/login"
                style={{ background: 'transparent', color: '#FFFBF2', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', border: '2px solid #555' }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '2px solid #111', background: '#111', padding: '24px' }}>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#555', margin: 0 }}>
          © {new Date().getFullYear()} FormFlow · <Link to="/login" style={{ color: '#888', textDecoration: 'none' }}>Sign in</Link> · <Link to="/signup" style={{ color: '#888', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Cell({ value, plan }) {
  if (value === true)  return <Check style={{ width: 17, height: 17, color: '#10b981', strokeWidth: 2.5 }} />;
  if (value === false) return <Minus style={{ width: 15, height: 15, color: '#d1d5db' }} />;
  // String value
  const color = plan === 'free' ? '#888' : plan === 'pro' ? '#ea580c' : '#7c3aed';
  return <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>;
}
