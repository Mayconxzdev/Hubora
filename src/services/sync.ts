import { cloudService } from '@/services/cloud';
import { localRepository } from '@/services/localRepository';
import type { ConsumptionEvent, CustomList, UserMediaEntry, UserProfile } from '@/types';

let running = false;

export const syncService = {
  async flush(userId: string): Promise<{ processed: number; failed: number }> {
    if (!cloudService.isConfigured || running) return { processed: 0, failed: 0 };
    running = true;
    let processed = 0;
    let failed = 0;

    try {
      const operations = await localRepository.getOutbox(100);
      for (const operation of operations) {
        try {
          if (operation.entity === 'library') {
            if (operation.action === 'delete') await cloudService.removeFromLibrary(userId, operation.entityId);
            else await cloudService.addToLibrary(userId, operation.payload as UserMediaEntry);
          } else if (operation.entity === 'custom_list') {
            if (operation.action === 'delete') await cloudService.removeCustomList(userId, operation.entityId);
            else await cloudService.upsertCustomList(userId, operation.payload as CustomList);
          } else if (operation.entity === 'consumption_event' && operation.action === 'upsert') {
            await cloudService.upsertConsumptionEvent(userId, operation.payload as ConsumptionEvent);
          } else if (operation.entity === 'profile' && operation.action === 'upsert') {
            await cloudService.updateUserProfile(userId, operation.payload as UserProfile);
          }
          await localRepository.acknowledgeOperation(operation.operationId);
          processed += 1;
        } catch (error) {
          failed += 1;
          await localRepository.markOperationFailed(operation, error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      running = false;
    }

    return { processed, failed };
  },
};
