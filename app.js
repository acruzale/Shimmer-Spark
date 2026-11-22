/* Shimmer & Spark: store, organize and draw date ideas together. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants
  const CFG = window.DATE_VIALS_CONFIG || {};
  const LIVE = Boolean(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);

  const JARS = {
    // Colors from the Arcane palettes. `stops` is the liquid, top to bottom, banded like the character cards.
    outside: { name: 'Outside', short: 'Outside', color: '#2fd39a', hi: '#6ff0de', deep: '#0d3b2c',
      stops: ['#2fbf8a', '#6ff0de', '#d4fff6', '#0a8a40', '#0d3b2c'], vibes: ['chill', 'hiking', 'active', 'daytrip'] },
    indoor:  { name: 'Indoor', short: 'Indoor', color: '#4f7bff', hi: '#a9c4ff', deep: '#18206e',
      stops: ['#4a5fb5', '#8aa0ff', '#dce6ff', '#1f4fa0', '#18206e'], vibes: ['leisure', 'indoor-active'] },
    home:    { name: 'Staying Home', short: 'Home', color: '#f47cf6', hi: '#ffc8fb', deep: '#3d1c45',
      stops: ['#e8186f', '#f47cf6', '#ffdcfb', '#8a0030', '#3d1c45'], vibes: ['cozy', 'culinary', 'projects'] },
  };
  const VIBES = {
    chill:           { name: 'Chill & relaxed', color: '#e3a948' }, // The Last Drop sign
    hiking:          { name: 'Hiking', color: '#7fdc5f' }, // hoverboard streaks
    active:          { name: 'Active', color: '#a63bf2' }, // shimmer vial
    daytrip:         { name: 'Day trips', color: '#3f7cc4' }, // Jinx's hair
    leisure:         { name: 'Leisure & entertainment', color: '#6a52b0' }, // Caitlyn's top
    'indoor-active': { name: 'Active & interactive', color: '#4f49c8' }, // the starry void
    cozy:            { name: 'Chill & cozy', color: '#c23a5a' }, // Vi's hair
    culinary:        { name: 'Culinary', color: '#d89a5c' }, // Mel's gold
    projects:        { name: 'Projects', color: '#f0cf72' }, // Heimerdinger's hair
  };
  // Banner pictures live in assets/vibes/<vibe>.jpg (and <jar>.jpg for "Any vibe"). Missing ones are skipped.
  // VIBE_FOCUS picks which part of a picture stays in view when it is cropped to the banner.
  // VIBE_LIFT brightens pictures that are too dark under the banner's fade.
  // Bump PICS_VERSION whenever a picture file is replaced, so phones load the new one.
  const PICS_VERSION = 4;
  const VIBE_LIFT = { cozy: 1.6, 'plans-coming': 1.35 };
  const VIBE_FOCUS = { chill: '50% 50%', hiking: '42% 55%', active: '55% 50%', daytrip: '47% 100%', leisure: '55% 30%', 'indoor-active': '50% 40%', cozy: '62% 50%', culinary: '62% 40%', projects: '50% 35%', outside: '42% 45%', indoor: '50% 45%', home: '48% 30%', 'plans-coming': '50% 30%', 'plans-both': '50% 40%', 'plans-theirs': '50% 40%', 'plans-waiting': '50% 45%', 'plans-memories': '50% 45%', us: '45% 40%' };
  // Where each vial hangs on the photo's string of lights (picture coordinates, 1500 x 1000).
  const VIAL_POS = { outside: { x: 600, wire: 30 }, indoor: { x: 750, wire: 62 }, home: { x: 900, wire: 38 } };
  const stringY = (x) => 75 + (x - 600) * 0.173; // traced from the photo's light string between x 600 and 900

  const STARTERS = [
    ['outside', 'chill', 'Sunset picnic with a playlist', 'Pack cheese, fruit and a speaker. Find a spot facing west.'],
    ['outside', 'chill', 'Stargazing with blankets and cocoa', 'Check the cloud forecast first. A star app helps name what you see.'],
    ['outside', 'hiking', 'Sunrise hike to a viewpoint', 'Leave in the dark with headlamps and bring coffee in a flask.'],
    ['outside', 'hiking', 'Waterfall trail and a packed lunch', ''],
    ['outside', 'active', 'Outdoor ice skating', 'Look for a seasonal rink nearby. Hot drinks after.'],
    ['outside', 'active', 'Rent bikes and explore a new neighborhood', ''],
    ['outside', 'daytrip', 'Day trip to a small town nearby', 'Pick a town neither of you has been to. Wander, find lunch, take one photo per hour.'],
    ['outside', 'daytrip', 'Farmers market, then a lake swim', ''],
    ['indoor', 'leisure', 'Board game café afternoon', 'Each of you picks one game the other has never played.'],
    ['indoor', 'leisure', 'Cozy café crawl', 'Three cafés, one pastry each. Rate them.'],
    ['indoor', 'leisure', 'Late film at an old cinema', ''],
    ['indoor', 'indoor-active', 'Bouldering session', 'Beginner-friendly gyms rent shoes.'],
    ['indoor', 'indoor-active', 'Pottery or painting class', ''],
    ['indoor', 'indoor-active', 'Escape room', ''],
    ['home', 'cozy', 'Blanket fort movie marathon', 'Fairy lights, pillows and a whole trilogy.'],
    ['home', 'cozy', 'Candlelit puzzle night', 'A 1000-piece puzzle and a slow playlist.'],
    ['home', 'culinary', 'Fresh pasta from scratch', 'Flour, eggs, a rolling pin and patience.'],
    ['home', 'culinary', "Cook a dish from each other's childhood", ''],
    ['home', 'projects', 'Build a terrarium together', ''],
    ['home', 'projects', 'Scrapbook of our dates so far', 'Print photos, tickets and notes from the vials.'],
  ];

  // ---------------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => isoOf(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d); };
  const fmtDate = (iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, opts);
  const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m || 0); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const firstUrl = (text) => (String(text || '').match(/https?:\/\/[^\s<>"']+/) || [])[0] || '';

  // Google Maps links: full ones (google.com/maps/...) and the short ones the app shares (maps.app.goo.gl/...).
  const isMapsUrl = (u) => /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(String(u || ''));
  // Full links carry the place name (…/maps/place/Board+Game+Cafe/…); short links don't.
  function placeFromMapsUrl(u) {
    const m = String(u || '').match(/\/maps\/place\/([^/@?]+)/i);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim().slice(0, 140); } catch { return ''; }
  }

  function mediaInfo(url) {
    const u = String(url || '');
    let m = u.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    if (m) {
      const k = m[1].toLowerCase();
      const kind = k === 'p' ? 'p' : k === 'tv' ? 'tv' : 'reel';
      return { site: 'Instagram', embed: `https://www.instagram.com/${kind}/${m[2]}/embed/` };
    }
    m = u.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
    if (m) return { site: 'TikTok', embed: `https://www.tiktok.com/embed/v2/${m[1]}` };
    m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return { site: 'YouTube', embed: `https://www.youtube-nocookie.com/embed/${m[1]}` };
    return null;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  async function resizeImage(file, max = 1000) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
    } finally { URL.revokeObjectURL(url); }
  }
  const blobToDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

  // ---------------------------------------------------------------- stores
  const blankIdea = (f, me) => ({
    id: uid(), title: '', notes: '', link: '', place: '', maps_url: '', deadline: null, jar: 'home', vibe: 'cozy', cover_url: null,
    interested: [], status: 'open', planned_for: null, planned_time: null,
    created_by: me, created_at: new Date().toISOString(), ...f,
  });

  class LocalStore {
    constructor() { this.key = 'date-vials-demo-v1'; this.listeners = new Set(); }
    async start() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(this.key)); } catch { /* storage unavailable */ }
      if (!data || !Array.isArray(data.ideas)) data = this.seed();
      this.data = data; this.save();
      return 'ready';
    }
    seed() {
      const Y = 'u-you', P = 'u-partner';
      const who = { 0: [Y, P], 2: [Y], 4: [P], 8: [Y, P], 9: [Y], 12: [Y, P], 14: [P], 16: [Y, P], 18: [Y] };
      const ideas = STARTERS.map(([jar, vibe, title, notes], i) => blankIdea({ jar, vibe, title, notes, interested: who[i] || [] }, i % 2 ? P : Y));
      Object.assign(ideas[8], { status: 'planned', planned_for: today(), planned_time: '15:00', place: 'The board game café downtown' });
      Object.assign(ideas[12], { status: 'planned', planned_for: addDays(today(), 6) });
      Object.assign(ideas[16], { status: 'done', planned_for: addDays(today(), -9) });
      return { meId: Y, members: [{ user_id: Y, display_name: 'You' }, { user_id: P, display_name: 'Partner' }], space: { name: 'Shimmer & Spark', invite_code: 'DEMO42' }, ideas };
    }
    save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch { toast('This browser could not save. Try a smaller picture.'); } }
    emit() { this.save(); this.listeners.forEach((f) => f()); }
    onChange(f) { this.listeners.add(f); }
    get ideas() { return this.data.ideas; }
    get members() { return this.data.members; }
    get space() { return this.data.space; }
    get meId() { return this.data.meId; }
    find(id) { return this.data.ideas.find((i) => i.id === id); }
    async add(f) { const idea = blankIdea(f, this.meId); this.data.ideas.unshift(idea); this.emit(); return idea; }
    async update(id, patch) { Object.assign(this.find(id) || {}, patch); this.emit(); }
    async remove(id) { this.data.ideas = this.data.ideas.filter((i) => i.id !== id); this.emit(); }
    async setInterest(id, on) {
      const i = this.find(id); if (!i) return;
      const s = new Set(i.interested); on ? s.add(this.meId) : s.delete(this.meId);
      i.interested = [...s]; this.emit();
    }
    async uploadCover(blob) { return blobToDataURL(blob); }
    async rename(name) { const m = this.members.find((x) => x.user_id === this.meId); m.display_name = name; this.emit(); }
    async addStarters() { STARTERS.forEach(([jar, vibe, title, notes]) => this.data.ideas.push(blankIdea({ jar, vibe, title, notes }, this.meId))); this.emit(); }
    switchUser() { this.data.meId = this.members.find((m) => m.user_id !== this.meId).user_id; this.emit(); }
    reset() { try { localStorage.removeItem(this.key); } catch { /* ignore */ } location.reload(); }
  }

  class SupaStore {
    constructor() {
      this.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      this.listeners = new Set(); this.ideas = []; this.members = []; this.space = null; this.user = null; this.spaceId = null;
    }
    onChange(f) { this.listeners.add(f); }
    emit() { this.listeners.forEach((f) => f()); }
    get meId() { return this.user?.id; }
    find(id) { return this.ideas.find((i) => i.id === id); }
    async start() {
      const { data } = await this.sb.auth.getSession();
      this.user = data.session?.user || null;
      if (!this.user) return 'signin';
      return (await this.loadSpace()) ? 'ready' : 'space';
    }
    async googleEnabled() {
      try {
        const r = await fetch(CFG.SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: CFG.SUPABASE_ANON_KEY } });
        return Boolean((await r.json()).external?.google);
      } catch { return false; }
    }
    async signInWithGoogle() {
      const { error } = await this.sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error; // on success the browser leaves for Google and comes back signed in
    }
    async signIn(email, password, create) {
      const { data, error } = create
        ? await this.sb.auth.signUp({ email, password })
        : await this.sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error('Account created, but Supabase still wants an email confirmation. Turn off "Confirm email" in Supabase, then sign in.');
      this.user = data.user;
      return (await this.loadSpace()) ? 'ready' : 'space';
    }
    async loadSpace() {
      const { data, error } = await this.sb.from('members').select('space_id').eq('user_id', this.user.id).limit(1);
      if (error) throw error;
      if (!data.length) return false;
      this.spaceId = data[0].space_id;
      await this.refresh(); this.subscribe();
      return true;
    }
    async refresh() {
      const [s, m, i] = await Promise.all([
        this.sb.from('spaces').select('*').eq('id', this.spaceId).single(),
        this.sb.from('members').select('*').eq('space_id', this.spaceId).order('joined_at'),
        this.sb.from('ideas').select('*').eq('space_id', this.spaceId).order('created_at', { ascending: false }),
      ]);
      for (const r of [s, m, i]) if (r.error) throw r.error;
      this.space = s.data; this.members = m.data; this.ideas = i.data;
      this.emit();
    }
    subscribe() {
      if (this.channel) return;
      this.channel = this.sb.channel('ideas-' + this.spaceId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas', filter: `space_id=eq.${this.spaceId}` }, (p) => {
          if (p.eventType === 'DELETE') this.ideas = this.ideas.filter((x) => x.id !== p.old.id);
          else this.upsert(p.new);
          this.emit();
        })
        .subscribe();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.refresh().catch(() => {}); });
    }
    upsert(row) {
      const at = this.ideas.findIndex((x) => x.id === row.id);
      if (at >= 0) this.ideas[at] = row; else this.ideas.unshift(row);
    }
    async createSpace(name, display) {
      const { data, error } = await this.sb.rpc('create_space', { p_name: name, p_display: display });
      if (error) throw error;
      this.spaceId = data.id; await this.refresh(); this.subscribe();
    }
    async joinSpace(code, display) {
      const { data, error } = await this.sb.rpc('join_space', { p_code: code, p_display: display });
      if (error) throw error;
      this.spaceId = data; await this.refresh(); this.subscribe();
    }
    async add(f) {
      const row = { title: f.title, notes: f.notes || '', link: f.link || '', place: f.place || '', maps_url: f.maps_url || '', deadline: f.deadline || null, jar: f.jar, vibe: f.vibe, cover_url: f.cover_url || null, interested: f.interested || [], space_id: this.spaceId };
      const { data, error } = await this.sb.from('ideas').insert(row).select().single();
      if (error) throw error;
      this.upsert(data); this.emit(); return data;
    }
    async update(id, patch) {
      const { data, error } = await this.sb.from('ideas').update(patch).eq('id', id).select().single();
      if (error) throw error;
      this.upsert(data); this.emit();
    }
    async remove(id) {
      const { error } = await this.sb.from('ideas').delete().eq('id', id);
      if (error) throw error;
      this.ideas = this.ideas.filter((x) => x.id !== id); this.emit();
    }
    async setInterest(id, on) {
      const { data, error } = await this.sb.rpc('set_interest', { p_idea: id, p_on: on });
      if (error) throw error;
      const i = this.find(id); if (i) { i.interested = data || []; this.emit(); }
    }
    async uploadCover(blob) {
      const path = `${this.spaceId}/${uid()}.jpg`;
      const { error } = await this.sb.storage.from('covers').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      return this.sb.storage.from('covers').getPublicUrl(path).data.publicUrl;
    }
    async rename(name) {
      const { error } = await this.sb.from('members').update({ display_name: name }).eq('space_id', this.spaceId).eq('user_id', this.user.id);
      if (error) throw error;
      await this.refresh();
    }
    async addStarters() {
      const rows = STARTERS.map(([jar, vibe, title, notes]) => ({ jar, vibe, title, notes, space_id: this.spaceId }));
      const { error } = await this.sb.from('ideas').insert(rows);
      if (error) throw error;
      await this.refresh();
    }
    async signOut() { await this.sb.auth.signOut(); location.reload(); }
  }

  const store = LIVE ? new SupaStore() : new LocalStore();

  // ---------------------------------------------------------------- derived
  const me = () => store.members.find((m) => m.user_id === store.meId) || { user_id: store.meId, display_name: 'You' };
  const partner = () => store.members.find((m) => m.user_id !== store.meId) || null;
  const nameOf = (id) => store.members.find((m) => m.user_id === id)?.display_name || 'Someone';
  const isIn = (idea, id) => (idea.interested || []).includes(id);
  const meIn = (idea) => isIn(idea, store.meId);
  const partnerIn = (idea) => { const p = partner(); return p ? isIn(idea, p.user_id) : false; };
  const bothIn = (idea) => store.members.length >= 2 && store.members.every((m) => isIn(idea, m.user_id));
  const openIdeas = (jar) => store.ideas.filter((i) => i.status !== 'done' && (!jar || i.jar === jar));

  // ---------------------------------------------------------------- vial art
  // Shimmer vial, after the Arcane concept art: weathered leather cap with a brass rim, hinge clasp and an
  // octagonal window; a clear glass tube with a brass spine (Y under the cap, a fork at the base);
  // stacked brass coils; a chamfered base with hex bolts. Drawn in local units, hook ring at the top (y≈15).
  const polygon = (sides, cx, cy, r, rot = 0) => Array.from({ length: sides }, (_, n) => {
    const a = rot + (n * 2 * Math.PI) / sides;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  const VIAL_TUBE = { top: 62, height: 104 }; // the inside of the glass the liquid can fill
  function vialMarkup(jar, pfx) {
    const J = JARS[jar];
    const B = `url(#${pfx}brass)`, BV = `url(#${pfx}brassv)`, L = `url(#${pfx}leather)`;
    const dur = (3 + Math.random() * 2).toFixed(2);
    const hexBolt = (cx, cy, r) => `<polygon points="${polygon(6, cx, cy, r, Math.PI / 6)}" fill="${B}" stroke="#2a1d10" stroke-width=".8"/>
      <polygon points="${polygon(6, cx, cy, r * .55, Math.PI / 6)}" fill="none" stroke="#5a421d" stroke-width=".8"/>`;
    const coils = [0, 1, 2, 3].map((n) => `<rect x="-21" y="${(169 + n * 4.6).toFixed(1)}" width="42" height="3.4" rx="1.7" fill="${BV}"/>`).join('');
    return `
      <defs>
        <linearGradient id="${pfx}brass" x1="0" x2="1"><stop offset="0" stop-color="#5a421d"/><stop offset=".38" stop-color="#f1d79a"/><stop offset=".68" stop-color="#b38a44"/><stop offset="1" stop-color="#4d3818"/></linearGradient>
        <linearGradient id="${pfx}brassv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dca0"/><stop offset=".5" stop-color="#c49a52"/><stop offset="1" stop-color="#6b4f22"/></linearGradient>
        <linearGradient id="${pfx}leather" x1="0" x2="1"><stop offset="0" stop-color="#1d130d"/><stop offset=".3" stop-color="#4e3729"/><stop offset=".62" stop-color="#36261c"/><stop offset="1" stop-color="#170f0a"/></linearGradient>
        <linearGradient id="${pfx}glass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".22" stop-color="#fff" stop-opacity=".03"/><stop offset=".78" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
        <linearGradient id="${pfx}liq" x1="0" y1="0" x2="0" y2="1">${J.stops.map((c, n) => `<stop offset="${(n / (J.stops.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('')}</linearGradient>
        <linearGradient id="${pfx}side" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".28" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>
        <linearGradient id="${pfx}shim" x1="0" y1="0" x2="0" y2="1" spreadMethod="reflect" gradientUnits="objectBoundingBox">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
          <animateTransform attributeName="gradientTransform" type="translate" values="0 -1;0 1" dur="${(4 + Math.random() * 2).toFixed(2)}s" repeatCount="indefinite"/>
        </linearGradient>
        <radialGradient id="${pfx}aura"><stop offset="0" stop-color="${J.color}" stop-opacity=".7"/><stop offset=".45" stop-color="${J.color}" stop-opacity=".22"/><stop offset="1" stop-color="${J.color}" stop-opacity="0"/></radialGradient>
        <clipPath id="${pfx}clip"><rect id="${pfx}level" x="-16" y="${VIAL_TUBE.top}" width="32" height="${VIAL_TUBE.height}" rx="3"/></clipPath>
      </defs>
      <ellipse cx="0" cy="112" rx="95" ry="120" fill="url(#${pfx}aura)"><animate attributeName="opacity" values=".55;1;.55" dur="${dur}s" repeatCount="indefinite"/></ellipse>

      <!-- hook ring and hinge clasp -->
      <circle cx="0" cy="19" r="4.5" fill="none" stroke="${B}" stroke-width="2.4"/>
      <rect x="10" y="20" width="9" height="5" rx="1.2" fill="${B}" stroke="#3a2a14" stroke-width=".6"/>
      <circle cx="12.5" cy="22.5" r="1.1" fill="#3a2a14"/>

      <!-- glass tube (drawn first so the cap and base sit over its ends) -->
      <rect x="-19" y="56" width="38" height="114" rx="5" fill="rgba(16,18,34,.55)"/>
      <g clip-path="url(#${pfx}clip)">
        <rect id="${pfx}liquid" x="-16" y="${VIAL_TUBE.top}" width="32" height="${VIAL_TUBE.height}" fill="url(#${pfx}liq)"/>
        <rect x="-16" y="${VIAL_TUBE.top}" width="32" height="${VIAL_TUBE.height}" fill="url(#${pfx}side)"/>
        <rect x="-16" y="${VIAL_TUBE.top}" width="32" height="${VIAL_TUBE.height}" fill="url(#${pfx}shim)" opacity=".26"/>
        <ellipse id="${pfx}surface" cx="0" cy="${VIAL_TUBE.top}" rx="16" ry="3.2" fill="${J.stops[2]}" opacity=".9"/>
        <circle cx="-7" cy="160" r="2" fill="${J.hi}"><animate attributeName="cy" values="162;72" dur="3.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.9;0" dur="3.4s" repeatCount="indefinite"/></circle>
        <circle cx="6" cy="160" r="1.5" fill="${J.hi}"><animate attributeName="cy" values="162;76" dur="4.6s" begin="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;0" dur="4.6s" begin="1.2s" repeatCount="indefinite"/></circle>
      </g>
      <rect class="vial-glass" x="-19" y="56" width="38" height="114" rx="5" fill="url(#${pfx}glass)" stroke="rgba(255,255,255,.24)" stroke-width="1"/>
      <rect x="-15" y="64" width="2.8" height="96" rx="1.4" fill="rgba(255,255,255,.3)"/>
      <rect x="11.5" y="70" width="1.4" height="84" rx=".7" fill="rgba(255,255,255,.14)"/>

      <!-- brass spine: a Y under the cap, a fork into the coils -->
      <path d="M-15 57 L0 71 L15 57" fill="none" stroke="${B}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
      <line x1="0" y1="71" x2="0" y2="153" stroke="${B}" stroke-width="2.2"/>
      <path d="M-16 169 L0 153 L16 169" fill="none" stroke="${B}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>

      <!-- cap: brass rim, weathered leather band, wraps, octagonal window -->
      <rect x="-22" y="24" width="44" height="6.5" rx="3" fill="${BV}" stroke="#3a2a14" stroke-width=".6"/>
      <rect x="-23" y="29.5" width="46" height="28" rx="3" fill="${L}" stroke="#0e0906" stroke-width=".8"/>
      <ellipse cx="-11" cy="44" rx="7" ry="5" fill="#000" opacity=".16"/><ellipse cx="13" cy="37" rx="5" ry="3.5" fill="#000" opacity=".14"/>
      <rect x="-23" y="33" width="46" height="2.2" rx="1.1" fill="${B}"/>
      <path d="M-23 53.5 Q0 48.5 23 53.5" fill="none" stroke="${B}" stroke-width="2.2"/>
      <polygon points="${polygon(8, 0, 43, 7.4, Math.PI / 8)}" fill="${B}" stroke="#2a1d10" stroke-width=".8"/>
      <polygon points="${polygon(8, 0, 43, 4.8, Math.PI / 8)}" fill="#1b2a33"/>
      <path d="M-2.6 40.6 L1.6 39.8" stroke="rgba(255,255,255,.55)" stroke-width="1.1" stroke-linecap="round"/>

      <!-- stacked brass coils -->
      <rect x="-20" y="168" width="40" height="19" fill="#1a110a"/>
      ${coils}

      <!-- chamfered base with hex bolts -->
      <path d="M-17 187 H17 L21 191 V203 L17 207 H-17 L-21 203 V191 Z" fill="${L}" stroke="#0e0906" stroke-width=".8"/>
      <ellipse cx="9" cy="200" rx="6" ry="3" fill="#000" opacity=".15"/>
      ${hexBolt(0, 197, 4.4)}
      ${hexBolt(-21.5, 196, 3)}
      ${hexBolt(21.5, 196, 3)}`;
  }
  function setVialLevel(pfx, count) {
    const r = document.getElementById(pfx + 'level'); if (!r) return;
    const lvl = 0.94; // always nearly full: the vials are for choosing, not counting (count is unused)
    const h = VIAL_TUBE.height * lvl;
    const y = VIAL_TUBE.top + VIAL_TUBE.height - h;
    r.setAttribute('y', String(y)); r.setAttribute('height', String(h));
    // Stretch the banded gradient over the liquid that shows, so every colour band stays visible.
    const liq = document.getElementById(pfx + 'liquid');
    if (liq) { liq.setAttribute('y', String(y)); liq.setAttribute('height', String(h)); }
    document.getElementById(pfx + 'surface')?.setAttribute('cy', String(y)); // the liquid's surface ellipse
  }

  function buildVials() {
    const svg = $('#vials');
    svg.innerHTML = Object.entries(VIAL_POS).map(([k, p], i) => {
      const y = stringY(p.x);
      return `<g transform="translate(${p.x} ${y.toFixed(1)})"><g class="vial-scale">
        <g class="vial-hit" data-jar="${k}" tabindex="0" role="button" aria-label="${esc(JARS[k].name)} vial: draw a date">
          <animateTransform attributeName="transform" type="rotate" values="-2.4 0 0;2.4 0 0;-2.4 0 0" dur="${(5.2 + i * 0.9).toFixed(1)}s" repeatCount="indefinite"/>
          <rect x="-62" y="0" width="124" height="${p.wire + 262}" fill="transparent"/>
          <line x1="0" y1="0" x2="0" y2="${p.wire}" stroke="#2b241c" stroke-width="2.2"/>
          <circle cx="0" cy="0" r="3" fill="#3b3024"/>
          <g transform="translate(0 ${p.wire - 15})">${vialMarkup(k, 'v' + k)}</g>
          <text class="vial-label" x="0" y="${p.wire + 222}" text-anchor="middle" font-size="19" fill="#f4e6c8" stroke="rgba(0,0,0,.75)" stroke-width="4" paint-order="stroke">${esc(JARS[k].short)}</text>
        </g></g></g>`;
    }).join('');
    $$('.vial-hit', svg).forEach((g) => {
      const open = () => openSheet('draw', { jar: g.dataset.jar, vibe: 'any', bothOnly: false, resultId: null });
      g.addEventListener('click', open);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }
  function updateVials() {
    for (const k of Object.keys(JARS)) setVialLevel('v' + k, 0);
    layoutVials();
  }
  // On wide, short screens the picture scales up to fill the width, which would make the vials hang down
  // over the title. Shrink them around their hook (they stay on the string) so they end above the title.
  // Installed iPhone app (picture behind the status bar): iOS reports the screen shorter by the status bar's
  // height, so the menu floats up. Measure what's missing and let the CSS move bottom-pinned things down.
  let iosGap = 0;
  function measureIosGap() {
    const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let gap = 0;
    if (standalone && isIOS) {
      const portrait = innerHeight >= innerWidth;
      const fullHeight = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      gap = Math.round(fullHeight - innerHeight);
      if (gap < 0 || gap > 80) gap = 0; // only correct a status-bar-sized gap
    }
    iosGap = gap;
    document.documentElement.style.setProperty('--ios-gap', gap + 'px');
  }
  function layoutVials() {
    const svg = $('#vials'); const copy = $('#homeCopy');
    if (!svg || !copy) return;
    const k = Math.max(innerWidth / 1500, (innerHeight + iosGap) / 1000); // picture scale (cover, anchored to the top)
    const copyTop = copy.getBoundingClientRect().top;
    const hookY = 120 * k;          // the lowest hook on the string, in screen pixels
    const vialH = (62 + 250) * k;   // longest wire + vial + label, in screen pixels
    const room = copyTop - 14 - hookY;
    const s = Math.max(0.45, Math.min(1, room / vialH));
    $$('.vial-scale', svg).forEach((g) => g.setAttribute('transform', `scale(${s.toFixed(3)})`));
  }

  // ---------------------------------------------------------------- fireflies
  function startFireflies() {
    const cv = $('#fireflies'); const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d'); const g = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.15, 'rgba(255,232,140,.9)'); g.addColorStop(0.45, 'rgba(214,232,110,.25)'); g.addColorStop(1, 'rgba(200,230,100,0)');
    sg.fillStyle = g; sg.fillRect(0, 0, 64, 64);
    let W, H, dpr, flies = [];
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, Math.max(26, (W * H) / 16000)));
      flies = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: H * (0.15 + Math.random() * 0.8),
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.2,
        ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.4, r: 10 + Math.random() * 16, wob: Math.random() * 1000,
      }));
    }
    resize(); addEventListener('resize', resize);
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(50, now - last) / 16.7; last = now;
      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      for (const f of flies) {
        if (!reduce) {
          f.vx += Math.sin(t * 0.7 + f.wob) * 0.006; f.vy += Math.cos(t * 0.5 + f.wob * 1.3) * 0.006;
          f.vx = Math.max(-0.45, Math.min(0.45, f.vx)); f.vy = Math.max(-0.35, Math.min(0.35, f.vy));
          f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20;
          if (f.y < H * 0.08) f.vy += 0.02; if (f.y > H + 20) f.y = H * 0.4;
        }
        const pulse = reduce ? 0.6 : Math.pow((Math.sin(t * f.sp + f.ph) + 1) / 2, 2.2);
        ctx.globalAlpha = 0.15 + pulse * 0.85;
        const s = f.r * (0.7 + pulse * 0.5);
        ctx.drawImage(sprite, f.x - s, f.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      if (!reduce) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- views
  // The menu shows which card is open: Vials (the home scene and vial cards), Plans or Us.
  function setDock(tab) {
    $$('.dock-btn').forEach((b) => { if (b.dataset.view === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }

  // Previous dates: the day you went (older entries only have the planned day).
  const wentOnDate = (i) => i.done_on || i.planned_for || null;

  // Deadlines: the last day an event is on (a seasonal rink, an exhibition).
  const daysUntil = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000);
  const hasLiveDeadline = (i) => Boolean(i.deadline) && i.status !== 'done' && daysUntil(i.deadline) >= 0;
  const isExpired = (i) => Boolean(i.deadline) && i.status !== 'done' && daysUntil(i.deadline) < 0;
  function deadlineText(i, long = false) {
    const n = daysUntil(i.deadline);
    const day = fmtDate(i.deadline, long ? { weekday: 'short', month: 'long', day: 'numeric' } : { month: 'short', day: 'numeric' });
    if (n < 0) return `Ended ${day}`;
    if (n === 0) return 'Ends today';
    if (n === 1) return 'Ends tomorrow';
    return long ? `Ends ${day} · ${n} days left` : `Ends ${day}`;
  }
  const deadlineTag = (i) => (i.deadline && i.status !== 'done')
    ? `<span class="deadline-tag${daysUntil(i.deadline) <= 7 ? ' soon' : ''}${isExpired(i) ? ' past' : ''}">${esc(deadlineText(i))}</span>` : '';
  // The two of you as name pills, lit when that person is in.
  function whoPills(idea) {
    const p = partner();
    const pill = (name, on) => `<span class="who-pill${on ? ' on' : ''}">${on ? '✓ ' : ''}${esc(name)}</span>`;
    return `<span class="who-pills">${pill(me().display_name, meIn(idea))}${p ? pill(p.display_name, partnerIn(idea)) : ''}</span>`;
  }

  function vibeChip(vibe, extra = '') {
    const V = VIBES[vibe] || { name: vibe, color: '#c9a15a' };
    return `<span class="vibe-tag" style="--c:${V.color}" ${extra}>${esc(V.name)}</span>`;
  }
  function whoDots(idea) {
    const p = partner();
    return `<span class="who" title="${esc(me().display_name)}${meIn(idea) ? ' is in' : ''}${p ? ' · ' + esc(p.display_name) + (partnerIn(idea) ? ' is in' : '') : ''}"><i class="${meIn(idea) ? 'on' : ''}"></i><i class="${partnerIn(idea) ? 'on' : ''}"></i></span>`;
  }
  function thumbHTML(idea) {
    if (idea.cover_url) return `<img class="thumb" src="${esc(idea.cover_url)}" alt="" loading="lazy">`;
    return `<span class="thumb note" aria-hidden="true">${esc((idea.title || '?').trim().charAt(0).toUpperCase())}</span>`;
  }
  function cardHTML(idea, { plan = false, deadline = false, memory = false } = {}) {
    const V = VIBES[idea.vibe] || { color: '#c9a15a' };
    const dateBlock = (iso, cls = '') => `<span class="plan-date${cls}"><span class="d">${new Date(iso + 'T12:00:00').getDate()}</span><span class="m">${esc(fmtDate(iso, { month: 'short' }))}</span></span>`;
    if (memory) {
      const went = wentOnDate(idea);
      return `<button class="card plan memory-card" style="--c:${V.color}" data-open-idea="${esc(idea.id)}">
        ${went ? dateBlock(went, ' went') : thumbHTML(idea)}
        <span class="card-body">
          <span class="card-title">${esc(idea.title)}</span>
          <span class="card-meta">${vibeChip(idea.vibe)}${went ? `<span>${esc(fmtDate(went, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }))}</span>` : ''}</span>
          ${idea.memory ? `<span class="memory-snippet">“${esc(idea.memory.length > 110 ? idea.memory.slice(0, 107) + '…' : idea.memory)}”</span>` : '<span class="muted small">Tap to add a memory</span>'}
        </span>
      </button>`;
    }
    const left = deadline && idea.deadline ? dateBlock(idea.deadline, ' ends')
      : plan && idea.planned_for ? dateBlock(idea.planned_for)
      : thumbHTML(idea);
    if (deadline) {
      return `<button class="card plan" style="--c:${V.color}" data-open-idea="${esc(idea.id)}">
        ${left}
        <span class="card-body">
          <span class="card-title">${esc(idea.title)}</span>
          <span class="card-meta">${deadlineTag(idea)}${idea.status === 'planned' && idea.planned_for ? `<span class="planned-tag">Going ${esc(fmtDate(idea.planned_for))}</span>` : ''}</span>
          ${whoPills(idea)}
        </span>
      </button>`;
    }
    const site = mediaInfo(idea.link)?.site;
    let tag = '';
    if (idea.status === 'planned' && idea.planned_for) tag = `<span class="planned-tag">${esc(fmtDate(idea.planned_for))}${idea.planned_time ? ' · ' + esc(fmtTime(idea.planned_time)) : ''}</span>`;
    else if (idea.status === 'done') tag = '<span class="muted">Done</span>';
    else if (bothIn(idea)) tag = '<span class="both">Both in</span>';
    return `<button class="card${plan ? ' plan' : ''}" style="--c:${V.color}" data-open-idea="${esc(idea.id)}">
      ${left}
      <span class="card-body">
        <span class="card-title">${esc(idea.title)}</span>
        <span class="card-meta">${vibeChip(idea.vibe)}${idea.place ? `<span>${esc(idea.place)}</span>` : ''}${site ? `<span>${site}</span>` : ''}</span>
        <span class="card-meta">${whoDots(idea)}${tag}${deadlineTag(idea)}</span>
      </span>
    </button>`;
  }

  // A card's top: a sticky bar (tabs, or a title once scrolled) over a hero picture banner.
  const picUrl = (pic) => `assets/vibes/${pic}.jpg?v=${PICS_VERSION}`;
  function bannerImg(pic) {
    if (!pic) return '';
    return `<img src="${picUrl(pic)}" alt="" style="object-position:${VIBE_FOCUS[pic] || '50% 50%'};${VIBE_LIFT[pic] ? `filter:brightness(${VIBE_LIFT[pic]}) saturate(1.1)` : ''}" onerror="this.remove()">`;
  }
  function cardTop({ pic, color, tabs = '', headTitle = '', title, titleColor, sub }) {
    return `<div class="sheet-head" style="${pic ? `--head-img:url('${picUrl(pic)}');` : ''}--c:${color}">
        ${tabs}${headTitle ? `<span class="head-title">${esc(headTitle)}</span>` : ''}
      </div>
      <div class="vibe-banner" style="--c:${color}">
        ${bannerImg(pic)}
        <h2 class="sheet-title" style="color:${titleColor || 'var(--brass-hi)'}">${esc(title)}</h2>
        ${sub ? `<p class="sheet-sub">${esc(sub)}</p>` : ''}
      </div>`;
  }
  // Slide the banner up under the sticky bar, so the picture fills the card's top edge.
  function mountCardTop(body) {
    const head = $('.sheet-head', body); const banner = $('.vibe-banner', body);
    if (!head || !banner) return;
    const row = $('.vial-tabs', head); const on = row && $('.vial-tab[aria-selected="true"]', row);
    if (on && on.offsetLeft + on.offsetWidth > row.clientWidth - 70) row.scrollLeft = Math.max(0, on.offsetLeft - 24); // only when it's out of sight
    const gap = parseFloat(getComputedStyle(body).rowGap) || 0;
    banner.style.marginTop = `-${head.offsetHeight + gap}px`;
    banner.style.minHeight = `${head.offsetHeight + 170}px`;
    updateStuck(body);
  }
  // Once the picture has scrolled away, the bar fills with a blurred copy of it.
  function updateStuck(body) {
    const head = $('.sheet-head', body); const banner = $('.vibe-banner', body);
    if (!head || !banner) return;
    head.classList.toggle('is-stuck', body.scrollTop > banner.offsetHeight - head.offsetHeight * 2);
  }
  // Swipe left or right on a banner to step through tabs.
  function bindSwipe(el, step) {
    let touch = null;
    el.addEventListener('touchstart', (e) => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (!touch) return; const t = e.changedTouches[0];
      const dx = t.clientX - touch.x, dy = t.clientY - touch.y; touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  function tabsHTML(items, current) {
    return `<div class="vial-tabs" role="tablist">${items.map((t) => `<button type="button" role="tab" class="vial-tab" style="--c:${t.color}" data-tab="${t.key}" aria-selected="${t.key === current}" tabindex="${t.key === current ? 0 : -1}">${esc(t.label)}${t.count ? `<span class="tab-count">${t.count}</span>` : ''}</button>`).join('')}</div>`;
  }
  function bindTabs(body, keys, current, go) {
    const step = (dir) => { const k = keys[keys.indexOf(current) + dir]; if (k) go(k); };
    $$('.vial-tab', body).forEach((t) => t.addEventListener('click', () => go(t.dataset.tab)));
    $('.vial-tabs', body)?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    const banner = $('.vibe-banner', body); if (banner) bindSwipe(banner, step);
  }

  // ---- Plans: one section per tab, each with its own colour and picture
  const PLAN_TABS = [
    { key: 'ending', label: 'Ending soon', color: '#c23a5a', pic: null },
    { key: 'coming', label: 'Coming up', color: '#e3a948', pic: 'plans-coming' },
    { key: 'both', label: 'Both in', color: '#2fd39a', pic: 'plans-both' },
    { key: 'theirs', label: 'Are you in?', color: '#4f7bff', pic: 'plans-theirs' },
    { key: 'waiting', label: 'Waiting', color: '#a63bf2', pic: 'plans-waiting' },
    { key: 'memories', label: 'Previous dates', color: '#f47cf6', pic: 'plans-memories' },
  ];
  function planGroups() {
    const t = today();
    const planned = store.ideas.filter((i) => i.status === 'planned' && i.planned_for);
    const p = partner();
    return {
      ending: store.ideas.filter(hasLiveDeadline).sort((x, y) => x.deadline.localeCompare(y.deadline)),
      ended: store.ideas.filter((i) => isExpired(i) && i.status === 'open'),
      upcoming: planned.filter((i) => i.planned_for >= t).sort((x, y) => (x.planned_for + (x.planned_time || '')).localeCompare(y.planned_for + (y.planned_time || ''))),
      past: planned.filter((i) => i.planned_for < t),
      ready: store.ideas.filter((i) => i.status === 'open' && bothIn(i)),
      // Ideas you're in on that still need your partner, including before they've joined.
      waiting: store.ideas.filter((i) => i.status === 'open' && meIn(i) && !partnerIn(i)),
      theirs: p ? store.ideas.filter((i) => i.status === 'open' && partnerIn(i) && !meIn(i)) : [],
      done: store.ideas.filter((i) => i.status === 'done')
        .sort((x, y) => (wentOnDate(y) || y.created_at.slice(0, 10)).localeCompare(wentOnDate(x) || x.created_at.slice(0, 10))),
    };
  }
  function defaultPlanTab(g) {
    if (g.ending.length || g.ended.length) return 'ending';
    if (g.upcoming.length || g.past.length) return 'coming';
    if (g.ready.length) return 'both';
    if (g.theirs.length) return 'theirs';
    return 'both';
  }
  function plansSheet(body, a) {
    const g = planGroups();
    if (!a.tab) a.tab = defaultPlanTab(g);
    const p = partner(); const pn = p ? p.display_name : 'your partner';
    const counts = { ending: g.ending.length + g.ended.length, coming: g.upcoming.length + g.past.length, both: g.ready.length, theirs: g.theirs.length, waiting: g.waiting.length, memories: g.done.length };
    const tab = PLAN_TABS.find((t) => t.key === a.tab) || PLAN_TABS[2];
    const sec = (title, items, opts, hint) => items.length
      ? `<h3 class="sec-title">${esc(title)}</h3>${hint ? `<p class="muted small" style="margin:-8px 0 0">${esc(hint)}</p>` : ''}<div class="cards">${items.map((i) => cardHTML(i, opts)).join('')}</div>` : '';
    const empty = (text, btn = '') => `<div class="empty"><p>${esc(text)}</p>${btn}</div>`;
    const drawBtn = '<button class="btn primary" data-act="home">Draw from a vial</button>';
    const views = {
      ending: {
        sub: 'Events with a last day. Check you have both decided before they close.',
        html: (counts.ending ? (g.ending.length ? `<div class="cards">${g.ending.map((i) => cardHTML(i, { deadline: true })).join('')}</div>` : '') + sec('Deadline passed', g.ended, { deadline: true }, 'These have closed. Open one to delete it or change its last day.')
          : empty('Nothing with a last day right now. When you save a time-limited event, add its last day and it shows up here.')),
      },
      coming: {
        sub: 'The dates you have picked a day for.',
        html: (counts.coming ? (g.upcoming.length ? `<div class="cards">${g.upcoming.map((i) => cardHTML(i, { plan: true })).join('')}</div>` : '') + sec('Did you go?', g.past, { plan: true }, 'Open one to mark it done or pick a new day.')
          : empty("Nothing scheduled yet. When you're both in on an idea, pick a day and it shows up here.")),
      },
      both: {
        sub: 'Pick a day and it gets a reminder.',
        html: g.ready.length ? `<div class="cards">${g.ready.map((i) => cardHTML(i)).join('')}</div>`
          : empty("When you both tap “I'm in” on an idea, it shows up here so you can pick a day.", drawBtn),
      },
      theirs: {
        title: `${pn} is in. Are you?`,
        sub: 'Open one and tap your box if you are in too.',
        html: g.theirs.length ? `<div class="cards">${g.theirs.map((i) => cardHTML(i)).join('')}</div>`
          : empty(p ? `Nothing is waiting on you. When ${pn} says yes to an idea first, it shows up here.` : 'Once your partner joins, ideas they say yes to first show up here.'),
      },
      waiting: {
        title: `Waiting on ${pn}`,
        sub: p ? `Ideas you said yes to. They move to Both in once ${pn} is in too.` : 'Ideas you said yes to. Your partner has not joined yet: send them the invite code from Us.',
        html: g.waiting.length ? `<div class="cards">${g.waiting.map((i) => cardHTML(i)).join('')}</div>`
          : empty('Nothing waiting. Tap your box on an idea to say you are in.', drawBtn),
      },
      memories: {
        sub: g.done.length ? `You've been on ${g.done.length} ${g.done.length === 1 ? 'date' : 'dates'} together. Newest first.` : 'Dates you go on are kept here, so you can look back on them.',
        html: `<div class="btn-row"><button class="btn" data-act="log-past">Add a date you went on</button></div>
          ${g.done.length ? `<div class="cards">${g.done.map((i) => cardHTML(i, { memory: true })).join('')}</div>` : ''}`,
      },
    };
    const v = views[tab.key];
    body.innerHTML = cardTop({
      pic: tab.pic, color: tab.color,
      tabs: tabsHTML(PLAN_TABS.map((t) => ({ ...t, count: counts[t.key] })), tab.key),
      title: v.title || tab.label, titleColor: `color-mix(in srgb, ${tab.color} 55%, #f6e7c8 45%)`, sub: v.sub,
    }) + v.html;
    setSheetGlow(tab.color);
    bindTabs(body, PLAN_TABS.map((t) => t.key), tab.key, (k) => { a.tab = k; renderSheet(true); $(`.vial-tab[data-tab="${k}"]`, body)?.focus({ preventScroll: true }); });
  }

  // ---- Us: the two of you, invite code, starter ideas, install steps
  function usSheet(body) {
    const m = me(); const p = partner();
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    body.innerHTML = cardTop({
      pic: 'us', color: '#3fbf6f', headTitle: 'Us', title: 'Us',
      sub: p ? `${m.display_name} & ${p.display_name}` : 'Just the two of you',
    }) + `
      <div class="field"><label for="myName">Your name</label>
        <div class="input-row"><input class="input" id="myName" value="${esc(m.display_name)}" maxlength="40" autocomplete="nickname"><button class="btn" id="saveName">Save</button></div></div>
      ${p ? `<p style="margin:0">Sharing vials with <b>${esc(p.display_name)}</b>.</p>`
          : `<div class="field"><span class="label">Invite your partner</span>
              <p style="margin:0">Send them this app's link and this code. They sign in with their own account, choose “I have an invite code” and type it.</p>
              <div class="code-box" id="inviteCode">${esc(store.space?.invite_code || '')}</div>
              <button class="btn" id="copyCode">Copy invite code</button></div>`}
      ${!LIVE ? `<h3 class="sec-title">Demo mode</h3>
        <p class="muted" style="margin:0">Nothing is online yet, so this browser plays both of you. Switch to see the app as the other person and tap “I'm in” for them.</p>
        <div class="btn-row"><button class="btn primary" id="switchUser">Switch to ${esc(p?.display_name || 'Partner')}</button><button class="btn ghost" id="resetDemo">Reset demo</button></div>` : ''}
      <h3 class="sec-title">Ideas</h3>
      <div class="btn-row"><button class="btn" data-act="starters">Add 20 starter ideas</button></div>
      <h3 class="sec-title">Put it on your phone</h3>
      <p style="margin:0">${isIOS
        ? 'In Safari, tap the Share button, then “Add to Home Screen”. It opens full screen like an app.'
        : 'In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”.'}</p>
      <p class="muted small" style="margin:0">On Android, once installed, Shimmer & Spark appears in the share menu. Long-press a link in Telegram or tap Share on a reel, pick Shimmer & Spark, and the add form opens with the link filled in. On iPhone, copy the link and use the Paste button in the add form.</p>
      ${LIVE ? '<h3 class="sec-title">Account</h3><div class="btn-row"><button class="btn ghost" id="signOut">Sign out</button></div>' : ''}`;
    setSheetGlow('#3fbf6f');
    $('#saveName', body).addEventListener('click', async () => {
      const v = $('#myName', body).value.trim(); if (!v) return toast('Type a name first');
      try { await store.rename(v); toast('Name saved'); } catch (e) { toast(e.message); }
    });
    $('#copyCode', body)?.addEventListener('click', () => {
      navigator.clipboard.writeText(store.space.invite_code).then(() => toast('Invite code copied'), () => toast('Select the code and copy it'));
    });
    $('#switchUser', body)?.addEventListener('click', () => { store.switchUser(); toast(`Now viewing as ${me().display_name}`); renderSheet(true); });
    $('#resetDemo', body)?.addEventListener('click', () => store.reset());
    $('#signOut', body)?.addEventListener('click', () => store.signOut());
  }

  function renderToday() {
    const el = $('#today');
    const t = today(); const tm = addDays(t, 1);
    const planned = store.ideas.filter((i) => i.status === 'planned');
    const hit = planned.find((i) => i.planned_for === t) || planned.find((i) => i.planned_for === tm);
    if (!hit) { el.hidden = true; return; }
    const when = hit.planned_for === t ? 'Today' : 'Tomorrow';
    el.outerHTML = `<button class="today" id="today" data-open-idea="${esc(hit.id)}"><b>${when}</b><span>${esc(hit.title)}${hit.planned_time ? ' · ' + esc(fmtTime(hit.planned_time)) : ''}</span></button>`;
  }

  // ---------------------------------------------------------------- sheets
  let sheet = null; // { type, args, locked, parent }
  const DOCK_FOR = { plans: 'plans', us: 'us', draw: 'home' };
  function setSheetGlow(color) { $('#sheet').style.setProperty('--glow', color || 'rgba(227,169,72,.9)'); }

  // `parent` is the card to go back to when this one closes (a vial or Plans, when an idea was opened from it).
  function openSheet(type, args = {}, locked = false, parent = null) {
    sheet = { type, args, locked, parent };
    $('#sheet').hidden = false; $('#sheetBackdrop').hidden = false;
    $('#sheetClose').hidden = locked;
    // An opened idea unrolls as a long parchment scroll, like the one from a vial.
    $('#sheet').classList.toggle('as-scroll', type === 'detail');
    setSheetGlow(null);
    if (DOCK_FOR[type]) setDock(DOCK_FOR[type]);
    renderSheet(true);
  }
  function closeSheet(all = false) {
    if (!sheet || sheet.locked) return;
    const parent = all ? null : sheet.parent;
    if (parent) { openSheet(parent.type, parent.args); return; }
    sheet = null;
    $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true;
    $('#sheetBody').innerHTML = '';
    setDock('home');
  }
  const LIVE_SHEETS = new Set(['draw', 'detail', 'plans']);
  function renderSheet(first = false) {
    if (!sheet) return;
    if (!first && !LIVE_SHEETS.has(sheet.type)) return;
    const body = $('#sheetBody');
    const keepScroll = first ? 0 : body.scrollTop;
    ({ draw: drawSheet, detail: detailSheet, edit: editSheet, plan: planSheet, done: doneSheet, signin: signinSheet, space: spaceSheet, plans: plansSheet, us: usSheet })[sheet.type](body, sheet.args);
    body.scrollTop = keepScroll;
    mountCardTop(body);
  }

  // Draw from a vial
  function drawPool(a) {
    return store.ideas.filter((i) => i.jar === a.jar && i.status !== 'done' && !isExpired(i) && (a.vibe === 'any' || i.vibe === a.vibe) && (!a.bothOnly || bothIn(i)));
  }
  function drawSheet(body, a) {
    const J = JARS[a.jar];
    const pool = drawPool(a);
    const res = a.resultId && store.ideas.find((i) => i.id === a.resultId);
    const vibes = [['any', 'Any vibe', J.color], ...J.vibes.map((v) => [v, VIBES[v].name, VIBES[v].color])];
    body.innerHTML = `
      <div class="sheet-head" style="--head-img:url('${picUrl(a.vibe === 'any' ? a.jar : a.vibe)}');--c:${J.color}">
        <div class="vial-tabs" role="tablist" aria-label="Vials">${Object.entries(JARS).map(([k, V]) => `<button type="button" role="tab" class="vial-tab" style="--c:${V.color}" data-jar="${k}" aria-selected="${a.jar === k}" tabindex="${a.jar === k ? 0 : -1}">${esc(V.short)}</button>`).join('')}</div>
      </div>
      <div class="vibe-banner" style="--c:${J.color}">
        ${(() => { const pic = a.vibe === 'any' ? a.jar : a.vibe; return `<img src="assets/vibes/${pic}.jpg?v=${PICS_VERSION}" alt="" style="object-position:${VIBE_FOCUS[pic] || '50% 50%'};${VIBE_LIFT[pic] ? `filter:brightness(${VIBE_LIFT[pic]}) saturate(1.1)` : ''}" onerror="this.remove()">`; })()}
        <h2 class="sheet-title" style="color:${J.hi}">${esc(J.name)}</h2>
        <p class="sheet-sub">${a.vibe === 'any' ? "What's the vibe tonight?" : esc(VIBES[a.vibe].name)}</p>
      </div>
      <div class="chips">${vibes.map(([k, n, c]) => `<button class="chip${k === 'any' ? ' plain' : ''}" style="--c:${c}" data-vibe="${k}" aria-pressed="${a.vibe === k}">${esc(n)}</button>`).join('')}</div>
      <label class="toggle-row"><input type="checkbox" id="drawBoth" ${a.bothOnly ? 'checked' : ''}> Only ones we're both into</label>
      <div class="draw-stage">
        <svg class="big-vial" id="bigVial" viewBox="-46 8 92 204" style="--glow:${J.color}" aria-hidden="true">${vialMarkup(a.jar, 'big')}</svg>
      </div>
      ${res ? resultHTML(res) : ''}
      <div class="btn-row stretch">
        <button class="btn primary" id="shakeBtn" style="--c:${J.color}" ${pool.length ? '' : 'disabled'}>${res ? 'Shake again' : 'Shake the vial'}</button>
      </div>
      <div class="btn-row stretch"><button class="btn add-idea" data-act="add-jar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Add an idea</button></div>
      ${pool.length ? '' : `<div class="empty"><p>This vial is empty for that vibe.</p></div>`}
      ${pool.length ? `<h3 style="margin:6px 0 0;font-family:var(--font-display);font-weight:400;letter-spacing:.14em;text-transform:uppercase;font-size:.9rem;color:var(--ink-soft)">Or pick one yourself (${pool.length})</h3>
        <div class="cards">${pool.map((i) => cardHTML(i)).join('')}</div>` : ''}`;
    setVialLevel('big', openIdeas(a.jar).length);
    setSheetGlow(J.color);
    // Move between vials without closing: tap a tab, swipe the picture, or use the arrow keys.
    const jarKeys = Object.keys(JARS);
    const goToJar = (k) => { if (!JARS[k] || k === a.jar) return; a.jar = k; a.vibe = 'any'; a.resultId = null; renderSheet(true); $(`.vial-tab[data-jar="${k}"]`, body)?.focus({ preventScroll: true }); };
    const stepJar = (dir) => goToJar(jarKeys[jarKeys.indexOf(a.jar) + dir]);
    $$('.vial-tab', body).forEach((t) => t.addEventListener('click', () => goToJar(t.dataset.jar)));
    $('.vial-tabs', body).addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepJar(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepJar(-1); }
    });
    const banner = $('.vibe-banner', body); let touch = null;
    banner.addEventListener('touchstart', (e) => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
    banner.addEventListener('touchend', (e) => {
      if (!touch) return; const t = e.changedTouches[0];
      const dx = t.clientX - touch.x, dy = t.clientY - touch.y; touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) stepJar(dx < 0 ? 1 : -1); // swipe left = next vial
    }, { passive: true });
    $$('.chip[data-vibe]', body).forEach((b) => b.addEventListener('click', () => { a.vibe = b.dataset.vibe; a.resultId = null; renderSheet(true); }));
    $('#drawBoth', body).addEventListener('change', (e) => { a.bothOnly = e.target.checked; a.resultId = null; renderSheet(true); });
    $('[data-act="add-jar"]', body)?.addEventListener('click', () => openSheet('edit', { prefill: { jar: a.jar, vibe: a.vibe === 'any' ? J.vibes[0] : a.vibe } }, false, { type: 'draw', args: a }));
    $('#shakeBtn', body).addEventListener('click', () => {
      const p = drawPool(a); if (!p.length) return;
      const choices = p.length > 1 ? p.filter((i) => i.id !== a.resultId) : p;
      const pick = choices[Math.floor(Math.random() * choices.length)];
      const v = $('#bigVial', body); const btn = $('#shakeBtn', body);
      btn.disabled = true; v.classList.remove('shake'); void v.getBoundingClientRect(); v.classList.add('shake');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        a.resultId = pick.id; renderSheet(true);
        $('#drawResult')?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      }, reduce ? 0 : 900);
    });
    bindResult(body);
  }
  function resultHTML(i) {
    const V = VIBES[i.vibe] || { name: '', color: '#c9a15a' };
    return `<div class="draw-result" id="drawResult" style="--c:${V.color}">
      <span class="r-vibe">${esc(V.name)}</span>
      <span class="r-title">${esc(i.title)}</span>
      ${(i.place || i.maps_url) ? `<a class="r-place" href="${esc(safeUrl(i.maps_url) || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(i.place))}" target="_blank" rel="noopener">${esc(i.place || 'Open in Google Maps')}</a>` : ''}
      ${i.deadline ? `<span class="r-deadline">${esc(deadlineText(i, true))}</span>` : ''}
      ${i.notes ? `<span class="r-notes">${esc(i.notes.length > 160 ? i.notes.slice(0, 157) + '…' : i.notes)}</span>` : ''}
      <div class="btn-row" style="margin-top:6px">
        <button class="btn primary" data-open-idea="${esc(i.id)}">Open</button>
        <button class="btn" data-interest="${esc(i.id)}">${meIn(i) ? "I'm in ✓" : "I'm in"}</button>
      </div>
    </div>`;
  }
  function bindResult(body) {
    $$('[data-interest]', body).forEach((b) => b.addEventListener('click', () => toggleInterest(b.dataset.interest)));
  }

  async function toggleInterest(id) {
    const idea = store.find(id); if (!idea) return;
    const on = !meIn(idea);
    try {
      await store.setInterest(id, on);
      const fresh = store.find(id);
      if (on && fresh && bothIn(fresh) && fresh.status === 'open') toast("You're both in! Pick a day for it.");
      else toast(on ? "You're in" : 'Taken back');
    } catch (e) { toast(e.message || 'Could not save that'); }
  }

  // Idea detail
  function detailSheet(body, a) {
    const i = store.find(a.id);
    if (!i) { body.innerHTML = '<p>This idea was removed.</p>'; return; }
    const J = JARS[i.jar]; const V = VIBES[i.vibe] || { name: i.vibe, color: '#c9a15a' };
    const media = mediaInfo(i.link); const link = safeUrl(i.link);
    const p = partner(); const m = me();
    const both = bothIn(i);
    let mediaHTML = '';
    if (media && a.playing) mediaHTML = `<div class="embed-wrap"><iframe src="${esc(media.embed)}" title="${esc(media.site)} post" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" allowfullscreen loading="lazy"></iframe></div>`;
    else if (media) mediaHTML = `<div class="play-card">${i.cover_url ? `<img src="${esc(i.cover_url)}" alt="">` : ''}<button class="btn" id="playBtn">▶ Play the ${esc(media.site)} video here</button></div>`;
    else if (i.cover_url) mediaHTML = `<img class="cover" src="${esc(i.cover_url)}" alt="">`;

    const person = (mem, on) => `<div class="person${on ? ' on' : ''}"><span class="p-name">${esc(mem.display_name)}</span><span class="p-state">${on ? "I'm in" : 'Not yet'}</span></div>`;
    // Your own box is the switch: tap to say you're in, tap again to take it back.
    const myBox = (mem, on) => `<button type="button" class="person mine${on ? ' on' : ''}" data-interest="${esc(i.id)}" aria-pressed="${on}" aria-label="${on ? "You're in. Tap to take it back" : "Tap if you're in"}">
      <span class="p-name">${esc(mem.display_name)}</span><span class="p-state">${on ? "I'm in" : "Tap if you're in"}</span></button>`;
    let planBlock = '';
    if (i.status === 'planned' && i.planned_for) {
      planBlock = `<div class="match-banner">${esc(fmtDate(i.planned_for, { weekday: 'long', month: 'long', day: 'numeric' }))}${i.planned_time ? ' · ' + esc(fmtTime(i.planned_time)) : ''}</div>
        <p class="hint">Add it to your calendars for a reminder that morning${i.planned_time ? ' and 2 hours before' : ''}. Each of you can add it on your own phone.</p>
        <div class="btn-row stretch">
          <button class="btn primary" id="icsBtn">Add to calendar</button>
          <a class="btn" href="${esc(gcalURL(i))}" target="_blank" rel="noopener">Google Calendar</a>
        </div>
        <div class="btn-row stretch">
          <button class="btn" id="doneBtn">We went on this date</button>
          <button class="btn ghost" id="replanBtn">Change day</button>
          <button class="btn ghost" id="unplanBtn">Unschedule</button>
        </div>`;
    } else if (i.status === 'done') {
      const wentOn = wentOnDate(i);
      planBlock = `<div class="match-banner">We went${wentOn ? ' · ' + esc(fmtDate(wentOn, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })) : ''}</div>
        ${i.memory ? `<blockquote class="memory">${esc(i.memory)}</blockquote>` : ''}
        <div class="btn-row stretch"><button class="btn primary" id="memoryBtn">${i.memory ? 'Edit our memory' : 'Add a memory'}</button></div>
        <div class="btn-row stretch"><button class="btn" id="againBtn">Do it again</button><button class="btn ghost" id="undoneBtn">Not done yet</button></div>`;
    } else if (both) {
      planBlock = `<div class="match-banner">You're both in</div>
        <div class="btn-row stretch"><button class="btn primary" id="planBtn">Pick a day</button></div>`;
    }

    // Laid out like the scroll that unrolls from a vial: what, where, when, notes, then the two of you.
    const placeHref = safeUrl(i.maps_url) || (i.place ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(i.place) : '');
    body.innerHTML = `
      <div class="chips"><span class="chip" style="--c:${J.color}">${esc(J.name)}</span><span class="chip" style="--c:${V.color}">${esc(V.name)}</span></div>
      <h2 class="sheet-title">${esc(i.title)}</h2>
      ${placeHref ? `<a class="r-place" href="${esc(placeHref)}" target="_blank" rel="noopener">${esc(i.place || 'Open in Google Maps')}</a>` : ''}
      ${i.deadline && i.status !== 'done' ? `<span class="r-deadline">${esc(deadlineText(i, true))}</span>` : ''}
      ${i.notes ? `<p class="notes">${esc(i.notes)}</p>` : ''}
      ${mediaHTML}
      ${media && link ? `<a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener">Open in ${esc(media.site)}</a>` : ''}
      ${link && !media ? `<a class="r-place" href="${esc(link)}" target="_blank" rel="noopener">${esc(hostOf(link))}</a>` : ''}
      <hr class="scroll-rule">
      ${i.status !== 'done' ? `<div class="interest">${myBox(m, meIn(i))}${p ? person(p, partnerIn(i)) : `<div class="person"><span class="p-name">Partner</span><span class="p-state muted">Hasn't joined yet</span></div>`}</div>` : ''}
      ${planBlock}
      ${i.status === 'open' ? '<div class="btn-row stretch"><button class="btn ghost" id="wentBtn">We already went on this date</button></div>' : ''}
      <hr class="scroll-rule">
      <p class="scroll-added">Added by ${esc(nameOf(i.created_by))} · ${esc(fmtDate(isoOf(new Date(i.created_at)), { month: 'short', day: 'numeric', year: 'numeric' }))}</p>
      <div class="btn-row"><button class="btn ghost" id="editBtn">Edit</button><button class="btn danger" id="delBtn">Delete</button></div>
      <div id="confirmSlot"></div>`;

    $('#playBtn', body)?.addEventListener('click', () => { a.playing = true; renderSheet(); });
    $$('[data-interest]', body).forEach((b) => b.addEventListener('click', () => toggleInterest(b.dataset.interest)));
    $('#planBtn', body)?.addEventListener('click', () => openSheet('plan', { id: i.id }));
    $('#replanBtn', body)?.addEventListener('click', () => openSheet('plan', { id: i.id }));
    $('#icsBtn', body)?.addEventListener('click', () => downloadICS(i));
    $('#doneBtn', body)?.addEventListener('click', () => openSheet('done', { id: i.id }));
    $('#wentBtn', body)?.addEventListener('click', () => openSheet('done', { id: i.id }));
    $('#memoryBtn', body)?.addEventListener('click', () => openSheet('done', { id: i.id }));
    $('#undoneBtn', body)?.addEventListener('click', () => save(store.update(i.id, { status: i.planned_for ? 'planned' : 'open', done_on: null }), 'Moved back out of previous dates'));
    $('#againBtn', body)?.addEventListener('click', async () => {
      try {
        const { title, notes, link, place, maps_url, jar, vibe, cover_url } = i;
        const copy = await store.add({ title, notes, link, place, maps_url, jar, vibe, cover_url, interested: [store.meId] });
        toast(`A fresh copy is back in the ${JARS[jar].name} vial. Your memory stays here.`);
        openSheet('detail', { id: copy.id });
      } catch (ex) { toast(ex.message || 'Could not copy it'); }
    });
    $('#unplanBtn', body)?.addEventListener('click', () => save(store.update(i.id, { status: 'open', planned_for: null, planned_time: null }), 'Unscheduled'));
    $('#editBtn', body).addEventListener('click', () => openSheet('edit', { id: i.id }));
    $('#delBtn', body).addEventListener('click', () => {
      $('#confirmSlot', body).innerHTML = `<div class="confirm-box"><p style="margin:0">Delete “${esc(i.title)}” for both of you? This can't be undone.</p>
        <div class="btn-row"><button class="btn danger" id="delYes">Delete it</button><button class="btn ghost" id="delNo">Keep it</button></div></div>`;
      $('#delNo', body).addEventListener('click', () => { $('#confirmSlot', body).innerHTML = ''; });
      $('#delYes', body).addEventListener('click', async () => {
        try { sheet.locked = false; closeSheet(); await store.remove(i.id); toast('Deleted'); } catch (e) { toast(e.message); }
      });
    });
  }
  async function save(promise, msg) { try { await promise; toast(msg); } catch (e) { toast(e.message || 'Could not save that'); } }

  // Add / edit
  function editSheet(body, a) {
    const existing = a.id ? store.find(a.id) : null;
    const logDone = !existing && Boolean(a.prefill?.logDone); // adding a date you already went on
    const saveLabel = existing ? 'Save changes' : logDone ? 'Next: when did you go?' : 'Drop it in the vial';
    const f = existing ? { ...existing } : { title: '', link: '', place: '', notes: '', jar: 'home', vibe: 'cozy', cover_url: null, ...(a.prefill || {}) };
    if (!JARS[f.jar]) f.jar = 'home';
    if (!JARS[f.jar].vibes.includes(f.vibe)) f.vibe = JARS[f.jar].vibes[0];
    let coverBlob = null; let coverPreview = f.cover_url; let removeCover = false;

    const vibesHTML = () => JARS[f.jar].vibes.map((v) => `<button type="button" class="chip" style="--c:${VIBES[v].color}" data-vibe="${v}" aria-pressed="${f.vibe === v}">${esc(VIBES[v].name)}</button>`).join('');
    body.innerHTML = `
      <h2 class="sheet-title">${existing ? 'Edit idea' : logDone ? 'Add a date you went on' : 'New date idea'}</h2>
      <form id="ideaForm" class="gate" novalidate>
        <div class="field"><label for="fLink">Link (Instagram, TikTok, website…)</label>
          <div class="input-row"><input class="input" id="fLink" type="url" inputmode="url" placeholder="https://www.instagram.com/reel/…" value="${esc(f.link)}" autocomplete="off">
          <button type="button" class="btn ghost" id="pasteBtn">Paste</button></div>
          <p class="hint" id="linkHint"></p></div>
        <div class="field"><label for="fTitle">What's the date?</label>
          <input class="input" id="fTitle" required maxlength="120" placeholder="e.g. New ice rink by the river" value="${esc(f.title)}"></div>
        <div class="field"><span class="label">Which vial?</span>
          <div class="seg" id="fJar">${Object.entries(JARS).map(([k, J]) => `<button type="button" style="--c:${J.color}" data-jar="${k}" aria-pressed="${f.jar === k}"><span class="dot"></span>${esc(J.name)}</button>`).join('')}</div></div>
        <div class="field"><span class="label">Vibe</span><div class="chips" id="fVibe">${vibesHTML()}</div></div>
        <div class="field"><label for="fPlace">Where (optional)</label>
          <input class="input" id="fPlace" maxlength="140" placeholder="Name of the place or area" value="${esc(f.place)}"></div>
        <div class="field"><label for="fMaps">Google Maps link (optional)</label>
          <div class="input-row"><input class="input" id="fMaps" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…" value="${esc(f.maps_url || '')}" autocomplete="off">
          <button type="button" class="btn ghost" id="pasteMaps">Paste</button></div>
          <p class="hint" id="mapsHint">In Google Maps, open the place, tap Share and copy the link.</p></div>
        <div class="field"><label for="fDeadline">Last day (optional)</label>
          <input class="input" id="fDeadline" type="date" value="${esc(f.deadline || '')}">
          <p class="hint">For events that close, like a seasonal ice rink or an exhibition. It shows under "Ending soon" in Plans.</p></div>
        <div class="field"><label for="fNotes">Notes (optional)</label>
          <textarea class="textarea" id="fNotes" maxlength="2000" placeholder="Opening hours, price, what to bring…">${esc(f.notes)}</textarea></div>
        <div class="field"><span class="label">Cover picture (optional)</span>
          <div class="cover-pick"><span id="coverPrev"></span>
            <label class="btn ghost" for="fCover" style="cursor:pointer">Choose picture</label>
            <input id="fCover" type="file" accept="image/*" hidden>
            <button type="button" class="btn ghost" id="coverRemove" hidden>Remove</button></div>
          <p class="hint">A screenshot of the reel works well. It shows on the card so you remember what it was.</p></div>
        ${existing || logDone ? '' : `<label class="toggle-row"><input type="checkbox" id="fIn" checked> I'm already in on this one</label>`}
        <p class="error" id="formErr" hidden></p>
        <div class="btn-row stretch"><button class="btn primary" type="submit" id="saveIdea">${saveLabel}</button></div>
      </form>`;

    const linkHint = () => {
      const v = $('#fLink', body).value.trim(); const m = mediaInfo(v);
      $('#linkHint', body).textContent = m ? `${m.site} link: it will play inside the app.` : v && !safeUrl(v) ? 'That does not look like a full link. It should start with https://' : '';
    };
    const coverUI = () => {
      $('#coverPrev', body).innerHTML = coverPreview ? `<img src="${esc(coverPreview)}" alt="Cover preview">` : '';
      $('#coverRemove', body).hidden = !coverPreview;
    };
    linkHint(); coverUI();
    $('#fLink', body).addEventListener('input', linkHint);
    $('#pasteBtn', body).addEventListener('click', async () => {
      try {
        const txt = await navigator.clipboard.readText();
        const url = firstUrl(txt) || txt.trim();
        $('#fLink', body).value = url; linkHint();
        if (!$('#fTitle', body).value) $('#fTitle', body).focus();
      } catch { toast('Paste was blocked. Long-press the box and choose Paste.'); $('#fLink', body).focus(); }
    });
    const mapsChanged = () => {
      const v = $('#fMaps', body).value.trim();
      const name = placeFromMapsUrl(v);
      if (name && !$('#fPlace', body).value.trim()) $('#fPlace', body).value = name;
      $('#mapsHint', body).textContent = !v ? 'In Google Maps, open the place, tap Share and copy the link.'
        : !safeUrl(v) ? 'That does not look like a full link. It should start with https://'
        : isMapsUrl(v) ? 'Google Maps link: tapping "Where" will open this place.'
        : 'This is not a Google Maps link, but it will still open when you tap "Where".';
    };
    $('#fMaps', body).addEventListener('input', mapsChanged);
    $('#pasteMaps', body).addEventListener('click', async () => {
      try {
        const txt = await navigator.clipboard.readText();
        $('#fMaps', body).value = firstUrl(txt) || txt.trim();
        // Google Maps copies "Place name\nhttps://…": use the name if Where is empty.
        const firstLine = txt.split('\n')[0].trim();
        if (firstLine && !/^https?:/i.test(firstLine) && !$('#fPlace', body).value.trim()) $('#fPlace', body).value = firstLine.slice(0, 140);
        mapsChanged();
      } catch { toast('Paste was blocked. Long-press the box and choose Paste.'); $('#fMaps', body).focus(); }
    });
    $$('#fJar button', body).forEach((b) => b.addEventListener('click', () => {
      f.jar = b.dataset.jar; f.vibe = JARS[f.jar].vibes[0];
      $$('#fJar button', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#fVibe', body).innerHTML = vibesHTML(); bindVibes();
    }));
    const bindVibes = () => $$('#fVibe .chip', body).forEach((b) => b.addEventListener('click', () => {
      f.vibe = b.dataset.vibe; $$('#fVibe .chip', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    bindVibes();
    $('#fCover', body).addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try { coverBlob = await resizeImage(file); coverPreview = URL.createObjectURL(coverBlob); removeCover = false; coverUI(); }
      catch { toast('That picture could not be read. Try a JPG or PNG.'); }
    });
    $('#coverRemove', body).addEventListener('click', () => { coverBlob = null; coverPreview = null; removeCover = true; coverUI(); });

    $('#ideaForm', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#formErr', body);
      const title = $('#fTitle', body).value.trim();
      const rawLink = $('#fLink', body).value.trim();
      const link = rawLink ? safeUrl(rawLink) : '';
      if (!title) { err.textContent = 'Give the date a short name so you can recognise it.'; err.hidden = false; $('#fTitle', body).focus(); return; }
      if (rawLink && !link) { err.textContent = 'The link should start with https://. Paste the full link from Instagram or Telegram.'; err.hidden = false; return; }
      const rawMaps = $('#fMaps', body).value.trim();
      const maps_url = rawMaps ? safeUrl(rawMaps) : '';
      if (rawMaps && !maps_url) { err.textContent = 'The Google Maps link should start with https://. In Google Maps tap Share, then Copy link.'; err.hidden = false; return; }
      err.hidden = true;
      const btn = $('#saveIdea', body); btn.disabled = true; btn.textContent = 'Saving…';
      try {
        let cover_url = removeCover ? null : (existing ? existing.cover_url : null);
        if (coverBlob) cover_url = await store.uploadCover(coverBlob);
        const fields = { title, link, place: $('#fPlace', body).value.trim(), maps_url, deadline: $('#fDeadline', body).value || null, notes: $('#fNotes', body).value.trim(), jar: f.jar, vibe: f.vibe, cover_url };
        let id;
        if (existing) { await store.update(existing.id, fields); id = existing.id; toast('Saved'); }
        else {
          if ($('#fIn', body)?.checked) fields.interested = [store.meId];
          const created = await store.add(fields); id = created.id;
          if (!logDone) toast(`Dropped into the ${JARS[f.jar].name} vial`);
        }
        openSheet(logDone ? 'done' : 'detail', { id });
      } catch (ex) {
        err.textContent = ex.message || 'Could not save. Check your connection and try again.'; err.hidden = false;
        btn.disabled = false; btn.textContent = saveLabel;
      }
    });
  }

  // Pick a day
  function planSheet(body, a) {
    const i = store.find(a.id); if (!i) return closeSheet();
    const def = i.planned_for || nextSaturday();
    body.innerHTML = `
      <h2 class="sheet-title">Pick a day</h2>
      <p class="sheet-sub">${esc(i.title)}</p>
      <form id="planForm" class="gate">
        <div class="field"><label for="pDate">Day</label><input class="input" id="pDate" type="date" required value="${esc(def)}" min="${esc(today())}"${hasLiveDeadline(i) ? ` max="${esc(i.deadline)}"` : ''}>
          ${hasLiveDeadline(i) ? `<p class="hint">${esc(deadlineText(i, true))}, so pick a day before then.</p>` : ''}</div>
        <div class="field"><label for="pTime">Time (optional)</label><input class="input" id="pTime" type="time" value="${esc(i.planned_time || '')}"></div>
        <div class="btn-row stretch"><button class="btn primary" type="submit">Save the date</button></div>
      </form>`;
    $('#planForm', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = $('#pDate', body).value; if (!d) return toast('Choose a day');
      try {
        await store.update(i.id, { status: 'planned', planned_for: d, planned_time: $('#pTime', body).value || null });
        toast('Saved. Add it to your calendar for the reminder.');
        openSheet('detail', { id: i.id });
      } catch (ex) { toast(ex.message); }
    });
  }
  // We went: save the day and an optional memory to Previous dates
  function doneSheet(body, a) {
    const i = store.find(a.id); if (!i) return closeSheet();
    const t = today();
    const def = i.done_on || (i.planned_for && i.planned_for <= t ? i.planned_for : t);
    body.innerHTML = `
      <h2 class="sheet-title">${i.status === 'done' ? 'Our memory' : 'We went!'}</h2>
      <p class="sheet-sub">${esc(i.title)}</p>
      <form id="doneForm" class="gate">
        <div class="field"><label for="dDate">When did you go?</label>
          <input class="input" id="dDate" type="date" required value="${esc(def)}" max="${esc(t)}"></div>
        <div class="field"><label for="dMemory">What do you want to remember? (optional)</label>
          <textarea class="textarea" id="dMemory" maxlength="1000" placeholder="The best part, something funny, what you'd do again…">${esc(i.memory || '')}</textarea></div>
        <div class="btn-row stretch"><button class="btn primary" type="submit">Save to previous dates</button></div>
      </form>`;
    $('#doneForm', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = $('#dDate', body).value; if (!d) return toast('Choose the day you went');
      const wasDone = i.status === 'done';
      try {
        await store.update(i.id, { status: 'done', done_on: d, memory: $('#dMemory', body).value.trim() });
        const n = store.ideas.filter((x) => x.status === 'done').length;
        toast(wasDone ? 'Memory saved' : `Saved. That's ${n} ${n === 1 ? 'date' : 'dates'} together.`);
        openSheet('detail', { id: i.id });
      } catch (ex) { toast(ex.message || 'Could not save that'); }
    });
  }

  function nextSaturday() { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return isoOf(d); }

  // Sign in (live mode)
  function signinSheet(body, a) {
    const create = a.mode === 'create';
    body.innerHTML = `
      <h2 class="sheet-title">Welcome</h2>
      <button type="button" class="btn google-btn" id="googleBtn" hidden>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google</button>
      <p class="or-line" id="orLine" hidden><span>or use email</span></p>
      <div class="seg" style="grid-template-columns:1fr 1fr" id="authMode">
        <button type="button" data-m="signin" aria-pressed="${!create}">Sign in</button>
        <button type="button" data-m="create" aria-pressed="${create}">Create account</button>
      </div>
      <form id="authForm" class="gate">
        <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required value="${esc(a.email || '')}"></div>
        <div class="field"><label for="pw">Password${create ? ' (at least 6 characters)' : ''}</label>
          <input class="input" id="pw" type="password" autocomplete="${create ? 'new-password' : 'current-password'}" minlength="6" required></div>
        <p class="error" id="authErr" hidden></p>
        <div class="btn-row stretch"><button class="btn primary" type="submit">${create ? 'Create account' : 'Sign in'}</button></div>
      </form>`;
    const showErr = (m) => { const e = $('#authErr', body); e.textContent = m; e.hidden = false; };
    store.googleEnabled().then((on) => {
      if (!on || !$('#googleBtn', body)) return;
      $('#googleBtn', body).hidden = false; $('#orLine', body).hidden = false;
    });
    $('#googleBtn', body).addEventListener('click', async () => {
      const b = $('#googleBtn', body); b.disabled = true;
      try { await store.signInWithGoogle(); }
      catch (ex) {
        b.disabled = false;
        showErr(/not enabled|unsupported provider/i.test(ex.message || '') ? 'Google sign-in is not switched on in Supabase yet. Use email for now.' : (ex.message || 'Could not open Google sign-in'));
      }
    });
    $$('#authMode button', body).forEach((b) => b.addEventListener('click', () => {
      a.email = $('#email', body).value; a.mode = b.dataset.m; renderSheet(true);
    }));
    $('#authForm', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#email', body).value.trim(); const pw = $('#pw', body).value;
      if (!email || pw.length < 6) return showErr('Enter your email and a password of at least 6 characters.');
      const btn = $('#authForm button[type=submit]', body); btn.disabled = true;
      try { afterAuth(await store.signIn(email, pw, create)); }
      catch (ex) {
        btn.disabled = false;
        const msg = ex.message || '';
        if (/invalid login/i.test(msg)) showErr('That email and password do not match. New here? Choose "Create account".');
        else if (/already registered/i.test(msg)) showErr('This email already has an account. Choose "Sign in".');
        else showErr(msg || 'Could not sign in');
      }
    });
  }
  function spaceSheet(body, a) {
    body.innerHTML = `
      <h2 class="sheet-title">Set up Shimmer &amp; Spark</h2>
      <form id="spaceForm" class="gate">
        <div class="field"><label for="dName">Your name</label><input class="input" id="dName" maxlength="40" required autocomplete="nickname"></div>
        <div class="seg" style="grid-template-columns:1fr 1fr" id="spaceMode">
          <button type="button" data-m="new" aria-pressed="${a.mode !== 'join'}">Start ours</button>
          <button type="button" data-m="join" aria-pressed="${a.mode === 'join'}">I have an invite code</button>
        </div>
        ${a.mode === 'join' ? `<div class="field"><label for="iCode">Invite code</label><input class="input" id="iCode" maxlength="6" required style="text-transform:uppercase;letter-spacing:.2em"></div>`
          : '<p class="hint">You will get an invite code to send to your partner.</p>'}
        <p class="error" id="spaceErr" hidden></p>
        <div class="btn-row stretch"><button class="btn primary" type="submit">${a.mode === 'join' ? 'Join' : 'Start'}</button></div>
      </form>`;
    $$('#spaceMode button', body).forEach((b) => b.addEventListener('click', () => { const n = $('#dName', body).value; a.mode = b.dataset.m; renderSheet(true); $('#dName', body).value = n; }));
    $('#spaceForm', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#dName', body).value.trim(); const err = $('#spaceErr', body);
      if (!name) { err.textContent = 'Add your name so your partner sees who tapped “I\'m in”.'; err.hidden = false; return; }
      try {
        if (a.mode === 'join') await store.joinSpace($('#iCode', body).value, name);
        else await store.createSpace('Shimmer & Spark', name);
        afterAuth('ready');
        if (a.mode !== 'join') openSheet('us');
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  // ---------------------------------------------------------------- calendar
  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function compact(iso) { return iso.replace(/-/g, ''); }
  function timedRange(i) {
    const [h, m] = i.planned_time.split(':').map(Number);
    const s = new Date(i.planned_for + 'T00:00:00'); s.setHours(h, m || 0, 0, 0);
    const e = new Date(s.getTime() + 2 * 3600 * 1000);
    const f = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    return [f(s), f(e)];
  }
  function calDetails(i) { return [i.notes, safeUrl(i.link)].filter(Boolean).join('\n\n'); }
  function buildICS(i) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shimmer and Spark//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${i.id}@shimmer-spark`, `DTSTAMP:${stamp(new Date())}`];
    if (i.planned_time) { const [s, e] = timedRange(i); lines.push(`DTSTART:${s}`, `DTEND:${e}`); }
    else lines.push(`DTSTART;VALUE=DATE:${compact(i.planned_for)}`, `DTEND;VALUE=DATE:${compact(addDays(i.planned_for, 1))}`);
    lines.push(`SUMMARY:${icsEscape('Date: ' + i.title)}`);
    if (i.place) lines.push(`LOCATION:${icsEscape(i.place)}`);
    const det = calDetails(i); if (det) lines.push(`DESCRIPTION:${icsEscape(det)}`);
    if (safeUrl(i.link)) lines.push(`URL:${safeUrl(i.link)}`);
    // Morning-of reminder (9:00 for all-day; for timed, 9:00 same day expressed relative to start) plus 2 h before timed dates.
    if (i.planned_time) {
      const [h, m] = i.planned_time.split(':').map(Number);
      const mins = h * 60 + (m || 0) - 9 * 60;
      if (mins > 150) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape('Date day: ' + i.title)}`, `TRIGGER:-PT${mins}M`, 'END:VALARM');
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape('In 2 hours: ' + i.title)}`, 'TRIGGER:-PT2H', 'END:VALARM');
    } else {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape('Date day: ' + i.title)}`, 'TRIGGER:PT9H', 'END:VALARM');
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }
  function downloadICS(i) {
    const blob = new Blob([buildICS(i)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (i.title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'date') + '.ics';
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function gcalURL(i) {
    const dates = i.planned_time ? timedRange(i).join('/') : `${compact(i.planned_for)}/${compact(addDays(i.planned_for, 1))}`;
    const q = new URLSearchParams({ action: 'TEMPLATE', text: 'Date: ' + i.title, dates, details: calDetails(i), location: i.place || '' });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  // ---------------------------------------------------------------- wiring
  function renderAll() {
    updateVials();
    renderToday();
    layoutVials();
    renderSheet();
    const n = store.ideas.filter((i) => i.status !== 'done').length;
    $('#tagline').textContent = n ? 'Select a vial to ignite the night' : 'Open a vial to add your first idea';
  }

  document.addEventListener('click', async (e) => {
    const open = e.target.closest('[data-open-idea]');
    if (open) {
      // Coming from a vial or Plans: closing the idea goes back there.
      const parent = sheet && ['draw', 'plans'].includes(sheet.type) ? { type: sheet.type, args: sheet.args } : null;
      openSheet('detail', { id: open.dataset.openIdea }, false, parent); return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'add') openSheet('edit', {});
    if (act === 'log-past') openSheet('edit', { prefill: { logDone: true } }, false, sheet?.type === 'plans' ? { type: 'plans', args: sheet.args } : null);
    if (act === 'home') closeSheet(true);
    if (act === 'starters') { try { await store.addStarters(); toast('Added 20 starter ideas'); } catch (ex) { toast(ex.message); } }
  });
  $$('.dock-btn').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.view;
    if (v === 'home') { closeSheet(true); return; }
    if (sheet?.locked) return;
    openSheet(v, v === 'plans' ? {} : {});
  }));
  $('#sheetClose').addEventListener('click', () => closeSheet());
  $('#sheetBackdrop').addEventListener('click', () => closeSheet());
  $('#sheetBody').addEventListener('scroll', () => updateStuck($('#sheetBody')), { passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  function handleShare() {
    const qs = new URLSearchParams(location.search);
    if (!qs.has('share') && !qs.has('url') && !qs.has('text')) return;
    const link = safeUrl(qs.get('url') || '') || firstUrl(qs.get('text')) || firstUrl(qs.get('title'));
    const rawTitle = (qs.get('title') || '').trim();
    history.replaceState(null, '', location.pathname);
    if (isMapsUrl(link)) {
      // Shared from Google Maps: the text is usually "Place name\nhttps://maps.app.goo.gl/…".
      const firstLine = String(qs.get('text') || '').split('\n')[0].trim();
      const name = [rawTitle, firstLine, placeFromMapsUrl(link)].find((s) => s && !/^https?:/i.test(s)) || '';
      openSheet('edit', { prefill: { maps_url: link, place: name.slice(0, 140), title: name.slice(0, 120) } });
      return;
    }
    openSheet('edit', { prefill: { link, title: rawTitle && !/^https?:/.test(rawTitle) ? rawTitle.slice(0, 120) : '' } });
  }

  function afterAuth(state) {
    if (state === 'signin') { openSheet('signin', {}, true); return; }
    if (state === 'space') { openSheet('space', { mode: 'new' }, true); return; }
    if (sheet?.locked) { sheet.locked = false; closeSheet(); }
    renderAll();
    handleShare();
  }

  async function boot() {
    buildVials();
    measureIosGap();
    startFireflies();
    layoutVials();
    addEventListener('resize', () => { measureIosGap(); layoutVials(); });
    addEventListener('orientationchange', () => setTimeout(() => { measureIosGap(); layoutVials(); }, 300));
    store.onChange(renderAll);
    $('#demoChip').hidden = LIVE;
    try { afterAuth(await store.start()); }
    catch (e) { toast('Could not connect: ' + (e.message || e)); console.error(e); }
    // Offline helper on the live site only. On localhost it's switched off (and removed) so every
    // reload shows the latest files while working on the app.
    if ('serviceWorker' in navigator) {
      if (location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
      else navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    }
  }
  boot();
})();
