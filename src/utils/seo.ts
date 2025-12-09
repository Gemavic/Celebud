export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export function updateMetaTags(config: SEOConfig) {
  const baseUrl = window.location.origin;
  const fullUrl = config.url ? `${baseUrl}${config.url}` : window.location.href;

  document.title = config.title;

  updateOrCreateMetaTag('name', 'description', config.description);
  if (config.keywords) {
    updateOrCreateMetaTag('name', 'keywords', config.keywords);
  }
  if (config.author) {
    updateOrCreateMetaTag('name', 'author', config.author);
  }

  updateOrCreateMetaTag('property', 'og:title', config.title);
  updateOrCreateMetaTag('property', 'og:description', config.description);
  updateOrCreateMetaTag('property', 'og:url', fullUrl);
  updateOrCreateMetaTag('property', 'og:type', config.type || 'website');
  if (config.image) {
    updateOrCreateMetaTag('property', 'og:image', config.image);
  }

  updateOrCreateMetaTag('name', 'twitter:title', config.title);
  updateOrCreateMetaTag('name', 'twitter:description', config.description);
  if (config.image) {
    updateOrCreateMetaTag('name', 'twitter:image', config.image);
  }

  if (config.type === 'article') {
    if (config.publishedTime) {
      updateOrCreateMetaTag('property', 'article:published_time', config.publishedTime);
    }
    if (config.modifiedTime) {
      updateOrCreateMetaTag('property', 'article:modified_time', config.modifiedTime);
    }
    if (config.author) {
      updateOrCreateMetaTag('property', 'article:author', config.author);
    }
  }

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = fullUrl;
}

function updateOrCreateMetaTag(
  attribute: 'name' | 'property',
  value: string,
  content: string
) {
  let element = document.querySelector(
    `meta[${attribute}="${value}"]`
  ) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.content = content;
}

export function generateArticleStructuredData(article: {
  title: string;
  description: string;
  image?: string;
  author: string;
  publishedDate: string;
  modifiedDate?: string;
  url: string;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    image: article.image ? [article.image] : [],
    datePublished: article.publishedDate,
    dateModified: article.modifiedDate || article.publishedDate,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'CelebUD Magazine',
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };

  let script = document.querySelector(
    'script[type="application/ld+json"][data-article]'
  ) as HTMLScriptElement;

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-article', 'true');
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(structuredData);
}

export function removeArticleStructuredData() {
  const script = document.querySelector(
    'script[type="application/ld+json"][data-article]'
  );
  if (script) {
    script.remove();
  }
}
