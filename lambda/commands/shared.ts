function parseSharedSummaryChatIds(value: string | undefined): Set<string> {
  if (!value) return new Set();

  const chatIds = value
    .split(",")
    .map((chatId) => chatId.trim())
    .filter(Boolean);

  return new Set(chatIds);
}

const SHARED_SUMMARY_CHAT_IDS = parseSharedSummaryChatIds(
  process.env.SHARED_SUMMARY_CHAT_IDS,
);

export function getResumenScopeChatIds(chatId: string): string[] {
  if (SHARED_SUMMARY_CHAT_IDS.size === 0) return [chatId];

  return SHARED_SUMMARY_CHAT_IDS.has(chatId)
    ? Array.from(SHARED_SUMMARY_CHAT_IDS)
    : [chatId];
}
