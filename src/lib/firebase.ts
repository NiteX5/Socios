import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

// Solo en desarrollo y con la variable explicita. En produccion nunca se conecta a emuladores.
const usarEmuladores =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

function configuracion(): FirebaseOptions {
  if (usarEmuladores) {
    // Proyecto "demo-": no toca ningun proyecto real.
    return { apiKey: 'demo-api-key', authDomain: 'localhost', projectId: 'demo-socios' };
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function obtenerApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(configuracion());
  return app;
}

/** Auth con persistencia local y sin resolver de popup/iframe (solo email/contrasena). */
export function getAuthInstance(): Auth {
  if (auth) return auth;
  const a = obtenerApp();
  try {
    auth = initializeAuth(a, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
    if (usarEmuladores) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  } catch {
    // Ya inicializado (recarga en caliente).
    auth = getAuth(a);
  }
  return auth;
}

/** Firestore con cache en memoria (sin persistencia IndexedDB multi-pestana). */
export function getDb(): Firestore {
  if (db) return db;
  const a = obtenerApp();
  db = getFirestore(a);
  if (usarEmuladores) {
    try {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch {
      // Ya conectado (recarga en caliente).
    }
  }
  return db;
}
