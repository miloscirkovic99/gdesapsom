/**
 * GA4 event vocabulary shared by the website (gtag.js) and the mobile app
 * (Firebase Analytics), so both report into the same property with the same
 * names. The values are sent as event parameters: keep them in sync with the
 * custom dimensions registered in GA4.
 */

/** `link_type` of an `outbound_click` / `contact_click`. */
export type LinkType =
  | 'venue_website'
  | 'venue_maps'
  | 'venue_phone'
  | 'affiliate_booking'
  | 'social'
  | 'other';

/** Which list a search, filter or near-me event came from (`search_scope`). */
export type SearchScope = 'spots' | 'vet_clinics' | 'pet_shops' | 'dog_food';

/** What the visitor suggested through a public form (`content_type`). */
export type SubmissionType = 'spot' | 'park';

/**
 * Free-text search boxes fire on every keystroke; the search is only reported
 * once the term has been left alone this long, so partial words are not.
 */
export const SEARCH_TRACKING_DEBOUNCE_MS = 1500;
