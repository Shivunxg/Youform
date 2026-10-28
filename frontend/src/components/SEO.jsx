import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'FormFlowX';
const DEFAULT_IMAGE = 'https://www.formflowx.com/og-image.png';
const BASE_URL = 'https://www.formflowx.com';

export default function SEO({
  title,
  description,
  canonical,
  noindex = false,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  children,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Free Online Form Builder`;
  const robots = noindex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta name="robots" content={robots} />
      {canonical && <link rel="canonical" href={`${BASE_URL}${canonical}`} />}

      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={`${BASE_URL}${canonical}`} />}
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {children}
    </Helmet>
  );
}
