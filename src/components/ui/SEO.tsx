import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title, 
  description = 'Hubora — sua central pessoal e privada para descobrir, acompanhar, assistir e ler.', 
  image, 
  url, 
  type = 'website' 
}: SEOProps) {
  const siteTitle = title ? `${title} | Hubora` : 'Hubora — Seu universo pessoal';
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://hubora.netlify.app');
  const socialImage = image || new URL('/images/hubora-og.png', canonicalUrl).toString();

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={socialImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={socialImage} />
    </Helmet>
  );
}
