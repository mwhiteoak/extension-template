// D&D Beyond DM Prep Companion — Content Script
// Injects DM sidebar into D&D Beyond pages via Shadow DOM.

(function () {
  'use strict';

  if (document.getElementById('dmc-host')) return; // prevent duplicate injection

  // ── Constants ──────────────────────────────────────────────────────────────

  const HOTKEY = 'D'; // Shift+D to toggle sidebar
  const NOTES_DEBOUNCE_MS = 800;

  // ── State ──────────────────────────────────────────────────────────────────

  let state = {
    isPro: true,
    sidebarVisible: false,
    activeTab: 'initiative',
    combat: {
      round: 1,
      turnIndex: 0,
      combatants: [],
    },
    encounter: {
      monsters: [], // { name, cr, count }
    },
    partySize: 4,
    partyLevel: 5,
  };

  let notesTimer = null;

  // ── Shadow DOM host ────────────────────────────────────────────────────────

  const host = document.createElement('div');
  host.id = 'dmc-host';
  host.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // ── CSS ────────────────────────────────────────────────────────────────────

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }

    #dmc-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100vh;
      background: #1a1a2e;
      color: #e0e0e0;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 20px rgba(0,0,0,0.6);
      pointer-events: all;
      overflow: hidden;
      border-left: 2px solid #c0392b;
    }

    #dmc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #0d0d1a;
      border-bottom: 1px solid #c0392b;
      flex-shrink: 0;
    }

    #dmc-title {
      font-size: 14px;
      font-weight: 700;
      color: #e74c3c;
      letter-spacing: 0.5px;
    }

    #dmc-close {
      background: none;
      border: none;
      color: #e0e0e0;
      cursor: pointer;
      font-size: 16px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    #dmc-close:hover { background: #c0392b; }

    #dmc-tabs {
      display: flex;
      background: #0f0f1f;
      border-bottom: 1px solid #333;
      flex-shrink: 0;
    }

    .dmc-tab {
      flex: 1;
      background: none;
      border: none;
      color: #999;
      padding: 8px 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid transparent;
      transition: color 0.15s;
    }
    .dmc-tab:hover { color: #e0e0e0; }
    .dmc-tab.active { color: #e74c3c; border-bottom-color: #e74c3c; }
    .dmc-tab.pro-tab::after { content: '★'; font-size: 9px; color: #f39c12; margin-left: 2px; }

    .dmc-panel {
      display: none;
      flex-direction: column;
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    .dmc-panel.active { display: flex; }

    /* Scrollbar */
    .dmc-panel::-webkit-scrollbar { width: 4px; }
    .dmc-panel::-webkit-scrollbar-track { background: #0d0d1a; }
    .dmc-panel::-webkit-scrollbar-thumb { background: #c0392b; border-radius: 2px; }

    /* Buttons */
    button.dmc-btn, .dmc-btn {
      background: #c0392b;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .dmc-btn:hover { background: #e74c3c; }
    .dmc-btn.secondary {
      background: #2c3e50;
    }
    .dmc-btn.secondary:hover { background: #34495e; }
    .dmc-btn.small { padding: 3px 7px; font-size: 11px; }
    .dmc-btn.danger { background: #7f1d1d; }
    .dmc-btn.danger:hover { background: #991b1b; }

    /* Inputs */
    input[type=text], input[type=number], textarea {
      background: #0f3460;
      border: 1px solid #1e5080;
      color: #e0e0e0;
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 12px;
      outline: none;
    }
    input[type=text]:focus, input[type=number]:focus, textarea:focus {
      border-color: #e74c3c;
    }
    input[type=number] { width: 60px; }
    input[type=text] { flex: 1; }
    input[type=checkbox] { accent-color: #e74c3c; }

    /* ── Initiative Panel ── */
    #dmc-round-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 6px 8px;
      background: #0d0d1a;
      border-radius: 4px;
    }
    #dmc-round-label { font-size: 13px; font-weight: 700; color: #e74c3c; }

    .dmc-combatant {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 8px;
      margin-bottom: 5px;
      background: #0f1a2e;
      border-radius: 5px;
      border-left: 3px solid transparent;
    }
    .dmc-combatant.active { border-left-color: #f1c40f; background: #1a2a1a; }
    .dmc-combatant.player { border-left-color: #3498db; }
    .dmc-combatant.dead { opacity: 0.4; }
    .dmc-combatant.dead .dmc-c-name { text-decoration: line-through; }

    .dmc-c-init {
      width: 26px;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      color: #f1c40f;
      flex-shrink: 0;
    }
    .dmc-c-name {
      flex: 1;
      font-weight: 600;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dmc-c-ac {
      font-size: 11px;
      color: #999;
      flex-shrink: 0;
    }

    .dmc-hp-controls {
      display: flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
    }
    .dmc-hp-display {
      font-size: 12px;
      font-weight: 700;
      min-width: 50px;
      text-align: center;
    }
    .dmc-hp-display.hurt { color: #e67e22; }
    .dmc-hp-display.bloodied { color: #e74c3c; }
    .dmc-hp-display.dead { color: #777; }
    .dmc-hp-btn {
      width: 20px;
      height: 20px;
      padding: 0;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      background: #2c3e50;
      border: none;
      border-radius: 3px;
      color: #e0e0e0;
      cursor: pointer;
    }
    .dmc-hp-btn:hover { background: #34495e; }

    .dmc-c-actions {
      display: flex;
      gap: 3px;
      flex-shrink: 0;
    }

    #dmc-add-form {
      margin-top: 8px;
      padding: 8px;
      background: #0d0d1a;
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #dmc-add-form .dmc-form-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    #dmc-add-form label {
      font-size: 11px;
      color: #999;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    #dmc-add-name { width: 100%; box-sizing: border-box; }

    /* ── Notes Panel ── */
    #dmc-notes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    #dmc-notes-header span { font-weight: 600; }
    #dmc-notes-sync { font-size: 11px; color: #888; }
    #dmc-notes-area {
      flex: 1;
      resize: none;
      min-height: 400px;
      line-height: 1.5;
      font-family: inherit;
    }

    /* ── Encounter Panel ── */
    .dmc-section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #e74c3c;
      margin: 8px 0 4px;
      border-bottom: 1px solid #333;
      padding-bottom: 4px;
    }

    .dmc-party-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .dmc-party-row label {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    #dmc-xp-thresholds {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      margin-bottom: 10px;
    }
    .dmc-threshold-cell {
      background: #0d0d1a;
      border-radius: 4px;
      padding: 5px;
      text-align: center;
    }
    .dmc-threshold-cell .label { font-size: 10px; color: #888; text-transform: uppercase; }
    .dmc-threshold-cell .value { font-size: 13px; font-weight: 700; }
    .dmc-threshold-cell.easy .value { color: #2ecc71; }
    .dmc-threshold-cell.medium .value { color: #f1c40f; }
    .dmc-threshold-cell.hard .value { color: #e67e22; }
    .dmc-threshold-cell.deadly .value { color: #e74c3c; }

    #dmc-enc-monsters { margin-bottom: 8px; }
    .dmc-enc-monster-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .dmc-enc-monster-name { flex: 1; font-size: 12px; }
    .dmc-enc-monster-cr { font-size: 11px; color: #888; }

    #dmc-enc-result {
      padding: 8px;
      background: #0d0d1a;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
    }
    #dmc-enc-result.easy { color: #2ecc71; }
    #dmc-enc-result.medium { color: #f1c40f; }
    #dmc-enc-result.hard { color: #e67e22; }
    #dmc-enc-result.deadly { color: #e74c3c; }
    #dmc-enc-result.trivial { color: #888; }

    /* ── Monster Panel ── */
    #dmc-monster-search-input {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 8px;
      padding: 7px 10px;
    }

    #dmc-monster-results { display: flex; flex-direction: column; gap: 6px; }

    .dmc-monster-card {
      background: #0d0d1a;
      border-radius: 5px;
      padding: 8px;
      border-left: 3px solid #e74c3c;
    }
    .dmc-monster-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .dmc-monster-name { font-size: 13px; font-weight: 700; color: #e0e0e0; }
    .dmc-monster-meta { font-size: 11px; color: #999; }
    .dmc-monster-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3px;
      font-size: 11px;
      color: #ccc;
      margin-bottom: 4px;
    }
    .dmc-monster-stats span { background: #1a1a2e; padding: 2px 4px; border-radius: 3px; }
    .dmc-monster-ability-scores {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 2px;
      font-size: 10px;
      text-align: center;
      margin-top: 4px;
    }
    .dmc-ability-cell { background: #0f1a2e; border-radius: 3px; padding: 2px; }
    .dmc-ability-cell .ab-label { color: #888; display: block; }
    .dmc-ability-cell .ab-val { color: #e0e0e0; font-weight: 700; }
    .dmc-ability-cell .ab-mod { color: #aaa; }
    .dmc-monster-notes {
      font-size: 10px;
      color: #aaa;
      margin-top: 4px;
      font-style: italic;
    }
    .dmc-monster-card-actions {
      display: flex;
      gap: 5px;
      margin-top: 6px;
    }

    /* ── Pro gate ── */
    .dmc-pro-gate {
      text-align: center;
      padding: 24px 16px;
    }
    .dmc-pro-gate p { margin: 0 0 12px; line-height: 1.5; }
    .dmc-upgrade-btn {
      background: linear-gradient(135deg, #f39c12, #e67e22);
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 16px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      width: 100%;
    }
    .dmc-upgrade-btn:hover { background: linear-gradient(135deg, #f1c40f, #e67e22); }

    /* ── Toggle button (when sidebar closed) ── */
    #dmc-toggle-btn {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      background: #c0392b;
      color: white;
      border: none;
      border-radius: 6px 0 0 6px;
      padding: 14px 6px;
      cursor: pointer;
      font-size: 18px;
      pointer-events: all;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      letter-spacing: 2px;
      font-weight: 700;
      box-shadow: -2px 0 8px rgba(0,0,0,0.4);
    }
    #dmc-toggle-btn:hover { background: #e74c3c; }

    /* ── Damage/Heal modal ── */
    #dmc-dmg-modal {
      position: absolute;
      background: #0d0d1a;
      border: 1px solid #e74c3c;
      border-radius: 6px;
      padding: 12px;
      z-index: 10;
      min-width: 160px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    #dmc-dmg-modal label { font-size: 11px; color: #999; display: block; margin-bottom: 4px; }
    #dmc-dmg-modal input { width: 100%; box-sizing: border-box; margin-bottom: 8px; }
    #dmc-dmg-modal .dmc-modal-btns { display: flex; gap: 6px; }
  `;
  shadow.appendChild(style);

  // ── HTML ───────────────────────────────────────────────────────────────────

  const container = document.createElement('div');
  container.innerHTML = `
    <button id="dmc-toggle-btn" title="Toggle DM Companion (Shift+D)">⚔</button>
    <div id="dmc-sidebar" style="display:none">
      <div id="dmc-header">
        <span id="dmc-title">⚔ DM Companion</span>
        <button id="dmc-close" title="Close">✕</button>
      </div>
      <div id="dmc-tabs">
        <button class="dmc-tab active" data-tab="initiative">Initiative</button>
        <button class="dmc-tab" data-tab="notes">Notes</button>
        <button class="dmc-tab pro-tab" data-tab="encounter">Encounter</button>
        <button class="dmc-tab pro-tab" data-tab="monsters">Monsters</button>
      </div>

      <!-- Initiative -->
      <div class="dmc-panel active" data-panel="initiative">
        <div id="dmc-round-bar">
          <span id="dmc-round-label">Round 1</span>
          <div style="display:flex;gap:6px">
            <button class="dmc-btn small" id="dmc-next-turn">Next ▶</button>
            <button class="dmc-btn small secondary" id="dmc-reset-combat">Reset</button>
          </div>
        </div>
        <div id="dmc-combatant-list"></div>
        <div id="dmc-add-form">
          <div class="dmc-section-title">Add Combatant</div>
          <input id="dmc-add-name" type="text" placeholder="Name (e.g. Goblin 1)">
          <div class="dmc-form-row">
            <label>Init <input id="dmc-add-init" type="number" placeholder="15" min="1" max="30" value=""></label>
            <label>Max HP <input id="dmc-add-hp" type="number" placeholder="10" min="1" value=""></label>
            <label>AC <input id="dmc-add-ac" type="number" placeholder="13" min="1" value=""></label>
          </div>
          <div class="dmc-form-row">
            <label><input id="dmc-add-player" type="checkbox"> Player</label>
            <button class="dmc-btn" id="dmc-add-btn" style="margin-left:auto">Add</button>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="dmc-panel" data-panel="notes">
        <div id="dmc-notes-header">
          <span>Session Notes</span>
          <span id="dmc-notes-sync"></span>
        </div>
        <textarea id="dmc-notes-area" placeholder="Write session notes here... Synced across devices via Chrome storage."></textarea>
      </div>

      <!-- Encounter -->
      <div class="dmc-panel" data-panel="encounter">
        <div id="dmc-encounter-inner"></div>
      </div>

      <!-- Monsters -->
      <div class="dmc-panel" data-panel="monsters">
        <div id="dmc-monsters-inner"></div>
      </div>
    </div>
  `;
  shadow.appendChild(container);

  // ── Element references ────────────────────────────────────────────────────

  const sidebar = shadow.getElementById('dmc-sidebar');
  const toggleBtn = shadow.getElementById('dmc-toggle-btn');

  // ── Helpers ────────────────────────────────────────────────────────────────

  function abilityMod(score) {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function saveCombatState() {
    chrome.storage.local.set({ dmcCombat: state.combat }).catch(() => {});
  }

  function saveEncounterState() {
    chrome.storage.local.set({ dmcEncounter: state.encounter }).catch(() => {});
  }

  // ── Sidebar toggle ─────────────────────────────────────────────────────────

  function showSidebar() {
    state.sidebarVisible = true;
    sidebar.style.display = 'flex';
    toggleBtn.style.display = 'none';
    host.style.pointerEvents = 'none'; // sidebar handles its own pointer events
  }

  function hideSidebar() {
    state.sidebarVisible = false;
    sidebar.style.display = 'none';
    toggleBtn.style.display = 'block';
  }

  toggleBtn.addEventListener('click', showSidebar);
  shadow.getElementById('dmc-close').addEventListener('click', hideSidebar);

  // ── Tab switching ──────────────────────────────────────────────────────────

  shadow.querySelectorAll('.dmc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Pro gate check
      if ((tabName === 'encounter' || tabName === 'monsters') && !state.isPro) {
        // allow click, pro gate shown inside panel
      }

      shadow.querySelectorAll('.dmc-tab').forEach(t => t.classList.remove('active'));
      shadow.querySelectorAll('.dmc-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      shadow.querySelector(`.dmc-panel[data-panel="${tabName}"]`).classList.add('active');
      state.activeTab = tabName;

      if (tabName === 'encounter') renderEncounterPanel();
      if (tabName === 'monsters') renderMonstersPanel();
    });
  });

  // ── Initiative Tracker ────────────────────────────────────────────────────

  function renderCombatants() {
    const list = shadow.getElementById('dmc-combatant-list');
    if (!list) return;

    if (state.combat.combatants.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:#666;padding:16px;font-size:12px;">No combatants yet.<br>Add below to start tracking.</div>';
      return;
    }

    list.innerHTML = '';
    state.combat.combatants.forEach((c, idx) => {
      const isActive = idx === state.combat.turnIndex;
      const hpPct = c.maxHp > 0 ? c.hp / c.maxHp : 1;
      const hpClass = hpPct <= 0 ? 'dead' : hpPct <= 0.5 ? (hpPct <= 0.25 ? 'bloodied' : 'hurt') : '';

      const row = document.createElement('div');
      row.className = `dmc-combatant${isActive ? ' active' : ''}${c.isPlayer ? ' player' : ''}${c.hp <= 0 ? ' dead' : ''}`;
      row.dataset.id = c.id;
      row.innerHTML = `
        <span class="dmc-c-init">${c.initiative}</span>
        <span class="dmc-c-name" title="${c.name}">${c.name}</span>
        <span class="dmc-c-ac" title="Armor Class">🛡${c.ac}</span>
        <div class="dmc-hp-controls">
          <button class="dmc-hp-btn dmc-dmg-btn" data-id="${c.id}" title="Damage / Heal">±</button>
          <span class="dmc-hp-display ${hpClass}">${c.hp}/${c.maxHp}</span>
        </div>
        <div class="dmc-c-actions">
          <button class="dmc-btn small secondary dmc-move-up" data-id="${c.id}" title="Move up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="dmc-btn small secondary dmc-move-down" data-id="${c.id}" title="Move down" ${idx === state.combat.combatants.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="dmc-btn small danger dmc-remove-btn" data-id="${c.id}" title="Remove">✕</button>
        </div>
      `;
      list.appendChild(row);
    });

    // Bind combatant action buttons
    list.querySelectorAll('.dmc-dmg-btn').forEach(btn => {
      btn.addEventListener('click', (e) => openDmgModal(btn.dataset.id, btn));
    });
    list.querySelectorAll('.dmc-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.combat.combatants = state.combat.combatants.filter(c => c.id !== btn.dataset.id);
        if (state.combat.turnIndex >= state.combat.combatants.length && state.combat.combatants.length > 0) {
          state.combat.turnIndex = state.combat.combatants.length - 1;
        }
        saveCombatState();
        renderCombatants();
      });
    });
    list.querySelectorAll('.dmc-move-up').forEach(btn => {
      btn.addEventListener('click', () => moveCombatant(btn.dataset.id, -1));
    });
    list.querySelectorAll('.dmc-move-down').forEach(btn => {
      btn.addEventListener('click', () => moveCombatant(btn.dataset.id, 1));
    });

    shadow.getElementById('dmc-round-label').textContent = `Round ${state.combat.round}`;
  }

  function moveCombatant(id, direction) {
    const idx = state.combat.combatants.findIndex(c => c.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= state.combat.combatants.length) return;
    const arr = state.combat.combatants;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    // Keep turn index pointing to the same combatant
    if (state.combat.turnIndex === idx) state.combat.turnIndex = newIdx;
    else if (state.combat.turnIndex === newIdx) state.combat.turnIndex = idx;
    saveCombatState();
    renderCombatants();
  }

  // Damage/Heal inline modal
  function openDmgModal(combatantId, anchorBtn) {
    // Remove any existing modal
    shadow.querySelectorAll('#dmc-dmg-modal').forEach(m => m.remove());

    const modal = document.createElement('div');
    modal.id = 'dmc-dmg-modal';
    modal.innerHTML = `
      <label>Amount</label>
      <input type="number" id="dmc-dmg-amount" min="0" placeholder="e.g. 5" style="width:100%;box-sizing:border-box;margin-bottom:8px">
      <div class="dmc-modal-btns">
        <button class="dmc-btn small danger" id="dmc-do-dmg">Damage</button>
        <button class="dmc-btn small" id="dmc-do-heal" style="background:#27ae60">Heal</button>
        <button class="dmc-btn small secondary" id="dmc-cancel-dmg">✕</button>
      </div>
    `;

    // Position near the button
    const list = shadow.getElementById('dmc-combatant-list');
    list.appendChild(modal);
    const input = modal.querySelector('#dmc-dmg-amount');
    input.focus();

    function applyDmg(delta) {
      const c = state.combat.combatants.find(x => x.id === combatantId);
      if (c) {
        c.hp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
        saveCombatState();
      }
      modal.remove();
      renderCombatants();
    }

    modal.querySelector('#dmc-do-dmg').addEventListener('click', () => {
      const amt = parseInt(input.value) || 0;
      applyDmg(-amt);
    });
    modal.querySelector('#dmc-do-heal').addEventListener('click', () => {
      const amt = parseInt(input.value) || 0;
      applyDmg(+amt);
    });
    modal.querySelector('#dmc-cancel-dmg').addEventListener('click', () => modal.remove());
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const amt = parseInt(input.value) || 0;
        applyDmg(-amt); // Enter = damage by default
      }
      if (e.key === 'Escape') modal.remove();
    });
  }

  // Add combatant form
  shadow.getElementById('dmc-add-btn').addEventListener('click', () => {
    const name = shadow.getElementById('dmc-add-name').value.trim();
    const init = parseInt(shadow.getElementById('dmc-add-init').value) || 0;
    const hp = parseInt(shadow.getElementById('dmc-add-hp').value) || 1;
    const ac = parseInt(shadow.getElementById('dmc-add-ac').value) || 10;
    const isPlayer = shadow.getElementById('dmc-add-player').checked;

    if (!name) {
      shadow.getElementById('dmc-add-name').focus();
      return;
    }

    state.combat.combatants.push({ id: generateId(), name, initiative: init, hp, maxHp: hp, ac, isPlayer });
    // Sort by initiative descending
    state.combat.combatants.sort((a, b) => b.initiative - a.initiative);

    // Clear form
    shadow.getElementById('dmc-add-name').value = '';
    shadow.getElementById('dmc-add-init').value = '';
    shadow.getElementById('dmc-add-hp').value = '';
    shadow.getElementById('dmc-add-ac').value = '';
    shadow.getElementById('dmc-add-player').checked = false;
    shadow.getElementById('dmc-add-name').focus();

    saveCombatState();
    renderCombatants();
  });

  // Enter key in name field adds combatant
  shadow.getElementById('dmc-add-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') shadow.getElementById('dmc-add-btn').click();
  });

  // Next turn
  shadow.getElementById('dmc-next-turn').addEventListener('click', () => {
    if (state.combat.combatants.length === 0) return;
    state.combat.turnIndex = (state.combat.turnIndex + 1) % state.combat.combatants.length;
    if (state.combat.turnIndex === 0) state.combat.round++;
    saveCombatState();
    renderCombatants();
  });

  // Reset combat
  shadow.getElementById('dmc-reset-combat').addEventListener('click', () => {
    if (!confirm('Reset combat? This will clear all combatants and reset the round counter.')) return;
    state.combat = { round: 1, turnIndex: 0, combatants: [] };
    saveCombatState();
    renderCombatants();
  });

  // ── Session Notes ──────────────────────────────────────────────────────────

  function loadNotes() {
    chrome.storage.sync.get({ dmcNotes: '' }, ({ dmcNotes }) => {
      const area = shadow.getElementById('dmc-notes-area');
      if (area) area.value = dmcNotes;
    });
  }

  shadow.getElementById('dmc-notes-area').addEventListener('input', () => {
    const syncEl = shadow.getElementById('dmc-notes-sync');
    if (syncEl) syncEl.textContent = 'Saving…';
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => {
      const text = shadow.getElementById('dmc-notes-area').value;
      chrome.storage.sync.set({ dmcNotes: text }, () => {
        if (syncEl) {
          syncEl.textContent = 'Synced ✓';
          setTimeout(() => { if (syncEl) syncEl.textContent = ''; }, 2000);
        }
      });
    }, NOTES_DEBOUNCE_MS);
  });

  // ── Encounter Panel ────────────────────────────────────────────────────────

  function renderEncounterPanel() {
    const inner = shadow.getElementById('dmc-encounter-inner');
    if (!inner) return;

    if (!state.isPro) {
      inner.innerHTML = `
        <div class="dmc-pro-gate">
          <p>🔒 Encounter Difficulty Estimator is a <strong>Pro</strong> feature</p>
        </div>
      `;
      return;
    }

    inner.innerHTML = `
      <div class="dmc-section-title">Party</div>
      <div class="dmc-party-row">
        <label>Size <input type="number" id="dmc-party-size" min="1" max="10" value="${state.partySize}" style="width:50px"></label>
        <label>Avg Level <input type="number" id="dmc-party-level" min="1" max="20" value="${state.partyLevel}" style="width:50px"></label>
        <button class="dmc-btn small" id="dmc-calc-btn">Calculate</button>
      </div>
      <div id="dmc-xp-thresholds"></div>

      <div class="dmc-section-title">Encounter Monsters</div>
      <div id="dmc-enc-monsters"></div>
      <div id="dmc-enc-result" style="margin-top:8px"></div>

      <div style="margin-top:6px">
        <input type="text" id="dmc-enc-search" placeholder="Search monster to add…" style="width:100%;box-sizing:border-box">
        <div id="dmc-enc-search-results" style="margin-top:4px"></div>
      </div>
    `;

    shadow.getElementById('dmc-party-size').addEventListener('change', e => {
      state.partySize = parseInt(e.target.value) || 4;
    });
    shadow.getElementById('dmc-party-level').addEventListener('change', e => {
      state.partyLevel = parseInt(e.target.value) || 5;
      renderThresholds();
    });
    shadow.getElementById('dmc-calc-btn').addEventListener('click', () => {
      renderThresholds();
      renderEncounterResult();
    });

    renderThresholds();
    renderEncounterMonsters();
    renderEncounterResult();

    // Monster search for encounter builder
    const encSearch = shadow.getElementById('dmc-enc-search');
    encSearch.addEventListener('input', () => {
      const q = encSearch.value.trim().toLowerCase();
      const resultsDiv = shadow.getElementById('dmc-enc-search-results');
      if (!q || q.length < 2) { resultsDiv.innerHTML = ''; return; }
      const matches = fuzzySearch(q, 6);
      resultsDiv.innerHTML = '';
      matches.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'dmc-btn small secondary';
        btn.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:3px';
        btn.textContent = `${m.name} (CR ${m.cr})`;
        btn.addEventListener('click', () => {
          addToEncounter(m);
          encSearch.value = '';
          resultsDiv.innerHTML = '';
        });
        resultsDiv.appendChild(btn);
      });
    });
  }

  function renderThresholds() {
    const div = shadow.getElementById('dmc-xp-thresholds');
    if (!div) return;
    const lvl = Math.max(1, Math.min(20, state.partyLevel));
    const thresh = XP_THRESHOLDS[lvl] || XP_THRESHOLDS[20];
    const partyThresh = thresh.map(t => t * state.partySize);
    div.innerHTML = `
      <div class="dmc-threshold-cell easy"><div class="label">Easy</div><div class="value">${partyThresh[0].toLocaleString()}</div></div>
      <div class="dmc-threshold-cell medium"><div class="label">Medium</div><div class="value">${partyThresh[1].toLocaleString()}</div></div>
      <div class="dmc-threshold-cell hard"><div class="label">Hard</div><div class="value">${partyThresh[2].toLocaleString()}</div></div>
      <div class="dmc-threshold-cell deadly"><div class="label">Deadly</div><div class="value">${partyThresh[3].toLocaleString()}</div></div>
    `;
  }

  function renderEncounterMonsters() {
    const div = shadow.getElementById('dmc-enc-monsters');
    if (!div) return;
    div.innerHTML = '';
    if (state.encounter.monsters.length === 0) {
      div.innerHTML = '<div style="color:#666;font-size:11px;text-align:center">Search below to add monsters</div>';
      return;
    }
    state.encounter.monsters.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'dmc-enc-monster-row';
      row.innerHTML = `
        <span class="dmc-enc-monster-name">${m.name}</span>
        <span class="dmc-enc-monster-cr">CR ${m.cr}</span>
        <div style="display:flex;align-items:center;gap:4px">
          <button class="dmc-hp-btn dmc-enc-dec" data-idx="${idx}">−</button>
          <span style="font-weight:700;min-width:20px;text-align:center">${m.count}</span>
          <button class="dmc-hp-btn dmc-enc-inc" data-idx="${idx}">+</button>
        </div>
        <button class="dmc-btn small danger dmc-enc-remove" data-idx="${idx}">✕</button>
        <button class="dmc-btn small secondary dmc-enc-to-init" data-idx="${idx}" title="Add to initiative">⚔</button>
      `;
      div.appendChild(row);
    });

    div.querySelectorAll('.dmc-enc-inc').forEach(b => b.addEventListener('click', () => {
      state.encounter.monsters[b.dataset.idx].count++;
      saveEncounterState();
      renderEncounterMonsters();
      renderEncounterResult();
    }));
    div.querySelectorAll('.dmc-enc-dec').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx);
      state.encounter.monsters[idx].count = Math.max(1, state.encounter.monsters[idx].count - 1);
      saveEncounterState();
      renderEncounterMonsters();
      renderEncounterResult();
    }));
    div.querySelectorAll('.dmc-enc-remove').forEach(b => b.addEventListener('click', () => {
      state.encounter.monsters.splice(parseInt(b.dataset.idx), 1);
      saveEncounterState();
      renderEncounterMonsters();
      renderEncounterResult();
    }));
    div.querySelectorAll('.dmc-enc-to-init').forEach(b => b.addEventListener('click', () => {
      const m = state.encounter.monsters[parseInt(b.dataset.idx)];
      const monster = SRD_MONSTERS.find(x => x.name === m.name);
      for (let i = 1; i <= m.count; i++) {
        const dexMod = monster ? Math.floor((monster.dex - 10) / 2) : 0;
        const roll = Math.floor(Math.random() * 20) + 1 + dexMod;
        state.combat.combatants.push({
          id: generateId(),
          name: m.count > 1 ? `${m.name} ${i}` : m.name,
          initiative: roll,
          hp: monster ? monster.hp : 10,
          maxHp: monster ? monster.hp : 10,
          ac: monster ? monster.ac : 10,
          isPlayer: false,
        });
      }
      state.combat.combatants.sort((a, b) => b.initiative - a.initiative);
      saveCombatState();
      // Switch to initiative tab
      shadow.querySelector('.dmc-tab[data-tab="initiative"]').click();
    }));
  }

  function renderEncounterResult() {
    const div = shadow.getElementById('dmc-enc-result');
    if (!div || state.encounter.monsters.length === 0) {
      if (div) div.innerHTML = '';
      return;
    }

    const lvl = Math.max(1, Math.min(20, state.partyLevel));
    const thresh = XP_THRESHOLDS[lvl] || XP_THRESHOLDS[20];
    const partyThresh = thresh.map(t => t * state.partySize);

    const totalMonsters = state.encounter.monsters.reduce((s, m) => s + m.count, 0);
    const rawXp = state.encounter.monsters.reduce((s, m) => s + (crToXp(m.cr) * m.count), 0);
    const mult = getEncounterMultiplier(totalMonsters, state.partySize);
    const adjXp = Math.round(rawXp * mult);

    let difficulty = 'Trivial';
    let cls = 'trivial';
    if (adjXp >= partyThresh[3]) { difficulty = 'DEADLY'; cls = 'deadly'; }
    else if (adjXp >= partyThresh[2]) { difficulty = 'Hard'; cls = 'hard'; }
    else if (adjXp >= partyThresh[1]) { difficulty = 'Medium'; cls = 'medium'; }
    else if (adjXp >= partyThresh[0]) { difficulty = 'Easy'; cls = 'easy'; }

    div.className = cls;
    div.innerHTML = `
      <div style="font-size:18px;margin-bottom:4px">${difficulty}</div>
      <div style="font-size:11px;color:#aaa">${rawXp.toLocaleString()} XP × ${mult} = <strong>${adjXp.toLocaleString()} adj. XP</strong></div>
    `;
  }

  function addToEncounter(monster) {
    const existing = state.encounter.monsters.find(m => m.name === monster.name);
    if (existing) {
      existing.count++;
    } else {
      state.encounter.monsters.push({ name: monster.name, cr: monster.cr, count: 1 });
    }
    saveEncounterState();
    renderEncounterMonsters();
    renderEncounterResult();
  }

  // ── Monsters Panel ─────────────────────────────────────────────────────────

  function renderMonstersPanel() {
    const inner = shadow.getElementById('dmc-monsters-inner');
    if (!inner) return;

    if (!state.isPro) {
      inner.innerHTML = `
        <div class="dmc-pro-gate">
          <p>🔒 Monster Quick-Reference is a <strong>Pro</strong> feature</p>
        </div>
      `;
      return;
    }

    inner.innerHTML = `
      <input type="text" id="dmc-monster-search-input" placeholder="Search monsters (e.g. Goblin, Dragon…)" style="width:100%;box-sizing:border-box;margin-bottom:8px">
      <div id="dmc-monster-results"></div>
    `;

    const searchInput = shadow.getElementById('dmc-monster-search-input');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      const results = shadow.getElementById('dmc-monster-results');
      if (!q || q.length < 2) {
        results.innerHTML = '<div style="color:#666;font-size:12px;text-align:center;padding:12px">Type to search SRD monsters</div>';
        return;
      }
      const matches = fuzzySearch(q, 8);
      if (matches.length === 0) {
        results.innerHTML = '<div style="color:#888;font-size:12px;text-align:center;padding:8px">No results</div>';
        return;
      }
      results.innerHTML = '';
      matches.forEach(m => results.appendChild(buildMonsterCard(m)));
    });

    searchInput.focus();
    shadow.getElementById('dmc-monster-results').innerHTML = '<div style="color:#666;font-size:12px;text-align:center;padding:12px">Type to search SRD monsters</div>';
  }

  function buildMonsterCard(m) {
    const card = document.createElement('div');
    card.className = 'dmc-monster-card';
    card.innerHTML = `
      <div class="dmc-monster-card-header">
        <span class="dmc-monster-name">${m.name}</span>
        <span class="dmc-monster-meta">CR ${m.cr} • ${m.type}</span>
      </div>
      <div class="dmc-monster-stats">
        <span>AC ${m.ac}</span>
        <span>HP ${m.hp}</span>
        <span>Spd ${m.speed}</span>
      </div>
      <div class="dmc-monster-ability-scores">
        ${['STR','DEX','CON','INT','WIS','CHA'].map((ab, i) => {
          const scores = [m.str, m.dex, m.con, m.int, m.wis, m.cha];
          return `<div class="dmc-ability-cell">
            <span class="ab-label">${ab}</span>
            <span class="ab-val">${scores[i]}</span>
            <span class="ab-mod">(${abilityMod(scores[i])})</span>
          </div>`;
        }).join('')}
      </div>
      ${m.notes ? `<div class="dmc-monster-notes">${m.notes}</div>` : ''}
      <div class="dmc-monster-card-actions">
        <button class="dmc-btn small dmc-add-to-init" title="Add to initiative tracker">+ Initiative</button>
        ${state.isPro ? `<button class="dmc-btn small secondary dmc-add-to-enc" title="Add to encounter builder">+ Encounter</button>` : ''}
      </div>
    `;

    card.querySelector('.dmc-add-to-init').addEventListener('click', () => {
      const dexMod = Math.floor((m.dex - 10) / 2);
      const roll = Math.floor(Math.random() * 20) + 1 + dexMod;
      state.combat.combatants.push({
        id: generateId(),
        name: m.name,
        initiative: roll,
        hp: m.hp,
        maxHp: m.hp,
        ac: m.ac,
        isPlayer: false,
      });
      state.combat.combatants.sort((a, b) => b.initiative - a.initiative);
      saveCombatState();
      shadow.querySelector('.dmc-tab[data-tab="initiative"]').click();
    });

    if (state.isPro) {
      card.querySelector('.dmc-add-to-enc').addEventListener('click', () => {
        addToEncounter(m);
        shadow.querySelector('.dmc-tab[data-tab="encounter"]').click();
      });
    }

    return card;
  }

  // ── Fuzzy search ───────────────────────────────────────────────────────────

  function fuzzySearch(query, limit = 8) {
    const q = query.toLowerCase();
    const results = [];
    for (const m of SRD_MONSTERS) {
      const name = m.name.toLowerCase();
      if (name.includes(q)) results.push({ score: name.startsWith(q) ? 0 : 1, m });
    }
    results.sort((a, b) => a.score - b.score || a.m.name.localeCompare(b.m.name));
    return results.slice(0, limit).map(r => r.m);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    // Load Pro status and saved state
    const stored = await new Promise(res => {
      chrome.storage.sync.get({ isPro: true, dmcNotes: '', dmcPartySize: 4, dmcPartyLevel: 5 }, res);
    });
    state.isPro = stored.isPro;
    state.partySize = stored.dmcPartySize;
    state.partyLevel = stored.dmcPartyLevel;

    const localStored = await new Promise(res => {
      chrome.storage.local.get({ dmcCombat: null, dmcEncounter: { monsters: [] } }, res);
    });
    if (localStored.dmcCombat) state.combat = localStored.dmcCombat;
    state.encounter = localStored.dmcEncounter;

    loadNotes();
    renderCombatants();

    // Listen for Pro status changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isPro) {
        state.isPro = changes.isPro.newValue;
      }
    });
  }

  // ── Hotkey ─────────────────────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === HOTKEY && !e.ctrlKey && !e.metaKey) {
      // Don't fire inside inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (state.sidebarVisible) hideSidebar(); else showSidebar();
    }
  });

  init();

})();
