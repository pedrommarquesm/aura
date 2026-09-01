/** UUIDv7 (and any RFC-4122) post id from the API. */
const POST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPostId(value: string | null | undefined): value is string {
  return Boolean(value && POST_ID.test(value));
}
