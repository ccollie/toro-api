import { AlpenError } from '@alpen/core';

export function raiseIfQueueReadonly(id: string): void {
    if (this.isQueueReadonly(id)) {
        throw new AlpenError('Queue is readonly');
    }
}
