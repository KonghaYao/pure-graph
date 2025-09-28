import { createEndpoint } from '../../createEndpoint.js';
import { MemoryThreadsManager } from '../../storage/memory/threads.js';

export const client = createEndpoint(new MemoryThreadsManager());
