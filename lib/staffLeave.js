export const STAFF_COOKIE='bv_admin';
/** Staff are signed out when they visit the guest portal. Link prefetches (hover/viewport) must NOT count, or just looking at a link would sign them out. */
export const isPrefetch=h=>h.get('next-router-prefetch')==='1'||h.get('purpose')==='prefetch'||!!h.get('x-middleware-prefetch');
export const shouldClearStaffCookie=({hasCookie,headers})=>!!hasCookie&&!isPrefetch(headers);
