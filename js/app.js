/**
 * Self Changing - Offline Habit Tracker
 * 100% Offline, LocalStorage Persisted
 */
(function () {
  'use strict';

  const DEFAULT_HABITS = [
    { id:'h_porn',      title:'Porn once in a week',               icon:'🛡️', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_mast',      title:'Masturbation once in a week',       icon:'⚡', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_no_sugar',  title:'No Sugar',                          icon:'🥗', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_cigs',      title:'2 Cigarettes in a day',             icon:'🚬', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_sleep_1am', title:'Sleep before 1am',                  icon:'🌙', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_sleep_7h',  title:'7hr Sleep',                         icon:'💤', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_study',     title:'Study 3hr',                         icon:'📚', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_guitar',    title:'Play guitar for 1hr',               icon:'🎸', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_workout',   title:'Workout at home',                   icon:'🏋️', subItems:['40 Pushups','40 Squats','1min Plank'], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_water',     title:'Drink 2-3L water',                  icon:'💧', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_groom',     title:'Face and hair care daily 1hr',      icon:'💆', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_meditate',  title:'5 min meditation',                  icon:'🧘', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_social',    title:'Social media < 3h',                 icon:'📱', subItems:[], createdAt:'2026-01-01', deletedAt:null },
    { id:'h_positive',  title:'Stayed positive throughout the day',icon:'✨', subItems:[], createdAt:'2026-01-01', deletedAt:null },
  ];

  const STORAGE_KEY = 'self_changing_app_state_v1';
  let state = { habits: [], logs: {}, meta: { version: 1 } };
  let selectedDate = getTodayStr();
  const nowInit = new Date();
  let calYear  = nowInit.getFullYear();
  let calMonth = nowInit.getMonth();
  let deferredPrompt = null;
  let selectedModalEmoji = '⭐';

  // ── INIT ─────────────────────────────────────────────────────────────────────
  function init() {
    loadState();
    registerServiceWorker();
    setupEventListeners();
    setupPWAInstall();
    setupKeyboardHandler();
    selectedDate = getTodayStr();
    const t = new Date();
    calYear  = t.getFullYear();
    calMonth = t.getMonth();

    // Remember active view on refresh
    const savedView = localStorage.getItem('sc_active_view') || 'view-daily';
    switchView(savedView);
    if (savedView === 'view-calendar') { renderMonthPills(); renderCalendarGrid(); }
    if (savedView === 'view-stats')    renderStats();
    if (savedView === 'view-settings') renderSettingsList();
    if (savedView === 'view-daily')    renderDailyView();
    renderStreakBadge();

    scheduleAutoRefresh();
  }

  function scheduleAutoRefresh() {
    const now = new Date();
    const ms  = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime();
    setTimeout(() => {
      selectedDate = getTodayStr();
      const t = new Date();
      calYear  = t.getFullYear();
      calMonth = t.getMonth();
      renderAll();
      scheduleAutoRefresh();
    }, ms);
  }

  // ── STORAGE ──────────────────────────────────────────────────────────────────
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = JSON.parse(saved);
        if (!state.habits || !state.habits.length) state.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
        if (!state.logs) state.logs = {};
      } else {
        state.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
        state.logs   = {};
        saveState();
      }
    } catch (e) {
      state.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
      state.logs   = {};
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ── SERVICE WORKER ───────────────────────────────────────────────────────────
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            reg.update();
            reg.onupdatefound = () => {
              const installing = reg.installing;
              if (installing) {
                installing.onstatechange = () => {
                  if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                    window.location.reload();
                  }
                };
              }
            };
          })
          .catch(() => {});
      });
    }
  }

  // ── KEYBOARD HANDLER (fixes save button hidden behind keyboard) ──────────────
  function setupKeyboardHandler() {
    if (!window.visualViewport) return;

    function adjustModalForKeyboard() {
      const vh = window.visualViewport.height;
      document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
        const sheet = overlay.querySelector('.modal-sheet.modal-flex');
        if (sheet) {
          // Limit sheet height to visible viewport minus small margin
          sheet.style.maxHeight = Math.floor(vh * 0.97) + 'px';
        }
      });
    }

    window.visualViewport.addEventListener('resize', adjustModalForKeyboard);
    window.visualViewport.addEventListener('scroll', adjustModalForKeyboard);
  }

  // ── DATE UTILS ───────────────────────────────────────────────────────────────
  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function parseDateKey(key) { const p = key.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  function formatDisplayDate(dateStr) {
    return parseDateKey(dateStr).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  }

  // ── HABIT FILTERING ──────────────────────────────────────────────────────────
  // KEY FIX: For today, ONLY show currently active habits (no deleted bypass).
  // For past dates, also show habits that had log entries (historical records).
  function getHabitsForDate(targetDate) {
    const todayStr  = getTodayStr();
    const isToday   = targetDate === todayStr;
    const dayLog    = state.logs[targetDate];
    const logChecks = dayLog && dayLog.checks;

    return state.habits.filter(h => {
      const createdOk  = !h.createdAt || targetDate >= h.createdAt;
      const notDeleted = !h.deletedAt || targetDate < h.deletedAt;

      if (isToday) {
        // Today: ONLY show active, not-yet-deleted habits
        return createdOk && notDeleted;
      }
      // Past dates: show if active then, OR if historical log entry exists
      const wasChecked = logChecks && (h.id in logChecks);
      return (createdOk && notDeleted) || wasChecked;
    });
  }

  function getEntry(habit, dateStr) {
    const log = state.logs[dateStr];
    if (!log || !log.checks || !(habit.id in log.checks)) return null;
    const e = log.checks[habit.id];
    if (e === true)  return { status:'done',   reason:'', subItems:[] };
    if (e === false) return null;
    if (typeof e === 'object' && e) {
      if (e.status) return { status:e.status, reason:e.reason||'', subItems:e.subItems||[] };
      if (e.completed) return { status:'done', reason:'', subItems:e.subItems||[] };
    }
    return null;
  }

  function isHabitDone(habit, dateStr)   { const e=getEntry(habit,dateStr); return !!(e && e.status==='done');   }
  function isHabitMissed(habit, dateStr) { const e=getEntry(habit,dateStr); return !!(e && e.status==='missed'); }
  function getHabitReason(habit, dateStr){ const e=getEntry(habit,dateStr); return e ? e.reason : ''; }
  function isSubDone(habit, idx, dateStr){ const e=getEntry(habit,dateStr); return e && e.subItems && !!e.subItems[idx]; }

  // ── CHECK-IN ACTIONS ─────────────────────────────────────────────────────────
  function ensureLog(dateStr) {
    if (!state.logs[dateStr]) state.logs[dateStr] = { checks:{} };
  }

  function handleRightCheck(habitId, dateStr) {
    ensureLog(dateStr);
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;
    const currentDone = isHabitDone(habit, dateStr);
    if (currentDone) {
      delete state.logs[dateStr].checks[habitId];
    } else {
      const subArr = habit.subItems && habit.subItems.length ? habit.subItems.map(()=>true) : [];
      state.logs[dateStr].checks[habitId] = { status:'done', reason:'', subItems:subArr };
    }
    saveState(); triggerHaptic(); playTone(!currentDone);
    renderDailyView(); renderCalendarGrid(); renderStats();
    if (!currentDone) checkCelebration(dateStr);
  }

  function handleCrossCheck(habitId, dateStr) {
    ensureLog(dateStr);
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;
    const currentMissed = isHabitMissed(habit, dateStr);
    if (currentMissed) {
      delete state.logs[dateStr].checks[habitId];
    } else {
      const subArr = habit.subItems && habit.subItems.length ? habit.subItems.map(()=>false) : [];
      state.logs[dateStr].checks[habitId] = { status:'missed', reason:'', subItems:subArr };
    }
    saveState(); triggerHaptic(); playTone(false);
    renderDailyView(); renderCalendarGrid(); renderStats();
  }

  function toggleSubItem(habitId, subIdx, dateStr) {
    ensureLog(dateStr);
    const habit  = state.habits.find(h => h.id === habitId);
    if (!habit || !habit.subItems) return;
    const entry  = getEntry(habit, dateStr);
    const subArr = (entry && entry.subItems && entry.subItems.length === habit.subItems.length)
                   ? [...entry.subItems] : habit.subItems.map(()=>false);
    subArr[subIdx] = !subArr[subIdx];
    const allDone  = subArr.every(Boolean);
    state.logs[dateStr].checks[habitId] = { status:'done', reason:'', subItems:subArr };
    saveState(); triggerHaptic(); playTone(subArr[subIdx]);
    renderDailyView(); renderCalendarGrid(); renderStats();
    if (allDone) checkCelebration(dateStr);
  }

  // ── SOUND & HAPTIC ───────────────────────────────────────────────────────────
  function triggerHaptic() { try { navigator.vibrate && navigator.vibrate(12); } catch(e){} }
  function playTone(positive) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC(), osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(positive ? 587.33 : 280, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.15);
      osc.start(); osc.stop(ctx.currentTime+0.15);
    } catch(e){}
  }

  // ── CONFETTI ─────────────────────────────────────────────────────────────────
  function checkCelebration(dateStr) {
    const habits = getHabitsForDate(dateStr);
    if (!habits.length) return;
    if (habits.every(h => isHabitDone(h, dateStr))) {
      fireConfetti();
      showToast('🎉 All habits done! Incredible!');
    }
  }

  function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const colors = ['#10b981','#34d399','#f59e0b','#3b82f6','#ec4899','#a855f7'];
    const pieces = Array.from({length:90}, () => ({
      x: canvas.width/2, y: canvas.height/2,
      w: Math.random()*8+4, h: Math.random()*8+4,
      color: colors[Math.floor(Math.random()*colors.length)],
      vx: (Math.random()-0.5)*16, vy: (Math.random()-0.5)*16-4,
      rot: Math.random()*360, vrot: (Math.random()-0.5)*12, opacity:1
    }));
    let frame = 0;
    (function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      let alive = false;
      pieces.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.35; p.rot+=p.vrot; p.opacity-=0.012;
        if (p.opacity>0) {
          alive=true;
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
          ctx.globalAlpha=p.opacity; ctx.fillStyle=p.color;
          ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
        }
      });
      if (alive && ++frame<120) requestAnimationFrame(draw);
      else ctx.clearRect(0,0,canvas.width,canvas.height);
    })();
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────
  function renderAll() {
    renderDailyView();
    renderMonthPills();
    renderCalendarGrid();
    renderStats();
    renderSettingsList();
    renderStreakBadge();
  }

  // ── 1. DAILY VIEW ────────────────────────────────────────────────────────────
  function renderDailyView() {
    selectedDate = getTodayStr(); // always locked to today
    const subElem = document.getElementById('display-date-sub');
    if (subElem) subElem.textContent = formatDisplayDate(selectedDate);

    const habits    = getHabitsForDate(selectedDate);
    const container = document.getElementById('daily-habits-container');
    if (!container) return;
    container.innerHTML = '';

    let doneCount = 0, missedCount = 0;

    habits.forEach(habit => {
      const isDone   = isHabitDone(habit, selectedDate);
      const isMissed = isHabitMissed(habit, selectedDate);
      if (isDone)   doneCount++;
      if (isMissed) missedCount++;

      let subHTML = '';
      if (habit.subItems && habit.subItems.length) {
        const rows = habit.subItems.map((t, i) => {
          const sd = isSubDone(habit, i, selectedDate);
          return `<div class="sub-item-row ${sd?'done':''}" data-sub-idx="${i}">
            <span class="sub-item-title"><span>${sd?'✓':'•'}</span><span>${esc(t)}</span></span>
            <div class="sub-check-box"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
          </div>`;
        }).join('');
        subHTML = `<div class="sub-items-container">${rows}</div>`;
      }

      const card = document.createElement('div');
      card.className = `habit-card ${isDone?'status-done':''} ${isMissed?'status-missed':''}`;
      card.innerHTML = `
        <div class="habit-card-main">
          <div class="habit-left">
            <div class="habit-icon">${habit.icon||'⭐'}</div>
            <div class="habit-info">
              <span class="habit-title">${esc(habit.title)}</span>
            </div>
          </div>
          <div class="habit-actions-group">
            <button class="check-action-btn btn-check ${isDone?'active':''}" title="Done">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="check-action-btn btn-cross ${isMissed?'active':''}" title="Missed">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        ${subHTML}`;

      card.querySelector('.btn-check').addEventListener('click', e => { e.stopPropagation(); handleRightCheck(habit.id, selectedDate); });
      card.querySelector('.btn-cross').addEventListener('click', e => { e.stopPropagation(); handleCrossCheck(habit.id, selectedDate); });
      card.querySelectorAll('.sub-item-row').forEach(row => {
        row.addEventListener('click', e => { e.stopPropagation(); toggleSubItem(habit.id, +row.getAttribute('data-sub-idx'), selectedDate); });
      });

      container.appendChild(card);
    });

    const total   = habits.length;
    const percent = total ? Math.round(doneCount/total*100) : 0;
    const pEl = document.getElementById('daily-progress-percent');
    const fEl = document.getElementById('daily-progress-fill');
    const cEl = document.getElementById('daily-progress-count');
    const bEl = document.getElementById('all-done-banner');
    if (pEl) pEl.textContent = `${percent}%`;
    if (fEl) fEl.style.width = `${percent}%`;
    if (cEl) cEl.textContent = missedCount
      ? `${doneCount} done, ${missedCount} missed (${total} total)`
      : `${doneCount} of ${total} Completed`;
    if (bEl) bEl.style.display = (total && doneCount===total) ? 'block' : 'none';
  }

  // ── 2. CALENDAR ──────────────────────────────────────────────────────────────
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function renderMonthPills() {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
    const c = document.getElementById('calendar-month-pills');
    if (!c) return;
    c.innerHTML = '';
    MONTH_SHORT.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.className   = `month-pill-btn ${idx===calMonth?'active':''}`;
      btn.textContent = name;
      btn.disabled    = true;
      c.appendChild(btn);
    });
    const yd = document.getElementById('cal-year-display');
    if (yd) yd.textContent = calYear;
  }

  function renderCalendarGrid() {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();

    const ml = document.getElementById('cal-current-month-label');
    if (ml) ml.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const totalDays   = new Date(calYear, calMonth+1, 0).getDate();
    const prevMonDays = new Date(calYear, calMonth, 0).getDate();
    const todayStr    = getTodayStr();

    let tracked=0, perfect=0, sumPct=0;

    // Padding from previous month
    for (let i=firstDay-1; i>=0; i--) {
      const cell = document.createElement('div');
      cell.className   = 'cal-day-cell other-month';
      cell.textContent = prevMonDays - i;
      grid.appendChild(cell);
    }

    for (let day=1; day<=totalDays; day++) {
      const dayStr  = `${calYear}-${pad(calMonth+1)}-${pad(day)}`;
      const cell    = document.createElement('div');
      cell.className = 'cal-day-cell';
      cell.textContent = day;

      const isToday  = dayStr === todayStr;
      const isFuture = dayStr > todayStr;
      if (isToday)  cell.classList.add('is-today');
      if (isFuture) cell.style.opacity = '0.3';

      const habits    = getHabitsForDate(dayStr);
      const doneCount = habits.filter(h=>isHabitDone(h,dayStr)).length;
      const missCount = habits.filter(h=>isHabitMissed(h,dayStr)).length;

      if (habits.length && (doneCount || missCount)) {
        const pct = Math.round(doneCount/habits.length*100);
        tracked++; sumPct += pct;

        if (missCount > 0) {
          // Any cross check → RED
          cell.classList.add('status-missed-day');
        } else if (doneCount === habits.length) {
          // All right-checked → GREEN
          cell.classList.add('status-perfect');
          perfect++;
        } else {
          // Some right, no cross → PARTIAL (amber)
          cell.classList.add('status-partial');
        }
      }

      if (isToday) {
        cell.addEventListener('click', () => { switchView('view-daily'); renderDailyView(); });
      }
      grid.appendChild(cell);
    }

    // Fill remaining grid cells
    const filled    = firstDay + totalDays;
    const remainder = (7 - (filled%7)) % 7;
    for (let i=1; i<=remainder; i++) {
      const cell = document.createElement('div');
      cell.className   = 'cal-day-cell other-month';
      cell.textContent = i;
      grid.appendChild(cell);
    }

    const st = document.getElementById('cal-summary-tracked');
    const sp = document.getElementById('cal-summary-perfect');
    const sa = document.getElementById('cal-summary-avg');
    if (st) st.textContent = tracked;
    if (sp) sp.textContent = perfect;
    if (sa) sa.textContent = `${tracked ? Math.round(sumPct/tracked) : 0}%`;
  }

  // ── 3. STATS ─────────────────────────────────────────────────────────────────
  function renderStats() {
    const s = calculateStreak();
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('stats-current-streak', s.currentStreak);
    set('stats-best-streak',    s.bestStreak);
    set('stats-total-days',     s.totalDays);
    set('stats-perfect-days',   s.perfectDays);
  }

  function renderStreakBadge() {
    const el = document.getElementById('streak-count');
    if (el) el.textContent = calculateStreak().currentStreak;
  }

  function calculateStreak() {
    const todayStr = getTodayStr();
    let currentStreak = 0, bestStreak = 0, tempStreak = 0, totalDays = 0, perfectDays = 0;

    // Current streak: consecutive perfect days going backward from today
    let checkDate = todayStr;
    let safety = 0;
    while (safety++ < 3650) {
      const habits = getHabitsForDate(checkDate);
      if (!habits.length) break;
      const allDone = habits.every(h => isHabitDone(h, checkDate));
      if (allDone) {
        currentStreak++;
        const d = parseDateKey(checkDate);
        d.setDate(d.getDate()-1);
        checkDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      } else {
        break;
      }
    }

    // All-time stats from logged dates
    Object.keys(state.logs).sort().forEach(dateStr => {
      const habits    = getHabitsForDate(dateStr);
      if (!habits.length) return;
      const done   = habits.filter(h=>isHabitDone(h,dateStr)).length;
      const missed = habits.filter(h=>isHabitMissed(h,dateStr)).length;
      if (done||missed) totalDays++;
      if (done===habits.length && habits.length > 0) {
        perfectDays++; tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    if (currentStreak > bestStreak) bestStreak = currentStreak;
    return { currentStreak, bestStreak, totalDays, perfectDays };
  }

  // ── 4. SETTINGS ──────────────────────────────────────────────────────────────
  function renderSettingsList() {
    const container = document.getElementById('settings-habits-list');
    if (!container) return;
    container.innerHTML = '';
    const activeHabits = state.habits.filter(h => !h.deletedAt);
    activeHabits.forEach((habit, idx) => {
      const item = document.createElement('div');
      item.className = 'settings-habit-item';
      item.setAttribute('draggable', 'true');
      item.dataset.index = idx;
      item.dataset.id = habit.id;

      item.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <circle cx="9" cy="6" r="1.8"/>
            <circle cx="15" cy="6" r="1.8"/>
            <circle cx="9" cy="12" r="1.8"/>
            <circle cx="15" cy="12" r="1.8"/>
            <circle cx="9" cy="18" r="1.8"/>
            <circle cx="15" cy="18" r="1.8"/>
          </svg>
        </div>
        <div class="settings-habit-left">
          <span style="font-size:1.3rem;">${habit.icon||'⭐'}</span>
          <div style="font-weight:600;font-size:0.95rem;">${esc(habit.title)}</div>
        </div>
        <div class="settings-actions">
          <button class="action-icon-btn edit-btn" title="Edit">✏️</button>
          <button class="action-icon-btn delete delete-btn" title="Delete">🗑️</button>
        </div>`;

      item.querySelector('.edit-btn').addEventListener('click',   () => openEditHabitModal(habit));
      item.querySelector('.delete-btn').addEventListener('click', () => openDeleteModal(habit));

      // HTML5 Drag Events (Desktop)
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);

      // Mobile Touch Drag on Handle
      const handle = item.querySelector('.drag-handle');
      if (handle) setupTouchDrag(handle, item, idx);

      container.appendChild(item);
    });
  }

  function moveHabit(fromIndex, toIndex) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= state.habits.length) return;
    const [moved] = state.habits.splice(fromIndex, 1);
    state.habits.splice(toIndex, 0, moved);
    saveState();
    renderSettingsList();
    renderDailyView();
  }

  // Desktop Drag & Drop
  let dragSrcIndex = null;
  function handleDragStart(e) {
    dragSrcIndex = parseInt(this.dataset.index, 10);
    this.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcIndex);
  }
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
  }
  function handleDragLeave() {
    this.classList.remove('drag-over');
  }
  function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('drag-over');
    const dropIndex = parseInt(this.dataset.index, 10);
    if (dragSrcIndex !== null && dragSrcIndex !== dropIndex) {
      moveHabit(dragSrcIndex, dropIndex);
    }
    return false;
  }
  function handleDragEnd() {
    this.classList.remove('is-dragging');
    document.querySelectorAll('.settings-habit-item').forEach(el => el.classList.remove('drag-over'));
  }

  // Mobile Touch Drag
  let touchDragIndex = null;
  function setupTouchDrag(handle, item, index) {
    handle.addEventListener('touchstart', () => {
      touchDragIndex = index;
      item.classList.add('is-dragging');
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetItem = target ? target.closest('.settings-habit-item') : null;
      document.querySelectorAll('.settings-habit-item').forEach(el => el.classList.remove('drag-over'));
      if (targetItem && targetItem !== item) {
        targetItem.classList.add('drag-over');
      }
    }, { passive: true });

    handle.addEventListener('touchend', (e) => {
      item.classList.remove('is-dragging');
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetItem = target ? target.closest('.settings-habit-item') : null;
      document.querySelectorAll('.settings-habit-item').forEach(el => el.classList.remove('drag-over'));
      if (targetItem && targetItem !== item) {
        const targetIdx = parseInt(targetItem.dataset.index, 10);
        if (!isNaN(targetIdx) && targetIdx !== touchDragIndex) {
          moveHabit(touchDragIndex, targetIdx);
        }
      }
      touchDragIndex = null;
    });
  }

  // ── HABIT MODAL ───────────────────────────────────────────────────────────────
  function openAddHabitModal() {
    document.getElementById('modal-habit-title').textContent = 'Add New Habit';
    document.getElementById('modal-habit-id').value          = '';
    document.getElementById('modal-habit-name').value        = '';
    selectedModalEmoji = '⭐';
    highlightEmojiBtn('⭐');
    buildSubitemsUI([]);
    openModal('habit-modal');
  }

  function openEditHabitModal(habit) {
    document.getElementById('modal-habit-title').textContent = 'Edit Habit';
    document.getElementById('modal-habit-id').value          = habit.id;
    document.getElementById('modal-habit-name').value        = habit.title;
    selectedModalEmoji = habit.icon || '⭐';
    highlightEmojiBtn(selectedModalEmoji);
    buildSubitemsUI(habit.subItems || []);
    openModal('habit-modal');
  }

  function highlightEmojiBtn(emoji) {
    document.querySelectorAll('.emoji-choice-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-emoji') === emoji);
    });
  }

  function buildSubitemsUI(items) {
    const list = document.getElementById('subitems-list');
    list.innerHTML = '';
    items.forEach(val => addSubitemRow(val));
  }

  function addSubitemRow(value='') {
    const list = document.getElementById('subitems-list');
    const row  = document.createElement('div');
    row.className = 'subitem-input-row';
    row.innerHTML = `
      <input type="text" class="form-input subitem-input" placeholder="e.g. 40 Pushups" value="${esc(value)}" style="user-select:text;">
      <button type="button" class="remove-subitem-btn">✕</button>`;
    row.querySelector('.remove-subitem-btn').addEventListener('click', () => row.remove());
    list.appendChild(row);
  }

  function getSubItemsFromUI() {
    return Array.from(document.querySelectorAll('.subitem-input'))
      .map(el => el.value.trim()).filter(Boolean);
  }

  function saveHabitModal() {
    const habitId  = document.getElementById('modal-habit-id').value.trim();
    const name     = document.getElementById('modal-habit-name').value.trim();
    const subItems = getSubItemsFromUI();

    if (!name) { showToast('⚠️ Please enter a habit name!'); return; }

    const todayStr = getTodayStr();

    if (!habitId) {
      // New habit -> appended to bottom of list
      state.habits.push({
        id: 'h_' + Date.now(),
        title: name,
        icon: selectedModalEmoji,
        subItems,
        createdAt: todayStr,
        deletedAt: null
      });
      showToast('✅ Habit added!');
    } else {
      // Rename / Edit existing habit -> UPDATE IN PLACE AT ITS EXACT CURRENT INDEX!
      const idx = state.habits.findIndex(h => h.id === habitId);
      if (idx !== -1) {
        state.habits[idx].title = name;
        state.habits[idx].icon = selectedModalEmoji;
        state.habits[idx].subItems = subItems;
        showToast('✅ Habit updated!');
      }
    }
    saveState(); closeAllModals(); renderAll();
  }

  // ── DELETE ────────────────────────────────────────────────────────────────────
  function openDeleteModal(habit) {
    document.getElementById('delete-habit-id').value = habit.id;
    document.getElementById('delete-habit-confirm-text').innerHTML =
      `Permanently delete <strong>"${esc(habit.title)}"</strong>?`;
    openModal('delete-modal');
  }

  function confirmDeleteHabit() {
    const habitId = document.getElementById('delete-habit-id').value;
    const idx = state.habits.findIndex(h => h.id === habitId);
    if (idx !== -1) {
      state.habits.splice(idx, 1);
      saveState();
      showToast('🗑️ Habit deleted.');
    }
    closeAllModals();
    renderAll(); // This re-renders daily view → deleted habit won't appear
  }

  // ── MODALS ────────────────────────────────────────────────────────────────────
  function openModal(id) {
    document.getElementById(id).classList.add('active');
    // Immediately adjust height for current viewport
    if (window.visualViewport) {
      const vh = window.visualViewport.height;
      const sheet = document.querySelector(`#${id} .modal-sheet.modal-flex`);
      if (sheet) sheet.style.maxHeight = Math.floor(vh * 0.97) + 'px';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.classList.remove('active');
      const sheet = m.querySelector('.modal-sheet.modal-flex');
      if (sheet) sheet.style.maxHeight = ''; // reset
    });
  }

  // ── TOAST ─────────────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById('toast-msg');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ── TAB NAV ──────────────────────────────────────────────────────────────────
  function switchView(viewId) {
    document.querySelectorAll('.view-content').forEach(v => {
      v.classList.toggle('active', v.id === viewId);
    });
    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === viewId);
    });
    localStorage.setItem('sc_active_view', viewId);
    window.scrollTo({top:0, behavior:'smooth'});
  }

  // ── PWA ───────────────────────────────────────────────────────────────────────
  function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
    window.addEventListener('appinstalled', () => { deferredPrompt = null; showToast('🎉 App installed!'); });
  }

  // ── EVENT LISTENERS ───────────────────────────────────────────────────────────
  function setupEventListeners() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-view');
        switchView(v);
        if (v==='view-calendar') { renderMonthPills(); renderCalendarGrid(); }
        if (v==='view-stats')    renderStats();
        if (v==='view-settings') renderSettingsList();
      });
    });


    document.getElementById('open-add-habit-modal').addEventListener('click', openAddHabitModal);
    document.getElementById('modal-habit-close').addEventListener('click', closeAllModals);
    document.getElementById('modal-habit-save-btn').addEventListener('click', saveHabitModal);
    document.getElementById('add-subitem-btn').addEventListener('click', () => addSubitemRow(''));

    document.querySelectorAll('.emoji-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedModalEmoji = btn.getAttribute('data-emoji');
        highlightEmojiBtn(selectedModalEmoji);
      });
    });

    document.getElementById('delete-modal-close').addEventListener('click', closeAllModals);
    document.getElementById('delete-modal-cancel').addEventListener('click', closeAllModals);
    document.getElementById('delete-modal-confirm').addEventListener('click', confirmDeleteHabit);

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => { if (e.target === overlay) closeAllModals(); });
    });
  }

  // ── UTIL ──────────────────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
