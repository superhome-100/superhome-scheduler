import { writable } from 'svelte/store';

type SessionAuth = {
  email: string; // this should become our main unifying data
  uid: string; // firebase auth uid, different from google or fbid
  displayName: string;
  providerId: string;
  provider: 'google.com' | 'facebook.com';
  photoURL: string;
}
export const sessionAuth = writable<SessionAuth>();