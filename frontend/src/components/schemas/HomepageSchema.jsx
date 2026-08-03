import { Helmet } from 'react-helmet-async';

const schema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FormFlowX',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://www.formflowx.com/',
  description: 'Build beautiful conversational forms in minutes. No code needed. Free forever with 100 responses/month.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Plan',
      price: '0',
      priceCurrency: 'USD',
      description: '100 responses/month, 1 team member, all question types',
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan',
      price: '15',
      priceCurrency: 'USD',
      description: '5,000 responses/month, 3 team members, custom branding',
    },
    {
      '@type': 'Offer',
      name: 'Business Plan',
      price: '39',
      priceCurrency: 'USD',
      description: '25,000 responses/month, 10 team members, SSO, audit log',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '120',
  },
};

export default function HomepageSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
