/* ═══════════════════════════════════════════════════════════
   STORAGE — Google Sheets Backend
   Replace SCRIPT_URL below with your deployed Apps Script URL
═══════════════════════════════════════════════════════════ */

const SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

const DB = {

  // ── CORE API CALLS ──────────────────────────────────────

  async get(params) {
    const url = SCRIPT_URL + '?' + new URLSearchParams(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async post(data) {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  // ── REGISTRATION ────────────────────────────────────────

  async getTeams() {
    return this.get({ action: 'getTeams' });
  },

  async registerPlayer({ name, phone, email, team, isNewTeam }) {
    return this.post({ action: 'registerPlayer', name, phone, email, team, isNewTeam });
  },

  async registerSponsor({ bizName, contactName, contactPhone, contactEmail, tier, teamName }) {
    return this.post({ action: 'registerSponsor', bizName, contactName, contactPhone, contactEmail, tier, teamName });
  },

  // ── SCORING ─────────────────────────────────────────────

  async getScoreEntry(token) {
    return this.get({ action: 'getScoreEntry', token });
  },

  async saveHoleScore(token, holeIndex, strokes) {
    return this.post({ action: 'saveHoleScore', token, holeIndex, strokes });
  },

  async getLeaderboard() {
    return this.get({ action: 'getLeaderboard' });
  },

  // ── ADMIN ────────────────────────────────────────────────

  async getAll() {
    return this.get({ action: 'getAll' });
  },

  async setPlayerPaid(id, paid) {
    return this.post({ action: 'setPlayerPaid', id, paid });
  },

  async deletePlayer(id) {
    return this.post({ action: 'deletePlayer', id });
  },

  async setSponsorLogo(id, logoFile) {
    return this.post({ action: 'setSponsorLogo', id, logoFile });
  },

  async setSponsorPaid(id, paid) {
    return this.post({ action: 'setSponsorPaid', id, paid });
  },

  async deleteSponsor(id) {
    return this.post({ action: 'deleteSponsor', id });
  },

  async generateAllTokens() {
    return this.post({ action: 'generateAllTokens' });
  },

  async generateToken(teamName) {
    return this.post({ action: 'generateToken', teamName });
  },

  async setStartHole(teamName, hole) {
    return this.post({ action: 'setStartHole', teamName, hole });
  },

  async setContest(key, data) {
    return this.post({ action: 'setContest', key, ...data });
  },

  async saveCourse(pars) {
    return this.post({ action: 'saveCourse', pars });
  },

  async adminOverride(teamName, holeIndex, strokes) {
    return this.post({ action: 'adminOverride', teamName, holeIndex, strokes });
  }
};
