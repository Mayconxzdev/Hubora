import { huboraDb } from '@/lib/db';
import { createHuboraBackup, parseHuboraBackup, type HuboraBackup } from '@/services/backup';
import { localRepository } from '@/services/localRepository';
import type { UserProfile } from '@/types';

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_SNAPSHOTS_PER_USER = 7;

export async function createAutomaticBackup(user: UserProfile | null): Promise<HuboraBackup> {
  const [library, customLists, consumptionEvents, goals] = await Promise.all([
    localRepository.getLibrary(),
    localRepository.getCustomLists(),
    localRepository.getConsumptionEvents(100_000),
    huboraDb.goals.toArray(),
  ]);
  const backup = createHuboraBackup({ user, library, customLists, consumptionEvents, goals });
  const userId = user?.uid || 'local';
  const createdAt = Date.now();
  await huboraDb.backupSnapshots.put({ id: `${userId}:${createdAt}`, userId, createdAt, payload: backup });
  const snapshots = await huboraDb.backupSnapshots.where('userId').equals(userId).reverse().sortBy('createdAt');
  const obsolete = snapshots.slice(MAX_SNAPSHOTS_PER_USER).map((snapshot) => snapshot.id);
  if (obsolete.length) await huboraDb.backupSnapshots.bulkDelete(obsolete);
  await huboraDb.metadata.put({ key: `last-auto-backup:${userId}`, value: createdAt, updatedAt: createdAt });
  return backup;
}

export async function ensureAutomaticBackup(user: UserProfile | null): Promise<boolean> {
  const userId = user?.uid || 'local';
  const metadata = await huboraDb.metadata.get(`last-auto-backup:${userId}`);
  const last = Number(metadata?.value || 0);
  if (Date.now() - last < BACKUP_INTERVAL) return false;
  await createAutomaticBackup(user);
  return true;
}

export async function listAutomaticBackups(userId = 'local') {
  return huboraDb.backupSnapshots.where('userId').equals(userId).reverse().sortBy('createdAt');
}

export async function readAutomaticBackup(id: string): Promise<HuboraBackup | null> {
  const record = await huboraDb.backupSnapshots.get(id);
  return record ? parseHuboraBackup(record.payload) : null;
}
