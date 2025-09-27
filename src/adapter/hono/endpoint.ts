import { createMemoryEndpoint } from '../..';
import { MemoryThreadsManager } from '../../storage/memory/threads.js';

export const client = createMemoryEndpoint(new MemoryThreadsManager());
