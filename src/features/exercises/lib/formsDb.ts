import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import {
  defaultDatabaseDirectory,
  openDatabaseSync,
  type SQLiteDatabase,
} from 'expo-sqlite';

const DB_NAME = 'forms_index.db';
const DB_VERSION = 2; // Increment this when forms_index.db changes
const DB_ASSET = require('../../../../assets/forms_index.db');
let dbInstance: SQLiteDatabase | null = null;
let ensuringPromise: Promise<void> | null = null;

const normalizeForm = (raw: string): string | null => {
  const lower = raw
    .trim()
    .toLowerCase()
    .replace(/[’‘`‵]/g, "'")
    .replace(/–|—/g, '-');

  const cleaned = lower.replace(/[^a-z'\-]/g, '');
  if (cleaned.length < 2 || cleaned.length > 25) return null;
  return cleaned;
};

const ensureDatabase = async () => {
  if (dbInstance) return;
  if (ensuringPromise) return ensuringPromise;

  ensuringPromise = (async () => {
    const base = defaultDatabaseDirectory ?? FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
    const hasScheme = base.startsWith('file://');
    const baseDir = (hasScheme ? base : `file://${base}`).replace(/\/?$/, '/');
    const dest = `${baseDir}${DB_NAME}`;
    const versionFile = `${baseDir}${DB_NAME}.version`;

    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });

    // Check if we need to update the database
    let needsUpdate = false;
    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists) {
      needsUpdate = true;
    } else {
      // Check version
      const versionInfo = await FileSystem.getInfoAsync(versionFile);
      if (!versionInfo.exists) {
        needsUpdate = true;
      } else {
        const storedVersion = await FileSystem.readAsStringAsync(versionFile);
        if (parseInt(storedVersion) !== DB_VERSION) {
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      const asset = Asset.fromModule(DB_ASSET);
      await asset.downloadAsync();
      if (!asset.localUri) {
        throw new Error('Failed to download forms_index.db asset');
      }
      await FileSystem.copyAsync({ from: asset.localUri, to: dest });
      await FileSystem.writeAsStringAsync(versionFile, DB_VERSION.toString());
    }

    // directory expects a file path without scheme; strip file://
    const directoryPath = baseDir.replace(/^file:\/\//, '');
    dbInstance = openDatabaseSync(DB_NAME, undefined, directoryPath);
  })();

  await ensuringPromise;
};

const executeSql = async (sql: string, params: unknown[] = []) => {
  if (!dbInstance) throw new Error('DB is not initialized');
  const result = await dbInstance!.getAllAsync(sql, params as any);
  return result as any[];
};

export const wordIdsFromFormsDb = async (forms: string[], limit?: number): Promise<number[]> => {
  if (!forms.length) return [];
  await ensureDatabase();

  const normalized = Array.from(
    new Set(forms.map((f) => normalizeForm(f)).filter((v): v is string => Boolean(v))),
  );
  if (!normalized.length) return [];

  const chunkSize = 300;
  const effectiveLimit = limit ?? 10000;

  // Build all chunks upfront
  const chunks: string[][] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push(normalized.slice(i, i + chunkSize));
  }

  // Execute all queries in parallel
  const results = await Promise.all(
    chunks.map((chunk) => {
      const placeholders = chunk.map(() => '?').join(',');
      return executeSql(
        `SELECT word_id FROM forms WHERE form IN (${placeholders}) LIMIT ?`,
        [...chunk, effectiveLimit],
      );
    })
  );

  // Collect unique IDs
  const ids = new Set<number>();
  for (const rows of results) {
    for (const row of rows) {
      if (typeof row.word_id === 'number') {
        ids.add(row.word_id);
        if (ids.size >= effectiveLimit) break;
      }
    }
    if (ids.size >= effectiveLimit) break;
  }

  return Array.from(ids);
};

export const formsDb = {
  wordIdsFromFormsDb,
};
