import { Helmet } from 'react-helmet-async';

const DEFAULT_FAQS = [
  {
    q: 'Is FormFlowX really free?',
    a: 'Yes. The Free plan includes 100 responses per month, unlimited forms, and all question types — no credit card required.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. FormFlowX has a drag-and-drop builder with AI-assisted form generation. You can create and publish a form in minutes without writing a single line of code.',
  },
  {
    q: 'What integrations does FormFlowX support?',
    a: 'FormFlowX integrates with Slack, Google Sheets, Notion, Airtable, Zapier, Make, and many more. New integrations are added regularly.',
  },
  {
    q: 'Can I add conditional logic to my forms?',
    a: 'Yes. FormFlowX supports powerful conditional logic — you can show or hide questions, skip sections, and redirect respondents based on their answers.',
  },
  {
    q: 'How do I embed a form on my website?',
    a: 'FormFlowX generates an embed code you can paste into any website. We support standard iframe embeds, popup embeds, and full-page embeds.',
  },
];

export default function FAQSchema({ faqs = DEFAULT_FAQS }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
