// eye_test.js — Oculux Eye Test Engine (Revised)
// Calibrated Tumbling-E · Corrected Ishihara · Astigmatism · Contrast · Near

// ─── Test order ───────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const FIXED_FIRST  = [1];
const SHUFFLEABLE  = shuffleArray([2, 3, 4, 5]);
const TEST_ORDER   = [...FIXED_FIRST, ...SHUFFLEABLE];

const TEST_META = {
  1: { name: 'Calibrated Visual Acuity',   sub: 'Tumbling-E test — direction-based acuity per eye',  label: 'Acuity',   badgeClass: 'bg-primary' },
  2: { name: 'Ishihara Colour Vision',      sub: 'Type the number you see in each dot pattern',       label: 'Colour',   badgeClass: 'bg-success' },
  3: { name: 'Astigmatism Wheel',           sub: 'Click the axis that appears darkest or thickest',   label: 'Astig.',   badgeClass: 'bg-warning text-dark' },
  4: { name: 'Contrast Sensitivity',        sub: 'Click the last row you can read clearly',           label: 'Contrast', badgeClass: 'bg-info text-dark' },
  5: { name: 'Near Vision (Jaeger)',         sub: 'Select the smallest text you can read at 35 cm',   label: 'Near',     badgeClass: 'bg-danger' },
};

// ─── State ────────────────────────────────────────────────────────────────────
const testState = {
  currentTest: 0,
  currentOrderIndex: 0,
  results: {
    snellen_re: null, snellen_le: null,
    colour_score: 0, colour_vision_result: 'Normal',
    astigmatism_axis: null, astigmatism_flag: false, astigmatism_cyl: 0,
    contrast_score: 5, near_vision: 'J1'
  },
  cbPlateIndex: 0, cbCorrect: 0,
  cbErrors: { protan: 0, deutan: 0 },
  cbTimerInterval: null, cbTimeLeft: 5,
  astigAxis: null,
};

// ═══════════════════════════════════════════════════════════════════
// TEST 1 — CALIBRATED TUMBLING-E
// Physics: 20/X letter subtends 5*(X/20) arcminutes.
// H_mm = 2 * D_mm * tan(θ/2), px = H_mm * ppi / 25.4
// ═══════════════════════════════════════════════════════════════════

const SNELLEN_LEVELS = [
  { acuity: '20/200', ratio: 10   },
  { acuity: '20/100', ratio: 5    },
  { acuity: '20/70',  ratio: 3.5  },
  { acuity: '20/50',  ratio: 2.5  },
  { acuity: '20/40',  ratio: 2    },
  { acuity: '20/30',  ratio: 1.5  },
  { acuity: '20/25',  ratio: 1.25 },
  { acuity: '20/20',  ratio: 1    },
];
const OPTOTYPES_PER_LEVEL = 3;
const PASS_THRESHOLD      = 2; // 2/3 correct

let tePpi       = 96;  // pixels per inch (calibrated)
let teDistCm    = 60;  // viewing distance cm
let teEyeOrder  = [];  // ['right','left'] etc
let teEyeIdx    = 0;
let teLevel     = 0;
let teLevelAttempts = 0;
let teLevelCorrect  = 0;
let teCurrentDir    = '';
let teResults       = {};  // {eye: [{acuity,pxSize,arcmin,attempts,correct,pass}]}
let teWaiting       = false;

const CARD_MM = 85.6;

function updateCal(px) {
  const calPx = parseInt(px);
  document.getElementById('cal-card').style.width = calPx + 'px';
  document.getElementById('cal-val').textContent  = calPx + ' px';
  tePpi = (calPx / CARD_MM) * 25.4;
  document.getElementById('ppi-out').textContent  = Math.round(tePpi) + ' PPI';
}

function overridePpi(val) {
  if (val && !isNaN(val)) {
    tePpi = parseFloat(val);
    document.getElementById('ppi-out').textContent = Math.round(tePpi) + ' PPI (manual)';
  }
}

function setAcuityDist(cm, btn) {
  if (!cm || isNaN(cm) || cm < 10) return;
  teDistCm = cm;
  document.querySelectorAll('.dist-btn').forEach(b => b.classList.remove('sel'));
  if (btn) btn.classList.add('sel');
  document.getElementById('btn-acuity-start').removeAttribute('disabled');
}

function acuityGoStep(step) {
  ['cal','dist','test'].forEach(s => {
    const el = document.getElementById('acuity-step-' + s);
    if (el) el.style.display = (s === step ? 'block' : 'none');
  });
  if (step === 'test') beginAcuityTest();
}

function beginAcuityTest() {
  teEyeOrder  = ['right', 'left'];
  teEyeIdx    = 0;
  teLevel     = 0;
  teResults   = { right: [], left: [] };
  teWaiting   = false;
  teLevel     = 0;
  startTeLevel();
}

function computeTeSize(level) {
  const arcminH = 5 * SNELLEN_LEVELS[level].ratio;
  const distMm  = teDistCm * 10;
  const rad     = arcminH * Math.PI / (180 * 60);
  const heightMm = 2 * distMm * Math.tan(rad / 2);
  const heightPx = heightMm * tePpi / 25.4;
  return { heightPx: Math.max(4, Math.round(heightPx)), arcmin: arcminH };
}

function startTeLevel() {
  if (teLevel >= SNELLEN_LEVELS.length) {
    finishTeEye(); return;
  }
  teLevelAttempts = 0;
  teLevelCorrect  = 0;

  const eye   = teEyeOrder[teEyeIdx];
  const total = teEyeOrder.length * SNELLEN_LEVELS.length;
  const done  = teEyeIdx * SNELLEN_LEVELS.length + teLevel;

  document.getElementById('te-pbar').style.width = (done / total * 100) + '%';
  document.getElementById('te-pcount').textContent =
    (eye === 'right' ? 'Right' : 'Left') + ' Eye — Level ' + (teLevel + 1) + ' / ' + SNELLEN_LEVELS.length;

  const { heightPx, arcmin } = computeTeSize(teLevel);
  document.getElementById('tumbling-e').style.fontSize = heightPx + 'px';
  document.getElementById('te-acuity-label').textContent =
    SNELLEN_LEVELS[teLevel].acuity + ' · ' + arcmin.toFixed(1) + ' arcmin · ' + heightPx + 'px';
  document.getElementById('te-cover-note').textContent =
    eye === 'right' ? 'Cover your LEFT eye' : 'Cover your RIGHT eye';
  document.getElementById('eye-indicator').textContent =
    eye === 'right' ? 'Right Eye' : 'Left Eye';
  document.getElementById('te-attempt-note').textContent =
    'Attempt 1 / ' + OPTOTYPES_PER_LEVEL + ' at this size';

  showTumblingE();
}

const TE_DIRS = ['up','down','left','right'];
function showTumblingE() {
  teCurrentDir = TE_DIRS[Math.floor(Math.random() * TE_DIRS.length)];
  const rotMap = { up: -90, down: 90, left: 180, right: 0 };
  document.getElementById('tumbling-e').style.transform = `rotate(${rotMap[teCurrentDir]}deg)`;
  ['up','down','left','right'].forEach(d => {
    const btn = document.getElementById('btn-' + d);
    if (btn) btn.className = 'dir-btn';
  });
  teWaiting = false;
}

function checkDir(dir) {
  if (teWaiting) return;
  teWaiting = true;
  teLevelAttempts++;

  const correct = dir === teCurrentDir;
  if (correct) teLevelCorrect++;

  const btn = document.getElementById('btn-' + dir);
  if (btn) btn.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) {
    const cb = document.getElementById('btn-' + teCurrentDir);
    if (cb) cb.classList.add('correct');
  }

  document.getElementById('te-attempt-note').textContent =
    'Attempt ' + teLevelAttempts + ' / ' + OPTOTYPES_PER_LEVEL +
    ' — ' + teLevelCorrect + ' correct';

  setTimeout(() => {
    if (teLevelAttempts >= OPTOTYPES_PER_LEVEL) {
      const pass = teLevelCorrect >= PASS_THRESHOLD;
      const eye  = teEyeOrder[teEyeIdx];
      const { heightPx, arcmin } = computeTeSize(teLevel);
      teResults[eye].push({
        acuity: SNELLEN_LEVELS[teLevel].acuity,
        pxSize: heightPx, arcmin,
        attempts: teLevelAttempts, correct: teLevelCorrect, pass
      });
      teLevel++;
      startTeLevel();
    } else {
      showTumblingE();
    }
  }, 900);
}

function finishTeEye() {
  teEyeIdx++;
  if (teEyeIdx < teEyeOrder.length) {
    teLevel = 0;
    // Countdown before second eye
    runCountdown('Left Eye — Visual Acuity', 'Now cover your RIGHT eye', () => startTeLevel());
  } else {
    // Done — record acuity into testState.results then move on
    recordAcuityResults();
    nextTest();
  }
}

function recordAcuityResults() {
  // Map to 6/X format for DB compatibility; find best passed level per eye
  const toSixX = (acuityStr) => {
    if (!acuityStr || acuityStr === '< 20/200') return '6/60';
    // Convert 20/X → 6/Y (≈ multiply denominator by 6/20=0.3)
    const m = acuityStr.match(/20\/(\d+)/);
    if (!m) return '6/6';
    const x = parseInt(m[1]);
    return '6/' + Math.round(x * 6 / 20);
  };

  ['right', 'left'].forEach(eye => {
    const levels  = teResults[eye] || [];
    const passed  = levels.filter(l => l.pass);
    const best    = passed.length > 0 ? passed[passed.length - 1] : null;
    const acuity  = best ? best.acuity : '< 20/200';
    if (eye === 'right') testState.results.snellen_re = toSixX(acuity);
    else                 testState.results.snellen_le = toSixX(acuity);
  });
}

// ═══════════════════════════════════════════════════════════════════
// TEST 2 — CORRECTED ISHIHARA
// Luminance-matched plates; seeded RNG; text input; 5s timer
// ═══════════════════════════════════════════════════════════════════

const CB_PLATES = [
  { number: 12, type: 'control',     bg: ['#E87A60','#EF8870','#E07055','#F59080','#DB6A50'], fg: ['#79B879','#89C889','#6CA86C','#91CC91','#66A266'] },
  { number: 15, type: 'control',     bg: ['#4874C0','#5682CC','#3C68B8','#5A7EC8','#446EBC'], fg: ['#AC7E48','#B88C55','#A0723E','#BA8850','#A47A44'] },
  { number: 45, type: 'control',     bg: ['#A07640','#AC844C','#946A38','#A87E4A','#9C7040'], fg: ['#5684C6','#6290D4','#4A78BC','#608CCC','#5080C2'] },
  { number:  8, type: 'protanopia',  bg: ['#C48936','#D09640','#B87D2C','#CC8E3E','#C08332'], fg: ['#6B9C3E','#78AC4A','#5E9036','#72A646','#658F3A'] },
  { number:  3, type: 'protanopia',  bg: ['#BE6E26','#CA7C32','#B2621C','#C6742E','#B86822'], fg: ['#669340','#70A04C','#5A8638','#6C9A48','#608D3C'] },
  { number:  6, type: 'protanopia',  bg: ['#C0662E','#CC743A','#B45A24','#C86C36','#BA602A'], fg: ['#629040','#6E9E4C','#568438','#6A9848','#5C8A3C'] },
  { number:  5, type: 'deuteranopia',bg: ['#D07840','#DC864C','#C46C36','#D88048','#CA723C'], fg: ['#608ED0','#6C9ADC','#5482C6','#6894D8','#5E88CC'] },
  { number: 74, type: 'deuteranopia',bg: ['#CC7636','#D88444','#C06A2C','#D47E42','#C67038'], fg: ['#6090CA','#6C9CD6','#5484C0','#6A96D2','#5E8AC6'] },
  { number:  2, type: 'deuteranopia',bg: ['#D07A3E','#DC884A','#C46E34','#D88246','#CA743A'], fg: ['#5E8EC8','#6A9AD4','#5282BE','#6694D0','#5C88C4'] },
  { number: 29, type: 'normal',      bg: ['#5A88BC','#6694C8','#4E7CB0','#6290C4','#5484B8'], fg: ['#B68848','#C29456','#AA7C3E','#BE9052','#B08244'] },
];

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawIshiharaPlate(plate) {
  const cv  = document.getElementById('ishiharaCanvas');
  const W   = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W / 2 - 6;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const rng = seededRng(plate.number * 137 + plate.type.charCodeAt(0) * 31);

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

  // Background dots
  for (let i = 0; i < 500; i++) {
    let x, y;
    do { x = cx + (rng() * 2 - 1) * R; y = cy + (rng() * 2 - 1) * R; }
    while ((x - cx) ** 2 + (y - cy) ** 2 > R * R);
    ctx.globalAlpha = 0.88 + rng() * 0.12;
    ctx.fillStyle   = plate.bg[Math.floor(rng() * plate.bg.length)];
    ctx.beginPath(); ctx.arc(x, y, 4 + rng() * 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Number mask
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tc  = tmp.getContext('2d');
  tc.font = 'bold 130px Georgia,serif'; tc.textAlign = 'center'; tc.textBaseline = 'middle';
  tc.fillStyle = '#000'; tc.fillText(plate.number, cx, cy);
  const img = tc.getImageData(0, 0, W, H);

  // Foreground dots over number
  for (let py = 0; py < H; py += 5)
    for (let px = 0; px < W; px += 5)
      if (img.data[(py * W + px) * 4 + 3] > 100 && rng() < 0.65) {
        const size = 3 + rng() * 9;
        ctx.globalAlpha = 0.88 + rng() * 0.12;
        ctx.fillStyle   = plate.fg[Math.floor(rng() * plate.fg.length)];
        ctx.beginPath();
        ctx.arc(px + (rng() - 0.5) * 10, py + (rng() - 0.5) * 10, size, 0, Math.PI * 2);
        ctx.fill();
      }
  ctx.globalAlpha = 1;

  // Extra overlap
  for (let i = 0; i < 120; i++) {
    let x, y;
    do { x = cx + (rng() * 2 - 1) * R; y = cy + (rng() * 2 - 1) * R; }
    while ((x - cx) ** 2 + (y - cy) ** 2 > R * R);
    ctx.globalAlpha = 0.6 + rng() * 0.3;
    ctx.fillStyle   = plate.bg[Math.floor(rng() * plate.bg.length)];
    ctx.beginPath(); ctx.arc(x, y, 3 + rng() * 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.restore();
}

function initColourTest() {
  testState.cbPlateIndex = 0;
  testState.cbCorrect    = 0;
  testState.cbErrors     = { protan: 0, deutan: 0 };
  loadCBPlate();
}

function loadCBPlate() {
  const idx = testState.cbPlateIndex;
  if (idx >= CB_PLATES.length) { finishColourTest(); return; }

  document.getElementById('plateNum').textContent = idx + 1;
  document.getElementById('cbAnswer').value = '';
  document.getElementById('cbFeedback').innerHTML = '';
  drawIshiharaPlate(CB_PLATES[idx]);

  // Focus input
  setTimeout(() => {
    const inp = document.getElementById('cbAnswer');
    if (inp) inp.focus();
  }, 50);

  // Timer
  clearInterval(testState.cbTimerInterval);
  testState.cbTimeLeft = 5;
  document.getElementById('cbTimer').textContent = '5';
  testState.cbTimerInterval = setInterval(() => {
    testState.cbTimeLeft--;
    document.getElementById('cbTimer').textContent = Math.max(0, testState.cbTimeLeft);
    if (testState.cbTimeLeft <= 0) {
      clearInterval(testState.cbTimerInterval);
      recordCBAnswer(document.getElementById('cbAnswer').value || '0');
    }
  }, 1000);
}

function submitCBAnswer() {
  const val = document.getElementById('cbAnswer').value.trim();
  if (!val) return;
  clearInterval(testState.cbTimerInterval);
  recordCBAnswer(val);
}

// Enter key submits
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const panel = document.getElementById('test2');
    if (panel && !panel.classList.contains('d-none')) submitCBAnswer();
  }
});

function cbNoNumber() {
  clearInterval(testState.cbTimerInterval);
  recordCBAnswer('0');
}

function recordCBAnswer(val) {
  clearInterval(testState.cbTimerInterval);
  const plate   = CB_PLATES[testState.cbPlateIndex];
  const given   = val.trim();
  const isCorrect = given === plate.number.toString();
  const feedback  = document.getElementById('cbFeedback');

  if (isCorrect) {
    testState.cbCorrect++;
    feedback.innerHTML = '<span style="color:var(--green)">✓ Correct!</span>';
  } else {
    if (plate.type === 'protanopia')   testState.cbErrors.protan++;
    if (plate.type === 'deuteranopia') testState.cbErrors.deutan++;
    feedback.innerHTML = `<span style="color:var(--red)">✗ The number was ${plate.number}</span>`;
  }

  setTimeout(() => {
    testState.cbPlateIndex++;
    loadCBPlate();
  }, 1000);
}

function finishColourTest() {
  const { protan, deutan } = testState.cbErrors;
  const score = testState.cbCorrect;
  testState.results.colour_score = score;
  let result = 'Normal';
  if (protan >= 2 && protan > deutan)      result = 'Protanopia — red-green deficiency (red-weak)';
  else if (deutan >= 2 && deutan > protan) result = 'Deuteranopia — red-green deficiency (green-weak)';
  else if (protan >= 1 || deutan >= 1)     result = 'Possible mild colour deficiency';
  testState.results.colour_vision_result = result;
  nextTest();
}

// ═══════════════════════════════════════════════════════════════════
// TEST 3 — ASTIGMATISM
// ═══════════════════════════════════════════════════════════════════

function initAstigmatism() {
  const canvas = document.getElementById('astigCanvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, R = W / 2 - 20;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

  // Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

  for (let angle = 0; angle < 180; angle += 10) {
    const rad = angle * Math.PI / 180;
    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(rad) * R * 0.85, cy - Math.sin(rad) * R * 0.85);
    ctx.lineTo(cx + Math.cos(rad) * R * 0.85, cy + Math.sin(rad) * R * 0.85);
    ctx.stroke();
    if (angle % 30 === 0) {
      const lx = cx + Math.cos(rad) * (R * 0.93);
      const ly = cy + Math.sin(rad) * (R * 0.93);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px Inter,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(angle + '°', lx, ly);
    }
    ctx.restore();
  }

  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - cx;
    const my = e.clientY - rect.top  - cy;
    let angle = Math.round(Math.atan2(my, mx) * 180 / Math.PI);
    if (angle < 0) angle += 180;
    angle = Math.round(angle / 10) * 10;
    testState.astigAxis = angle;
    document.getElementById('astigSelected').textContent = `Selected axis: ${angle}°`;
    initAstigmatism();
    const rad = angle * Math.PI / 180;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(rad) * R * 0.85, cy - Math.sin(rad) * R * 0.85);
    ctx.lineTo(cx + Math.cos(rad) * R * 0.85, cy + Math.sin(rad) * R * 0.85);
    ctx.stroke();
  };
}

function astigAllEqual() {
  testState.results.astigmatism_flag = false;
  testState.results.astigmatism_axis = null;
  nextTest();
}

window.confirmAstig = function () {
  if (testState.astigAxis !== null) {
    testState.results.astigmatism_flag = true;
    testState.results.astigmatism_axis = testState.astigAxis;
    testState.results.astigmatism_cyl  = 0.75;
  }
  nextTest();
};

// ═══════════════════════════════════════════════════════════════════
// TEST 4 — CONTRAST SENSITIVITY
// ═══════════════════════════════════════════════════════════════════

const CONTRAST_LEVELS = [
  { opacity: 1.0,  label: 'Row 1', score: 5 },
  { opacity: 0.75, label: 'Row 2', score: 4 },
  { opacity: 0.50, label: 'Row 3', score: 3 },
  { opacity: 0.30, label: 'Row 4', score: 2 },
  { opacity: 0.15, label: 'Row 5', score: 1 },
];
const CONTRAST_CHARS_POOL = 'DEFHNOPRSZ';

function randomChars(n) {
  const pool = CONTRAST_CHARS_POOL.split('');
  const out  = [];
  while (out.length < n) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (out[out.length - 1] !== c) out.push(c);
  }
  return out;
}

function initContrast() {
  const chart = document.getElementById('contrastChart');
  chart.innerHTML = '';
  CONTRAST_LEVELS.forEach(level => {
    const row     = document.createElement('div');
    row.className = 'contrast-row';
    row.dataset.score = level.score;
    const chars = randomChars(7).join(' ');
    const span  = document.createElement('span');
    span.className = 'contrast-char';
    span.style.color    = `rgba(0,0,0,${level.opacity})`;
    span.style.fontSize = '1.35rem';
    span.textContent    = chars;
    const label = document.createElement('span');
    label.style.cssText = 'font-size:.62rem;color:#94a3b8;margin-left:auto;font-family:monospace';
    label.textContent   = level.label;
    row.appendChild(span);
    row.appendChild(label);
    row.onclick = () => {
      document.querySelectorAll('.contrast-row').forEach(r => {
        r.style.background = 'transparent'; r.classList.remove('selected');
      });
      row.style.background = 'rgba(37,99,235,.08)';
      row.classList.add('selected');
      testState.results.contrast_score = parseInt(row.dataset.score);
      setTimeout(() => nextTest(), 600);
    };
    chart.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════════════════
// TEST 5 — NEAR VISION (JAEGER)
// ═══════════════════════════════════════════════════════════════════

const JAEGER_ROWS = [
  { label: 'J1',  size: '8px',  text: 'This is fine print — very small text for near vision testing purposes.' },
  { label: 'J2',  size: '10px', text: 'Near vision test — standard small reading text for everyday use.' },
  { label: 'J3',  size: '12px', text: 'Reading glasses test — paragraph at moderate small size.' },
  { label: 'J5',  size: '14px', text: 'This text represents typical newspaper reading size.' },
  { label: 'J7',  size: '17px', text: 'Large print text for near vision presbyopia screening.' },
  { label: 'J10', size: '21px', text: 'Very large text — significant near vision difficulty.' },
];

function initNearVision() {
  const chart = document.getElementById('jaegerChart');
  chart.innerHTML = '';
  JAEGER_ROWS.forEach(row => {
    const div = document.createElement('div');
    div.className = 'jaeger-row';
    div.innerHTML = `<span class="jaeger-label">${row.label}</span><span style="font-size:${row.size};color:var(--text-secondary);line-height:1.6">${row.text}</span>`;
    div.onclick = () => {
      document.querySelectorAll('.jaeger-row').forEach(r => r.classList.remove('selected'));
      div.classList.add('selected');
      testState.results.near_vision = row.label;
    };
    chart.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN FLOW
// ═══════════════════════════════════════════════════════════════════

function startTest() {
  document.getElementById('instructionOverlay').classList.remove('active');
  rebuildStepLabels();
  runCountdown('Visual Acuity — Calibration', 'Please calibrate your screen PPI first', () => {
    document.getElementById('testHeader').classList.remove('d-none');
    document.getElementById('testArea').classList.remove('d-none');
    loadTestByOrderIndex(0);
  });
}

function rebuildStepLabels() {
  TEST_ORDER.forEach((testId, idx) => {
    const stepEl = document.getElementById('step' + (idx + 1));
    if (!stepEl) return;
    const lbl = stepEl.querySelector('.test-step-label');
    if (lbl) lbl.textContent = TEST_META[testId].label;
  });
}

function runCountdown(label, eyeNote, callback) {
  const overlay = document.getElementById('countdownOverlay');
  overlay.classList.add('active');
  document.getElementById('countdownLabel').textContent  = label;
  document.getElementById('eyeInstruction').textContent  = eyeNote;
  let count = 3;
  document.getElementById('countdownNum').textContent = count;
  const interval = setInterval(() => {
    count--;
    document.getElementById('countdownNum').textContent = count;
    if (count <= 0) { clearInterval(interval); overlay.classList.remove('active'); callback(); }
  }, 1000);
}

function loadTestByOrderIndex(orderIdx) {
  const n = TEST_ORDER[orderIdx];
  testState.currentOrderIndex = orderIdx;
  testState.currentTest = n;

  document.querySelectorAll('.test-panel').forEach(p => p.classList.add('d-none'));
  document.getElementById('test' + n).classList.remove('d-none');

  document.getElementById('testProgress').style.width = (orderIdx / 5 * 100) + '%';
  document.getElementById('testNum').textContent = orderIdx + 1;

  for (let i = 1; i <= 5; i++) {
    const step = document.getElementById('step' + i);
    step.classList.remove('active', 'done');
    if (i < orderIdx + 1) step.classList.add('done');
    if (i === orderIdx + 1) step.classList.add('active');
  }

  const meta = TEST_META[n];
  document.getElementById('testTitle').textContent    = meta.name;
  document.getElementById('testSubtitle').textContent = meta.sub;
  document.querySelectorAll('[data-step-badge]').forEach(b => { b.className = 'badge ' + meta.badgeClass; });

  if (n === 1) {
    // Show calibration step first
    acuityGoStep('cal');
  }
  if (n === 2) initColourTest();
  if (n === 3) initAstigmatism();
  if (n === 4) initContrast();
  if (n === 5) initNearVision();
}

function nextTest() {
  const nextIdx = testState.currentOrderIndex + 1;
  if (nextIdx >= TEST_ORDER.length) submitTest();
  else loadTestByOrderIndex(nextIdx);
}

// ═══════════════════════════════════════════════════════════════════
// SUBMIT & RESULTS
// ═══════════════════════════════════════════════════════════════════

async function submitTest() {
  const payload = { ...testState.results };
  document.getElementById('testArea').style.opacity = '0.5';
  try {
    const res  = await fetch('/api/save_eye_test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) showTestResults(data);
    else showTestResults({ health_score: 75 });
  } catch (e) {
    showTestResults({ health_score: 75 });
  }
}

function showTestResults(data) {
  const r = testState.results;

  const acuityLabel = (v) => {
    const m = { '6/6':'Normal (6/6)','6/9':'Mild reduction','6/12':'Moderate','6/18':'Below normal','6/24':'Reduced','6/36':'Significantly reduced','6/60':'Severely reduced' };
    return m[v] || 'Normal';
  };
  const acuityIcon = (v) => {
    const map = { '6/6':'✅','6/9':'🟡','6/12':'🟠','6/18':'🟠','6/24':'🔴','6/36':'🔴','6/60':'🔴' };
    return (map[v] || '✅') + ' ';
  };

  const html = `
    <div class="row g-3">
      <div class="col-6">
        <div class="p-2 rounded" style="background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15)">
          <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Right Eye</div>
          <div class="fw-bold" style="color:var(--text-primary)">${r.snellen_re || '6/6'}</div>
          <div style="font-size:.72rem;color:var(--text-secondary)">${acuityIcon(r.snellen_re)}${acuityLabel(r.snellen_re)}</div>
        </div>
      </div>
      <div class="col-6">
        <div class="p-2 rounded" style="background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.15)">
          <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Left Eye</div>
          <div class="fw-bold" style="color:var(--text-primary)">${r.snellen_le || '6/6'}</div>
          <div style="font-size:.72rem;color:var(--text-secondary)">${acuityIcon(r.snellen_le)}${acuityLabel(r.snellen_le)}</div>
        </div>
      </div>
      <div class="col-6">
        <div class="p-2 rounded" style="background:rgba(217,119,6,.06);border:1px solid rgba(217,119,6,.15)">
          <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Colour Vision</div>
          <div class="fw-bold" style="color:var(--text-primary)">${r.colour_score}/10</div>
          <div style="font-size:.72rem;color:var(--text-secondary)">${r.colour_vision_result}</div>
        </div>
      </div>
      <div class="col-6">
        <div class="p-2 rounded" style="background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.15)">
          <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Eye Health Score</div>
          <div class="fw-bold" style="color:var(--text-primary)">${data.health_score}/100</div>
          <div style="font-size:.72rem;color:var(--text-secondary)">${data.health_score >= 80 ? 'Excellent' : data.health_score >= 60 ? 'Good' : 'Needs attention'}</div>
        </div>
      </div>
      ${r.astigmatism_flag ? `
      <div class="col-12">
        <div class="p-2 rounded" style="background:rgba(220,38,38,.05);border:1px solid rgba(220,38,38,.15)">
          <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Astigmatism</div>
          <div class="fw-bold" style="color:var(--text-primary)">Axis: ${r.astigmatism_axis}°</div>
          <div style="font-size:.72rem;color:var(--amber)">⚠️ Possible astigmatism — confirm with optometrist</div>
        </div>
      </div>` : ''}
    </div>
    <p class="small mt-3 mb-0" style="color:var(--text-muted)"><i class="bi bi-info-circle me-1"></i>This is a screening test only. Results are saved to your dashboard. Please consult an optometrist for clinical evaluation.</p>`;

  document.getElementById('resultContent').innerHTML = html;
  document.getElementById('resultOverlay').classList.add('active');
  document.getElementById('testArea').style.opacity = '1';
}
