/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandContext, SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import process from 'node:process';
import { MessageType, type HistoryItemAbout } from '../types.js';
import {
  IdeClient,
  UserAccountManager,
  debugLogger,
  getVersion,
} from '@google/gemini-cli-core';

/**
 * Check if the process is running inside a sandbox.
 * Returns false for SANDBOX='0' or SANDBOX='false' (treated as not in sandbox).
 */
function isInsideSandbox(): boolean {
  const sandboxEnv = process.env['SANDBOX']?.toLowerCase().trim();
  return !!(sandboxEnv && sandboxEnv !== '0' && sandboxEnv !== 'false');
}

export const aboutCommand: SlashCommand = {
  name: 'about',
  description: 'Show version info',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context) => {
    const osVersion = process.platform;
    let sandboxEnv = 'no sandbox';
    const sandbox = process.env['SANDBOX'];
    const insideSandbox = isInsideSandbox();
    if (insideSandbox && sandbox !== 'sandbox-exec') {
      sandboxEnv = sandbox ?? '';
    } else if (sandbox === 'sandbox-exec') {
      sandboxEnv = `sandbox-exec (${
        process.env['SEATBELT_PROFILE'] || 'unknown'
      })`;
    }
    const modelVersion = context.services.config?.getModel() || 'Unknown';
    const cliVersion = await getVersion();
    const selectedAuthType =
      context.services.settings.merged.security.auth.selectedType || '';
    const gcpProject = process.env['GOOGLE_CLOUD_PROJECT'] || '';
    const ideClient = await getIdeClientName(context);

    const userAccountManager = new UserAccountManager();
    const cachedAccount = userAccountManager.getCachedGoogleAccount();
    debugLogger.log('AboutCommand: Retrieved cached Google account', {
      cachedAccount,
    });
    const userEmail = cachedAccount ?? undefined;

    const tier = context.services.config?.getUserTierName();

    const aboutItem: Omit<HistoryItemAbout, 'id'> = {
      type: MessageType.ABOUT,
      cliVersion,
      osVersion,
      sandboxEnv,
      modelVersion,
      selectedAuthType,
      gcpProject,
      ideClient,
      userEmail,
      tier,
    };

    context.ui.addItem(aboutItem);
  },
};

async function getIdeClientName(context: CommandContext) {
  if (!context.services.config?.getIdeMode()) {
    return '';
  }
  const ideClient = await IdeClient.getInstance();
  return ideClient?.getDetectedIdeDisplayName() ?? '';
}
