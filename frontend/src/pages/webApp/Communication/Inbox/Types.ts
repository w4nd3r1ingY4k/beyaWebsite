/**for dev, limited scope */
export interface Message {
  id?: string;            // UUID
  threadId?: string;
  channel: 'whatsapp' | 'email' | 'instagram';
  direction: 'incoming' | 'outgoing';
  senderName: string;
  senderAvatar?: string;
  preview: string;       // first 120 chars
  subject: string;
  body: string;          // full text / HTML
  timestamp: string;     // ISO date
  isClosed: boolean;     // conversation status
  originalMessageId: string; // ID from original provider (e.g. WhatsApp, email)
  // Base64 attachment metadata
  isBase64?: boolean;    // whether the original body was Base64 encoded
  contentType?: string;  // detected content type for Base64 content
}

  /** ISO-8601 timestamp in UTC, e.g. “2025-05-22T14:11:07.123Z” */
export type ISODate = string;

/** A user, bot, or external phone/email address */
export interface Participant {
  id: string;              // canonical user/contact ID in your system
  name?: string;
  avatarUrl?: string;
  address?: string;        // e.g. +447700900123, foo@example.com
}

/** File or media attached to a message */
export interface Attachment {
  id: string;              // UUID
  name: string;            // filename or caption
  mimeType: string;        // "image/png", "application/pdf", etc.
  sizeBytes: number;
  url: string;             // presigned S3 or CDN URL
}

/** Emoji or reaction metadata */
export interface Reaction {
  emoji: string;           // "👍", "❤️", "😂", …
  userId: string;
  time: ISODate;
}

export type Channel =
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'slack'
  | 'teams'
  | 'internal';

export type DeliveryState =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'pending_template';

/** Immutable envelope + mutable per-tenant status */
export interface MessageProd {
  /* -------- immutable envelope -------- */
  id: string;                    // UUID/ULID
  tenantId: string;              // SaaS tenancy
  threadId: string;              // conversation/group bucket
  channel: Channel;
  direction: 'incoming' | 'outgoing';

  sender: Participant;
  to: Participant[];             // primary recipients
  cc?: Participant[];
  bcc?: Participant[];

  subject?: string;              // email-only
  content: string;               // Markdown or plaintext
  contentType: 'text' | 'html' | 'markdown';

  attachments?: Attachment[];
  metadata?: Record<string, unknown>; // provider IDs, template info, etc.

  timestamp: ISODate;            // creation time (provider’s clock)

  /* -------- mutable facets -------- */
  deliveryState: DeliveryState;  // last provider status
  reactions?: Reaction[];
  version: number;               // increment on every update
}
