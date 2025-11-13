// This file is a safe wrapper that can be imported in both client and server code
// Actual Firebase client SDK initialization is in lib/firebase-client.ts

// Re-export for backward compatibility, but these will be null on server-side
export let auth: any = null;
export let db: any = null;
export let storage: any = null;
export let googleProvider: any = null;

// Only import and initialize on client-side
if (typeof window !== 'undefined') {
  import('@/lib/firebase-client').then((module) => {
    auth = module.auth;
    db = module.db;
    storage = module.storage;
    googleProvider = module.googleProvider;
  });
}