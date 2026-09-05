export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validSlug(slug: string) {
  return slug.length >= 3 && slug.length <= 64 && SLUG_PATTERN.test(slug) && slug !== 'test';
}
export function suggestSlug(title: string) {
  return title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '');
}
