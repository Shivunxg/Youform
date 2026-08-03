import { Helmet } from 'react-helmet-async';

export default function TemplateSchema({ name, description, url, category }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name,
    description,
    url: `https://www.formflowx.com${url}`,
    genre: category,
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: 'FormFlowX',
      url: 'https://www.formflowx.com/',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
