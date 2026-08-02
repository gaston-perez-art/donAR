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
  /** Fecha de cierre en ISO ("AAAA-MM-DD"), para prellenar la edición. null si no tiene. */
  deadline: string | null;
  status: 'active' | 'completed' | 'closed' | 'review' | 'needs_info' | 'rejected';
  reviewNote?: string | null;
  createdAt: string;
  verified: boolean;
  /** True when the cause was created by the current user (local session). */
  mine?: boolean;
  /** Cuándo se cerró (llegó a la meta o venció el plazo). null si sigue activa. */
  closedAt: string | null;
  /** Cantidad de aportes confirmados. Viene calculado de causes_public. */
  contributors: number;
  /** Mensaje de cierre público del beneficiado (agradecimiento general). */
  closingMessage: string | null;
  closingPhotoUrl: string | null;
};
