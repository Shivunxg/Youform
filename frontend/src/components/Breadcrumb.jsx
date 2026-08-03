import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function Breadcrumb({ items }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: item.href ? `https://www.formflowx.com${item.href}` : undefined,
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span aria-hidden="true" style={{ color: '#ccc' }}>›</span>}
            {item.href && i < items.length - 1 ? (
              <Link to={item.href} style={{ color: '#888', textDecoration: 'none', fontWeight: 600 }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: i === items.length - 1 ? '#333' : '#888', fontWeight: 600 }}>
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
