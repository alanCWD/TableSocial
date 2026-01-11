export function generateSlug(title: string, date?: string | null): string {
  let slug = title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (date) {
    const dateMatch = date.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (dateMatch) {
      const monthNames: Record<string, string> = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      const month = monthNames[dateMatch[1].toLowerCase()] || '01';
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      slug = `${slug}-${year}-${month}-${day}`;
    }
  }

  return slug;
}

export function generateEventJsonLd(event: {
  title: string;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  chefName?: string | null;
  sourceUrls?: string[] | null;
}): object {
  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "FoodEvent",
    "name": event.title,
  };

  if (event.description) {
    jsonLd.description = event.description;
  }

  if (event.date) {
    const dateMatch = event.date.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (dateMatch) {
      const monthNames: Record<string, string> = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      const month = monthNames[dateMatch[1].toLowerCase()] || '01';
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      const isoDate = `${year}-${month}-${day}`;

      if (event.time) {
        const timeMatch = event.time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = timeMatch[2] || '00';
          const ampm = timeMatch[3]?.toUpperCase();
          if (ampm === 'PM' && hour !== 12) hour += 12;
          if (ampm === 'AM' && hour === 12) hour = 0;
          jsonLd.startDate = `${isoDate}T${hour.toString().padStart(2, '0')}:${minute}:00`;
        } else {
          jsonLd.startDate = isoDate;
        }
      } else {
        jsonLd.startDate = isoDate;
      }
    }
  }

  if (event.price) {
    jsonLd.offers = {
      "@type": "Offer",
      "price": event.price,
      "priceCurrency": "CAD",
      "availability": "https://schema.org/InStock"
    };
  }

  if (event.imageUrl) {
    jsonLd.image = event.imageUrl;
  }

  if (event.venueName || event.venueAddress) {
    jsonLd.location = {
      "@type": "Place",
      "name": event.venueName || "Venue",
    };
    if (event.venueAddress) {
      jsonLd.location.address = {
        "@type": "PostalAddress",
        "streetAddress": event.venueAddress
      };
    }
  }

  if (event.chefName) {
    jsonLd.performer = {
      "@type": "Person",
      "name": event.chefName,
      "jobTitle": "Chef"
    };
  }

  if (event.sourceUrls && event.sourceUrls.length > 0) {
    jsonLd.url = event.sourceUrls[0];
  }

  return jsonLd;
}

export function generateChefJsonLd(chef: {
  name: string;
  bio?: string | null;
  culinaryStyle?: string | null;
  imageUrl?: string | null;
  region?: string | null;
  socialLinks?: { website?: string; instagram?: string } | null;
}): object {
  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": chef.name,
    "jobTitle": "Chef",
  };

  if (chef.bio) {
    jsonLd.description = chef.bio;
  }

  if (chef.culinaryStyle) {
    jsonLd.knowsAbout = chef.culinaryStyle;
  }

  if (chef.imageUrl) {
    jsonLd.image = chef.imageUrl;
  }

  if (chef.region) {
    jsonLd.workLocation = {
      "@type": "Place",
      "name": chef.region
    };
  }

  const sameAs: string[] = [];
  if (chef.socialLinks?.website) {
    sameAs.push(chef.socialLinks.website);
  }
  if (chef.socialLinks?.instagram) {
    const insta = chef.socialLinks.instagram.replace('@', '');
    sameAs.push(`https://instagram.com/${insta}`);
  }
  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs;
  }

  return jsonLd;
}
