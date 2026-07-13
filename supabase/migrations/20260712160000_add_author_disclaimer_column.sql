/*
  # Add per-author disclaimer

  Supports an automated "About the Author" + disclaimer box on article
  pages, sourced from a fixed bio/disclaimer written once per author
  (authors.bio already existed) rather than regenerated per article.
*/

alter table authors add column if not exists disclaimer text;
