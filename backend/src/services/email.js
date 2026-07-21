import { logger } from '../lib/logger.js';
export const emailService = {
  async sendWorkspaceInvite({ email }) { logger.info('Email: invite', { email }); },
  async sendNewResponseNotification({ to, formTitle }) { logger.info('Email: new response', { to, formTitle }); },
  async sendRespondentConfirmation({ to }) { logger.info('Email: confirmation', { to }); },
};
