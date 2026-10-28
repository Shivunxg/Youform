import { logger } from '../lib/logger.js';
export const responseQueue = { add: async (name, data) => logger.debug('Queue job', { name }) };
export function startWorkers() { logger.info('Workers: stub mode'); }
