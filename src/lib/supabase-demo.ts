/**
 * Supabase falso para la demo pública del portfolio (EXPO_PUBLIC_DEMO=1).
 *
 * Implementa la parte de supabase-js que usa la app (from/select/insert/
 * update/upsert/delete con filtros, auth, storage y functions) sobre tablas
 * en memoria que se guardan en el localStorage del navegador. No hay red ni
 * cuentas reales: las causas y las personas son inventadas, y cada visitante
 * tiene su propia copia. La app de verdad no pasa nunca por acá.
 */

type Row = Record<string, any>;
type DB = Record<string, Row[]>;

const DB_KEY = 'donar.demo.db.v1';
const AUTH_KEY = 'donar.demo.signedIn';
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_EMAIL = 'invitado@demo.donar';

const PK: Record<string, string> = { cause_payouts: 'cause_id', cause_evidence: 'cause_id', push_tokens: 'token' };

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();
const dateIn = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

// ---------------------------------------------------------------- semilla
function seed(): DB {
  const P = (id: string, name: string, extra: Row = {}) => ({
    id, full_name: name, display_name: name, initials: name.split(' ').map((w) => w[0]).join('').slice(0, 2),
    identity_status: 'verified', points: 0, is_curator: false, is_registered: true, avatar_url: null, created_at: daysAgo(60), ...extra,
  });
  const ids = Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8000-0000000000${String(i + 10)}`);
  const profiles = [
    P(DEMO_USER_ID, 'Invitado', { is_curator: false }),
    P(ids[0], 'Lucía Fernández'), P(ids[1], 'Martín Gómez'), P(ids[2], 'Sofía Ramírez'), P(ids[3], 'Diego Sosa'),
    P(ids[4], 'Valentina Ruiz'), P(ids[5], 'Joaquín Díaz'), P(ids[6], 'Carla Benítez'), P(ids[7], 'Nicolás Torres'),
  ];

  const C = (owner: string, title: string, story: string, goal: number, extra: Row) => ({
    id: uid(), owner_id: owner, title, story, goal_amount: goal, deadline: dateIn(20), status: 'active', emoji: '💙',
    cover_tint: '#CFE6FB', image_urls: [], image_url: null, verified: true, review_note: null, reviewed_at: daysAgo(8),
    created_at: daysAgo(10), closed_at: null, closing_message: null, closing_photo_url: null, ...extra,
  });
  const causes = [
    C(ids[0], 'Silla de ruedas para Mateo, 9 años', 'Mateo tiene parálisis cerebral y su silla le quedó chica. La nueva, adaptada a su postura, cuesta lo que no tenemos. Con ella puede volver a ir a la escuela sin dolor.', 1800000, { emoji: '🦽', cover_tint: '#CFE6FB', deadline: dateIn(18) }),
    C(ids[1], 'Reconstruir el techo después del temporal', 'El temporal de octubre se llevó medio techo de la casa de mi vieja en Quilmes. Necesitamos chapas, tirantes y la mano de obra antes de que vuelva a llover.', 950000, { emoji: '🏠', cover_tint: '#FDE7C8', deadline: dateIn(12), created_at: daysAgo(14) }),
    C(ids[2], 'Tratamiento de fertilidad de Sofi y Juan', 'Llevamos cuatro años buscando. La obra social cubre una parte del tratamiento; el resto es lo que estamos juntando.', 2400000, { emoji: '🌱', cover_tint: '#D7F0E2', deadline: dateIn(30), created_at: daysAgo(6) }),
    C(ids[3], 'Útiles para el comedor del barrio', 'El comedor de Villa Tranquila arranca el apoyo escolar en marzo y necesita útiles para 60 chicos.', 300000, { emoji: '✏️', cover_tint: '#E9DDFB', status: 'completed', closed_at: daysAgo(2), closing_message: '¡Llegamos! Gracias a cada uno: los útiles ya están en el comedor.' }),
    C(DEMO_USER_ID, 'Operación de mi perra Luna', 'Luna se fracturó la cadera y necesita una cirugía con placa. Es parte de la familia hace 11 años.', 600000, { emoji: '🐕', cover_tint: '#FBD9D9', deadline: dateIn(9), created_at: daysAgo(5) }),
    C(ids[4], 'Prótesis auditiva para Ramiro', 'Ramiro tiene 70 años y perdió la audición de un oído. La prótesis le devuelve las charlas con sus nietos.', 1100000, { emoji: '👂', cover_tint: '#FFF1C7', status: 'review', verified: false, reviewed_at: null, created_at: daysAgo(1) }),
  ];
  const [mateo, techo, sofi, utiles, luna, ramiro] = causes;

  const K = (cause: Row, donor: string | null, amount: number, d: number, extra: Row = {}) => ({
    id: uid(), cause_id: cause.id, donor_id: donor, amount, message: null, anonymous: false, status: 'approved',
    method: 'transfer', receipt_url: 'demo/comprobante.jpg', created_at: daysAgo(d, (amount / 1000) % 20), confirmed_at: daysAgo(d), ...extra,
  });
  const contributions = [
    K(mateo, ids[1], 150000, 7, { message: '¡Fuerza Mateo!' }), K(mateo, ids[2], 80000, 6), K(mateo, ids[5], 250000, 5, { message: 'Desde Córdoba, un abrazo enorme.' }),
    K(mateo, ids[6], 60000, 3, { anonymous: true }), K(mateo, DEMO_USER_ID, 50000, 2, { message: 'Que la disfrute mucho.' }), K(mateo, ids[7], 400000, 1),
    K(techo, ids[0], 120000, 9), K(techo, ids[4], 90000, 7, { message: 'Que no se vuelva a mojar nada.' }), K(techo, ids[6], 200000, 4), K(techo, DEMO_USER_ID, 30000, 3),
    K(sofi, ids[3], 300000, 4, { message: 'Les deseo todo lo mejor.' }), K(sofi, ids[7], 150000, 2),
    K(utiles, ids[0], 100000, 12), K(utiles, ids[2], 120000, 10), K(utiles, ids[5], 80000, 8, { message: 'Para los pibes.' }),
    K(luna, ids[0], 90000, 3, { message: '¡Fuerza Luna!' }), K(luna, ids[5], 45000, 2),
    // Una transferencia esperando que el dueño (el visitante) confirme que le llegó.
    K(luna, ids[2], 120000, 0, { status: 'pending', confirmed_at: null, message: 'Te transferí recién, avisame si llegó.' }),
  ];

  const cause_payouts = causes.map((c) => ({ cause_id: c.id, method: 'cbu', alias: 'demo.donar.alias' }));
  const cause_evidence = causes.map((c) => ({
    cause_id: c.id, dni_front_url: 'demo/dni-frente.jpg', dni_back_url: 'demo/dni-dorso.jpg', selfie_url: 'demo/selfie.jpg', backup_doc_url: 'demo/respaldo.jpg', updated_at: c.created_at,
  }));
  const cause_thanks = [{ id: uid(), cause_id: utiles.id, contribution_id: contributions[13].id, message: '¡Gracias Sofía! Ya compramos las mochilas.', created_at: daysAgo(1) }];

  return { profiles, causes, contributions, cause_payouts, cause_evidence, cause_thanks, cause_edits: [], platform_support: [], push_tokens: [] };
}

// ---------------------------------------------------------------- almacenamiento
let memo: DB | null = null;
function db(): DB {
  if (memo) return memo;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_KEY) : null;
    if (raw) memo = JSON.parse(raw);
  } catch {
    /* nada */
  }
  if (!memo) {
    memo = seed();
    save();
  }
  return memo!;
}
function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(memo));
  } catch {
    /* nada */
  }
}
export function resetDemo() {
  try {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* nada */
  }
  if (typeof location !== 'undefined') location.reload();
}
export function setDemoCurator(on: boolean) {
  const me = db().profiles.find((p) => p.id === DEMO_USER_ID);
  if (me) me.is_curator = on;
  save();
  if (typeof location !== 'undefined') location.reload();
}
export const isDemoCurator = () => !!db().profiles.find((p) => p.id === DEMO_USER_ID)?.is_curator;

const signedIn = () => {
  try {
    return localStorage.getItem(AUTH_KEY) !== '0';
  } catch {
    return true;
  }
};
const setSignedIn = (v: boolean) => {
  try {
    localStorage.setItem(AUTH_KEY, v ? '1' : '0');
  } catch {
    /* nada */
  }
};

// ---------------------------------------------------------------- vistas y joins
function tableRows(name: string): Row[] {
  const d = db();
  if (name === 'causes_public') {
    return d.causes.map((c) => {
      const ok = d.contributions.filter((k) => k.cause_id === c.id && k.status === 'approved');
      return { ...c, raised_amount: ok.reduce((s, k) => s + Number(k.amount), 0), contributors: ok.length };
    });
  }
  return (d[name] ??= []);
}

// "causes(title, emoji)" o "causes!inner(...)" -> se embebe la causa por cause_id.
function embeds(sel?: string) {
  const out: { rel: string; inner: boolean }[] = [];
  if (!sel) return out;
  for (const m of sel.matchAll(/(\w+)(!inner)?\(/g)) out.push({ rel: m[1], inner: !!m[2] });
  return out;
}
const fkOf = (rel: string) => `${rel.replace(/s$/, '')}_id`;

type Filter = (r: Row) => boolean;
const get = (r: Row, col: string) => col.split('.').reduce((v: any, k) => (v == null ? v : v[k]), r);

class Query implements PromiseLike<any> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: any;
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private mode: 'many' | 'single' | 'maybe' = 'many';
  private sel: string | undefined;
  private returning = false;
  private conflict: string | undefined;

  constructor(private table: string) {}

  select(cols?: string) {
    if (this.op === 'select') this.sel = cols;
    else this.returning = true;
    if (cols) this.sel = cols;
    return this;
  }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = rows; return this; }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this; }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) { this.op = 'upsert'; this.payload = rows; this.conflict = opts?.onConflict; return this; }
  delete() { this.op = 'delete'; return this; }

  eq(c: string, v: any) { this.filters.push((r) => get(r, c) === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => get(r, c) !== v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(get(r, c))); return this; }
  is(c: string, v: any) { this.filters.push((r) => (get(r, c) ?? null) === v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => get(r, c) >= v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => get(r, c) <= v); return this; }
  gt(c: string, v: any) { this.filters.push((r) => get(r, c) > v); return this; }
  lt(c: string, v: any) { this.filters.push((r) => get(r, c) < v); return this; }
  match(o: Row) { Object.entries(o).forEach(([c, v]) => this.eq(c, v)); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }

  private defaults(row: Row): Row {
    const now = new Date().toISOString();
    const base: Row = { created_at: now };
    if (!PK[this.table]) base.id = uid();
    if (this.table === 'causes') Object.assign(base, { status: 'review', verified: false, image_urls: [], emoji: '💙', cover_tint: '#CFE6FB' });
    if (this.table === 'contributions') Object.assign(base, { status: 'approved', method: 'mp', anonymous: false, confirmed_at: null });
    if (this.table === 'cause_edits') base.edited_at = now;
    return { ...base, ...row };
  }

  private withEmbeds(rows: Row[]): Row[] {
    const ems = embeds(this.sel);
    if (!ems.length) return rows.map((r) => ({ ...r }));
    let out = rows.map((r) => {
      const o: Row = { ...r };
      for (const { rel } of ems) {
        const fk = fkOf(rel);
        o[rel] = tableRows(rel).find((x) => x.id === r[fk]) ?? null;
      }
      return o;
    });
    for (const { rel, inner } of ems) if (inner) out = out.filter((o) => o[rel]);
    return out;
  }

  private run(): { data: any; error: any } {
    const rows = tableRows(this.table);
    const pass = (r: Row) => this.filters.every((f) => f(r));
    let result: Row[] = [];

    if (this.op === 'insert' || this.op === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => this.defaults(r));
      const keys = (this.conflict ?? PK[this.table] ?? 'id').split(',');
      for (const r of list) {
        const i = this.op === 'upsert' ? rows.findIndex((x) => keys.every((k) => x[k] === r[k])) : -1;
        if (i >= 0) Object.assign(rows[i], r);
        else rows.push(r);
      }
      result = list;
    } else if (this.op === 'update') {
      result = rows.filter(pass);
      result.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === 'delete') {
      result = rows.filter(pass);
      const keep = rows.filter((r) => !pass(r));
      rows.splice(0, rows.length, ...keep);
    } else {
      // Los filtros sobre columnas embebidas ("causes.owner_id") necesitan el join antes.
      result = this.withEmbeds(rows).filter(pass);
    }
    if (this.op !== 'select') {
      save();
      if (!this.returning) return { data: null, error: null };
      result = this.withEmbeds(result);
    }

    for (const { col, asc } of [...this.orders].reverse()) {
      result.sort((a, b) => {
        const x = get(a, col), y = get(b, col);
        if (x === y) return 0;
        return (x > y ? 1 : -1) * (asc ? 1 : -1);
      });
    }
    if (this.lim != null) result = result.slice(0, this.lim);
    if (this.mode === 'many') return { data: result, error: null };
    if (!result.length) {
      return this.mode === 'maybe'
        ? { data: null, error: null }
        : { data: null, error: { message: 'No se encontró la fila', code: 'PGRST116' } };
    }
    return { data: result[0], error: null };
  }

  then<A = any, B = never>(ok?: ((v: any) => A | PromiseLike<A>) | null, ko?: ((e: any) => B | PromiseLike<B>) | null) {
    let out;
    try {
      out = this.run();
    } catch (e: any) {
      out = { data: null, error: { message: String(e?.message ?? e) } };
    }
    return Promise.resolve(out).then(ok, ko);
  }
}

// ---------------------------------------------------------------- storage
// Lo que sube el visitante vive solo en esta pestaña (URL de blob). Las
// rutas de la semilla muestran una imagen de ejemplo.
const blobs = new Map<string, string>();
const placeholder = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#EEF2F6"/><text x="300" y="200" font-family="system-ui,sans-serif" font-size="26" fill="#7B8794" text-anchor="middle">${label}</text><text x="300" y="236" font-family="system-ui,sans-serif" font-size="16" fill="#9AA5B1" text-anchor="middle">Imagen de ejemplo de la demo</text></svg>`,
  )}`;
const urlFor = (path: string) => {
  const clean = path.split('?')[0];
  if (blobs.has(clean)) return blobs.get(clean)!;
  const name = clean.split('/').pop()?.replace(/\.\w+$/, '').replace(/-/g, ' ') ?? 'archivo';
  return placeholder(name.charAt(0).toUpperCase() + name.slice(1));
};

const storage = {
  from: (_bucket: string) => ({
    upload: async (path: string, body: ArrayBuffer | Blob, opts?: { contentType?: string }) => {
      try {
        const blob = body instanceof Blob ? body : new Blob([body], { type: opts?.contentType });
        blobs.set(path, URL.createObjectURL(blob));
      } catch {
        /* nada */
      }
      return { data: { path }, error: null };
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: urlFor(path) } }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: urlFor(path) }, error: null }),
    remove: async () => ({ data: null, error: null }),
  }),
};

// ---------------------------------------------------------------- auth
const user = () => ({ id: DEMO_USER_ID, email: DEMO_EMAIL, is_anonymous: false, user_metadata: {} });
const session = () => (signedIn() ? { user: user(), access_token: 'demo', refresh_token: 'demo' } : null);
const authListeners = new Set<(event: string, s: any) => void>();
const emit = (event: string) => authListeners.forEach((f) => f(event, session()));

const auth = {
  getSession: async () => ({ data: { session: session() }, error: null }),
  getUser: async () => ({ data: { user: signedIn() ? user() : null }, error: null }),
  signUp: async ({ options }: { options?: { data?: { full_name?: string } } }) => {
    const name = options?.data?.full_name;
    if (name) {
      const me = db().profiles.find((p) => p.id === DEMO_USER_ID);
      if (me) Object.assign(me, { full_name: name, display_name: name });
      save();
    }
    setSignedIn(true);
    emit('SIGNED_IN');
    return { data: { user: user(), session: session() }, error: null };
  },
  signInWithPassword: async () => {
    setSignedIn(true);
    emit('SIGNED_IN');
    return { data: { user: user(), session: session() }, error: null };
  },
  signOut: async () => {
    setSignedIn(false);
    emit('SIGNED_OUT');
    return { error: null };
  },
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
  setSession: async () => ({ data: { session: session() }, error: null }),
  updateUser: async ({ data }: { data?: { full_name?: string } } = {}) => {
    if (data?.full_name) {
      const me = db().profiles.find((p) => p.id === DEMO_USER_ID);
      if (me) Object.assign(me, { full_name: data.full_name });
      save();
    }
    return { data: { user: user() }, error: null };
  },
  onAuthStateChange: (fn: (event: string, s: any) => void) => {
    authListeners.add(fn);
    return { data: { subscription: { unsubscribe: () => authListeners.delete(fn) } } };
  },
};

export function createDemoClient() {
  return {
    from: (table: string) => new Query(table),
    rpc: async () => ({ data: null, error: null }),
    auth,
    storage,
    // Mercado Pago está apagado en el MVP: la demo responde que no hay pago.
    functions: { invoke: async () => ({ data: null, error: { message: 'En la demo no se procesan pagos reales.' } }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
}
