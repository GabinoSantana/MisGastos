const SHARED_SUMMARY_CHAT_IDS = new Set(["8169741624", "957840592"]);

export function getResumenScopeChatIds(chatId: string): string[] {
  return SHARED_SUMMARY_CHAT_IDS.has(chatId)
    ? Array.from(SHARED_SUMMARY_CHAT_IDS)
    : [chatId];
}
