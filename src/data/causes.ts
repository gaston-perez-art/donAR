export type Cause = {
  id: string;
  title: string;
  story: string;
  who: string;
  emoji: string;
  coverTint: string;
  /** Fotos de portada, opcionales, hasta 2. Vacío cae al emoji + color. */
  imageUrls: string[];
  raised: number;
  goal: number;
  daysLeft: number;
  status: 'active' | 'completed' | 'closed' | 'review' | 'needs_info' | 'rejected';
  reviewNote?: string | null;
  createdAt: string;
  verified: boolean;
  /** True when the cause was created by the current user (local session). */
  mine?: boolean;
};
