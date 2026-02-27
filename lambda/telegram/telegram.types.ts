export type TelegramWebhookPayload = {
  update_id?: number;
  message?: {
    message_id?: number;
    date?: number;
    text?: string;
    from?: {
      id?: number | string;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat?: {
      id?: number | string;
      type?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
};

export type TelegramFrom = NonNullable<
  NonNullable<TelegramWebhookPayload["message"]>["from"]
>;
