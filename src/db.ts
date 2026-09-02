import { type IDBPDatabase, openDB } from 'idb';
import type { Coach } from './@types/Coach';
import type { DraftDB } from './@types/DraftDB';
import type { Player } from './@types/Player';

const DB_NAME = 'offline-draft';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DraftDB>> | null = null;

const getDB = () => {
  dbPromise ??= openDB<DraftDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('players')) {
        db.createObjectStore('players', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('coaches')) {
        db.createObjectStore('coaches', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    },
  });
  return dbPromise;
};

export const loadPlayers = async (): Promise<Player[]> => {
  const db = await getDB();
  return db.getAll('players');
};

export const replaceAllPlayers = async (players: Player[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('players', 'readwrite');
  await tx.store.clear();
  await Promise.all(players.map((p) => tx.store.put(p)));
  await tx.done;
};

export const savePlayer = async (player: Player): Promise<void> => {
  const db = await getDB();
  await db.put('players', player);
};

export const savePlayers = async (players: Player[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('players', 'readwrite');
  await Promise.all(players.map((p) => tx.store.put(p)));
  await tx.done;
};

export const loadCoaches = async (): Promise<Coach[]> => {
  const db = await getDB();
  return db.getAll('coaches');
};

export const saveCoaches = async (coaches: Coach[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('coaches', 'readwrite');
  await tx.store.clear();
  await Promise.all(coaches.map((c) => tx.store.put(c)));
  await tx.done;
};

export const loadMeta = async (key: string): Promise<string | undefined> => {
  const db = await getDB();
  return db.get('meta', key);
};

export const saveMeta = async (key: string, value: string): Promise<void> => {
  const db = await getDB();
  await db.put('meta', value, key);
};

export const deleteMeta = async (key: string): Promise<void> => {
  const db = await getDB();
  await db.delete('meta', key);
};
