import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCOXqP8I7__A6PSuwK2CrrbP7Ml2fUr_pA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "maoaobra-51218.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "maoaobra-51218",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "maoaobra-51218.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "658075256499",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:658075256499:web:f4ed19490baae47f1152c6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QECTXJCJ6M"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  ref,
  uploadBytesResumable,
  getDownloadURL
};

const seededCollections = new Set();

/**
 * Escuta uma coleção real do Firestore onde cada registro é um documento independente.
 * Se a coleção estiver vazia na primeira execução e houver dados iniciais, realiza o seed em lote (writeBatch).
 */
export const syncCollection = (collectionName, idField, initialItems, onUpdate) => {
  const colRef = collection(db, collectionName);

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty && initialItems.length > 0 && !seededCollections.has(collectionName)) {
        seededCollections.add(collectionName);
        try {
          const batch = writeBatch(db);
          initialItems.forEach((item) => {
            const docId = String(item[idField]);
            batch.set(doc(db, collectionName, docId), item);
          });
          await batch.commit();
        } catch (err) {
          console.warn(`Fallback ao inicializar coleção ${collectionName}:`, err);
          onUpdate(initialItems);
        }
        return;
      }

      const items = snapshot.docs.map((d) => d.data());
      onUpdate(items);
    },
    (error) => {
      console.error(`Erro de leitura na coleção ${collectionName}:`, error);
      onUpdate(initialItems);
    }
  );

  return unsubscribe;
};

/**
 * Sincroniza de forma inteligente (diff) apenas os documentos criados, alterados ou removidos
 * em uma coleção real do Firestore, evitando sobrescrever a coleção inteira.
 */
export const syncArrayDiffToCollection = async (collectionName, idField, prevArray = [], nextArray = []) => {
  try {
    const prevMap = new Map(prevArray.map((item) => [String(item[idField]), item]));
    const nextMap = new Map(nextArray.map((item) => [String(item[idField]), item]));

    const promises = [];

    // 1. Upsert apenas documentos novos ou modificados
    for (const [id, nextItem] of nextMap.entries()) {
      const prevItem = prevMap.get(id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(nextItem)) {
        promises.push(setDoc(doc(db, collectionName, id), nextItem, { merge: true }));
      }
    }

    // 2. Deletar documentos removidos
    for (const [id] of prevMap.entries()) {
      if (!nextMap.has(id)) {
        promises.push(deleteDoc(doc(db, collectionName, id)));
      }
    }

    await Promise.all(promises);
  } catch (err) {
    console.error(`Erro ao sincronizar documentos em ${collectionName}:`, err);
  }
};
