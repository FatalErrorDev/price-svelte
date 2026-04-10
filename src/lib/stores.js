import { writable, derived } from 'svelte/store';

export const currentPage = writable('scraping');
export const currentBranch = writable('sewera');
export const accessToken = writable(null);
export const isSignedIn = derived(accessToken, ($token) => !!$token);
