/* ═══════════════════════════════════════════════════
   STORAGE — uses Claude's window.storage API
   Shared by all pages
═══════════════════════════════════════════════════ */

const DB = {
  TEAMS_KEY:    'tournament_teams',
  PLAYERS_KEY:  'tournament_players',
  SCORES_KEY:   'tournament_scores',
  COURSE_KEY:   'tournament_course',
  CONTESTS_KEY: 'tournament_contests',
  SPONSORS_KEY: 'tournament_sponsors',

  async getTeams() {
    try { const r = await window.storage.get(this.TEAMS_KEY); return r ? JSON.parse(r.value) : {}; }
    catch { return {}; }
  },
  async getPlayers() {
    try { const r = await window.storage.get(this.PLAYERS_KEY); return r ? JSON.parse(r.value) : []; }
    catch { return []; }
  },
  async saveTeams(t)   { await window.storage.set(this.TEAMS_KEY,   JSON.stringify(t)); },
  async savePlayers(p) { await window.storage.set(this.PLAYERS_KEY, JSON.stringify(p)); },

  async getTeamNames() { const t = await this.getTeams(); return Object.keys(t).sort(); },

  async registerPlayer({ name, phone, email, team, isNewTeam }) {
    const players = await this.getPlayers();
    const teams   = await this.getTeams();
    if (isNewTeam) { teams[team] = { created: Date.now(), paidCount: 0 }; await this.saveTeams(teams); }
    const player = { id: crypto.randomUUID(), name, phone, email, team, paid: false, registeredAt: new Date().toISOString() };
    players.push(player);
    await this.savePlayers(players);
    return player;
  },

  async setPlayerPaid(id, paid) {
    const p = await this.getPlayers();
    const x = p.find(x => x.id === id);
    if (x) { x.paid = paid; await this.savePlayers(p); }
    await this._updateTeamPaidCount();
  },

  async deletePlayer(id) {
    let p = await this.getPlayers();
    p = p.filter(x => x.id !== id);
    await this.savePlayers(p);
    await this._cleanEmptyTeams(p);
    await this._updateTeamPaidCount();
  },

  async _updateTeamPaidCount() {
    const players = await this.getPlayers(), teams = await this.getTeams();
    for (const t of Object.keys(teams)) teams[t].paidCount = players.filter(p => p.team===t && p.paid).length;
    await this.saveTeams(teams);
  },

  async _cleanEmptyTeams(players) {
    const teams = await this.getTeams();
    const active = [...new Set(players.map(p => p.team))];
    for (const t of Object.keys(teams)) { if (!active.includes(t)) delete teams[t]; }
    await this.saveTeams(teams);
  },

  async getStats() {
    const players = await this.getPlayers(), teams = await this.getTeams(), names = Object.keys(teams);
    return {
      totalPlayers:  players.length,
      paidPlayers:   players.filter(p => p.paid).length,
      totalTeams:    names.length,
      fullPaidTeams: names.filter(t => { const m = players.filter(p=>p.team===t); return m.length===4 && m.every(p=>p.paid); }).length
    };
  },

  // ── COURSE SETUP ─────────────────────────────────

  async getCourse() {
    try { const r = await window.storage.get(this.COURSE_KEY); if (r) return JSON.parse(r.value); } catch {}
    return { name: 'Oak Valley Golf Course', pars: [4,4,4,5,4,3,4,5,4,4,5,4,4,4,4,3,5,4], startingHoles: {} };
  },
  async saveCourse(c) { await window.storage.set(this.COURSE_KEY, JSON.stringify(c)); },
  async getTotalPar() { const c = await this.getCourse(); return c.pars.reduce((a,b)=>a+b,0); },

  // ── SCORES ───────────────────────────────────────

  async getScores() {
    try { const r = await window.storage.get(this.SCORES_KEY); return r ? JSON.parse(r.value) : {}; }
    catch { return {}; }
  },
  async saveScores(s) { await window.storage.set(this.SCORES_KEY, JSON.stringify(s)); },

  async generateScorerToken(teamName) {
    const scores = await this.getScores();
    if (!scores[teamName]) {
      scores[teamName] = { scores: Array(18).fill(null), scorerToken: Math.random().toString(36).slice(2,8).toUpperCase(), submitted: false, startHole: 1, lastUpdated: null };
    } else if (!scores[teamName].scorerToken) {
      scores[teamName].scorerToken = Math.random().toString(36).slice(2,8).toUpperCase();
    }
    await this.saveScores(scores);
    return scores[teamName].scorerToken;
  },

  async setTeamStartHole(teamName, hole) {
    const scores = await this.getScores();
    if (!scores[teamName]) scores[teamName] = { scores: Array(18).fill(null), scorerToken: null, submitted: false, startHole: hole, lastUpdated: null };
    else scores[teamName].startHole = hole;
    await this.saveScores(scores);
  },

  async saveHoleScore(token, holeIndex, strokes) {
    const scores = await this.getScores();
    const entry  = Object.values(scores).find(s => s.scorerToken === token);
    if (!entry) return { error: 'Invalid scorer code' };
    entry.scores[holeIndex] = strokes;
    entry.lastUpdated = new Date().toISOString();
    await this.saveScores(scores);
    return { ok: true };
  },

  async getTeamByToken(token) {
    const scores = await this.getScores();
    for (const [teamName, entry] of Object.entries(scores)) {
      if (entry.scorerToken === token) return { teamName, ...entry };
    }
    return null;
  },

  async getLeaderboard() {
    const scores = await this.getScores(), course = await this.getCourse(), pars = course.pars;
    const board  = [];
    for (const [teamName, entry] of Object.entries(scores)) {
      const holesPlayed = entry.scores.filter(s => s !== null).length;
      const grossTotal  = entry.scores.filter(s => s !== null).reduce((a,b)=>a+b,0);
      let parThrough = 0;
      for (let i = 0; i < 18; i++) { if (entry.scores[i] !== null) parThrough += pars[i]; }
      const scoreToPar = holesPlayed > 0 ? grossTotal - parThrough : null;
      board.push({ teamName, scores: entry.scores, holesPlayed, grossTotal, scoreToPar, startHole: entry.startHole||1, lastUpdated: entry.lastUpdated, thru: holesPlayed===18?'F':holesPlayed===0?'-':`${holesPlayed}` });
    }
    board.sort((a,b) => {
      if (a.scoreToPar===null && b.scoreToPar===null) return 0;
      if (a.scoreToPar===null) return 1; if (b.scoreToPar===null) return -1;
      if (a.scoreToPar!==b.scoreToPar) return a.scoreToPar - b.scoreToPar;
      return b.holesPlayed - a.holesPlayed;
    });
    return board;
  },

  // ── CONTESTS ─────────────────────────────────────

  async getContests() {
    try { const r = await window.storage.get(this.CONTESTS_KEY); return r ? JSON.parse(r.value) : {}; }
    catch { return {}; }
  },
  async saveContests(c) { await window.storage.set(this.CONTESTS_KEY, JSON.stringify(c)); },
  async setContest(key, data) {
    const c = await this.getContests();
    c[key] = { ...data, updatedAt: new Date().toISOString() };
    await this.saveContests(c);
  }
};
