// frame_finder.js — Frame SVGs, AI recommendations, gallery, wishlist

// ─── Frame SVG Library ────────────────────────────────────────────────────────
function getFrameSVG(type, color, w, h) {
  color = color || '#6366f1';
  w = w || 120; h = h || 70;
  const stroke = color;
  const sw = 3; // stroke width
  const cx = w / 2, cy = h / 2;

  const svgs = {
    round: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <circle cx="${cx - w*0.22}" cy="${cy}" r="${h*0.38}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <circle cx="${cx + w*0.22}" cy="${cy}" r="${h*0.38}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="${cx - w*0.22 + h*0.38}" y1="${cy}" x2="${cx + w*0.22 - h*0.38}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="2" y1="${cy}" x2="${cx - w*0.22 - h*0.38}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.22 + h*0.38}" y1="${cy}" x2="${w-2}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,

    square: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="${cx - w*0.43}" y="${cy - h*0.37}" width="${w*0.39}" height="${h*0.74}" rx="4" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="${cx + w*0.04}" y="${cy - h*0.37}" width="${w*0.39}" height="${h*0.74}" rx="4" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="${cx - w*0.04}" y1="${cy}" x2="${cx + w*0.04}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="2" y1="${cy}" x2="${cx - w*0.43}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.43}" y1="${cy}" x2="${w-2}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,

    oval: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <ellipse cx="${cx - w*0.22}" cy="${cy}" rx="${w*0.2}" ry="${h*0.36}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <ellipse cx="${cx + w*0.22}" cy="${cy}" rx="${w*0.2}" ry="${h*0.36}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="${cx - w*0.02}" y1="${cy}" x2="${cx + w*0.02}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="2" y1="${cy}" x2="${cx - w*0.42}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.42}" y1="${cy}" x2="${w-2}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,

    'cat-eye': `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${cx-w*0.44} ${cy+h*0.15} Q${cx-w*0.42} ${cy-h*0.38} ${cx-w*0.2} ${cy-h*0.3} Q${cx-w*0.02} ${cy-h*0.38} ${cx-w*0.04} ${cy+h*0.2} Z" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <path d="M${cx+w*0.44} ${cy+h*0.15} Q${cx+w*0.42} ${cy-h*0.38} ${cx+w*0.2} ${cy-h*0.3} Q${cx+w*0.02} ${cy-h*0.38} ${cx+w*0.04} ${cy+h*0.2} Z" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <line x1="2" y1="${cy+h*0.05}" x2="${cx - w*0.44}" y2="${cy+h*0.15}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.44}" y1="${cy+h*0.15}" x2="${w-2}" y2="${cy+h*0.05}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,

    aviator: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${cx-w*0.44} ${cy-h*0.28} Q${cx-w*0.44} ${cy+h*0.36} ${cx-w*0.22} ${cy+h*0.36} Q${cx-w*0.02} ${cy+h*0.36} ${cx-w*0.02} ${cy-h*0.28} Z" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <path d="M${cx+w*0.44} ${cy-h*0.28} Q${cx+w*0.44} ${cy+h*0.36} ${cx+w*0.22} ${cy+h*0.36} Q${cx+w*0.02} ${cy+h*0.36} ${cx+w*0.02} ${cy-h*0.28} Z" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="${cx-w*0.44}" y1="${cy-h*0.28}" x2="${cx+w*0.44}" y2="${cy-h*0.28}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="2" y1="${cy-h*0.28}" x2="${cx - w*0.44}" y2="${cy-h*0.28}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.44}" y1="${cy-h*0.28}" x2="${w-2}" y2="${cy-h*0.28}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,

    wayfarer: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${cx-w*0.44} ${cy-h*0.3} L${cx-w*0.42} ${cy+h*0.3} Q${cx-w*0.22} ${cy+h*0.36} ${cx-w*0.02} ${cy+h*0.25} L${cx-w*0.02} ${cy-h*0.3} Z" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <path d="M${cx+w*0.44} ${cy-h*0.3} L${cx+w*0.42} ${cy+h*0.3} Q${cx+w*0.22} ${cy+h*0.36} ${cx+w*0.02} ${cy+h*0.25} L${cx+w*0.02} ${cy-h*0.3} Z" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <line x1="2" y1="${cy-h*0.3}" x2="${cx - w*0.44}" y2="${cy-h*0.3}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.44}" y1="${cy-h*0.3}" x2="${w-2}" y2="${cy-h*0.3}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,

    geometric: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polygon points="${cx-w*0.44},${cy} ${cx-w*0.36},${cy-h*0.36} ${cx-w*0.1},${cy-h*0.36} ${cx-w*0.02},${cy} ${cx-w*0.1},${cy+h*0.36} ${cx-w*0.36},${cy+h*0.36}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <polygon points="${cx+w*0.44},${cy} ${cx+w*0.36},${cy-h*0.36} ${cx+w*0.1},${cy-h*0.36} ${cx+w*0.02},${cy} ${cx+w*0.1},${cy+h*0.36} ${cx+w*0.36},${cy+h*0.36}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <line x1="2" y1="${cy}" x2="${cx - w*0.44}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.44}" y1="${cy}" x2="${w-2}" y2="${cy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,

    browline: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="${cx-w*0.43}" y="${cy-h*0.38}" width="${w*0.39}" height="${h*0.28}" rx="3" fill="${stroke}" fill-opacity="0.6"/>
      <rect x="${cx+w*0.04}" y="${cy-h*0.38}" width="${w*0.39}" height="${h*0.28}" rx="3" fill="${stroke}" fill-opacity="0.6"/>
      <path d="M${cx-w*0.43} ${cy-h*0.1} Q${cx-w*0.24} ${cy+h*0.36} ${cx-w*0.04} ${cy-h*0.1}" fill="none" stroke="${stroke}" stroke-width="${sw*0.7}"/>
      <path d="M${cx+w*0.04} ${cy-h*0.1} Q${cx+w*0.24} ${cy+h*0.36} ${cx+w*0.43} ${cy-h*0.1}" fill="none" stroke="${stroke}" stroke-width="${sw*0.7}"/>
      <line x1="2" y1="${cy-h*0.24}" x2="${cx - w*0.43}" y2="${cy-h*0.24}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="${cx + w*0.43}" y1="${cy-h*0.24}" x2="${w-2}" y2="${cy-h*0.24}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`,
  };
  return svgs[type] || svgs.oval;
}

// ─── Frame catalog ────────────────────────────────────────────────────────────
const FRAMES = [
  { type: 'round',     name: 'Classic Round',   rim: 'full-rim',  desc: 'Timeless circular shape. Softens angular faces, adds intellectual charm.' },
  { type: 'square',    name: 'Bold Square',      rim: 'full-rim',  desc: 'Strong geometric lines. Adds structure to soft, round faces.' },
  { type: 'oval',      name: 'Elegant Oval',     rim: 'full-rim',  desc: 'Most universally flattering. Balanced proportions for all face shapes.' },
  { type: 'cat-eye',   name: 'Cat-Eye',          rim: 'full-rim',  desc: 'Upswept outer corners. Feminine and retro-chic, lifts the face.' },
  { type: 'aviator',   name: 'Aviator',          rim: 'half-rim',  desc: 'Teardrop silhouette. Classic pilot style with wide field of view.' },
  { type: 'wayfarer',  name: 'Wayfarer',         rim: 'full-rim',  desc: 'Iconic trapezoidal frame. Bold and versatile for most face shapes.' },
  { type: 'geometric', name: 'Geometric',        rim: 'full-rim',  desc: 'Angular hexagonal or octagonal shapes. Modern and fashion-forward.' },
  { type: 'browline',  name: 'Browline',         rim: 'half-rim',  desc: 'Thick upper bar, thin lower. Vintage-inspired, distinctive look.' },
];

// ─── State ────────────────────────────────────────────────────────────────────
let selectedFaceShape = null;
let wishlistSet = new Set(typeof wishlistIds !== 'undefined' ? wishlistIds : []);

// ─── Camera ───────────────────────────────────────────────────────────────────
let mediaStream = null;

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => {
      mediaStream = stream;
      const video = document.getElementById('cameraFeed');
      video.srcObject = stream;
      video.style.display = 'block';
      document.getElementById('cameraPlaceholder').style.display = 'none';
      document.getElementById('faceShapeOverlay').classList.remove('d-none');
      document.getElementById('startCameraBtn').classList.add('d-none');
      document.getElementById('captureBtn').classList.remove('d-none');
    })
    .catch(() => {
      // Fallback: manual selection
      document.getElementById('cameraPlaceholder').innerHTML =
        '<i class="bi bi-camera-video-off fs-2 text-secondary mb-2"></i><p class="text-secondary small">Camera unavailable — please select face shape manually below</p>';
    });
}

function captureAndDetect() {
  const video = document.getElementById('cameraFeed');
  const canvas = document.getElementById('cameraCanvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  // Stop camera stream
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  video.style.display = 'none';
  canvas.style.display = 'block';

  // ── Per-person face geometry analysis ──────────────────────────────────────
  // Sample pixels in the face-oval region to find actual skin boundary,
  // then compute width-to-height ratio of the detected face region.
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const ovalW = W * 0.38, ovalH = H * 0.55;

  const imgData = ctx.getImageData(0, 0, W, H).data;

  function isSkinPixel(x, y) {
    const i = (Math.floor(y) * W + Math.floor(x)) * 4;
    const r = imgData[i], g = imgData[i+1], b = imgData[i+2];
    // Skin tone heuristic in RGB (works for a range of skin tones)
    return r > 60 && g > 40 && b > 20 &&
           r > b && r > g &&
           Math.abs(r - g) > 10 &&
           r - b > 15;
  }

  // Scan horizontal skin extents at 40%, 60%, 80% of oval height
  function scanWidth(yFrac) {
    const y = cy + (yFrac - 0.5) * ovalH;
    let left = cx, right = cx;
    for (let x = cx - ovalW; x <= cx; x++) {
      if (isSkinPixel(x, y)) { left = x; break; }
    }
    for (let x = cx + ovalW; x >= cx; x--) {
      if (isSkinPixel(x, y)) { right = x; break; }
    }
    return right - left;
  }

  // Scan vertical skin extent (forehead top to chin bottom)
  let faceTop = cy - ovalH * 0.5, faceBottom = cy + ovalH * 0.5;
  for (let y = cy - ovalH * 0.5; y <= cy; y++) {
    if (isSkinPixel(cx, y)) { faceTop = y; break; }
  }
  for (let y = cy + ovalH * 0.5; y >= cy; y--) {
    if (isSkinPixel(cx, y)) { faceBottom = y; break; }
  }

  const faceHeight = Math.max(faceBottom - faceTop, 1);
  const widthTop    = scanWidth(0.25);   // forehead width
  const widthMid    = scanWidth(0.50);   // cheekbone width
  const widthBottom = scanWidth(0.80);   // jaw width
  const faceWidth   = Math.max(widthMid, widthTop, 1);

  const ratio      = faceWidth / faceHeight;    // width-to-height
  const jawRatio   = widthBottom / Math.max(widthMid, 1); // jaw vs cheek
  const foreRatio  = widthTop / Math.max(widthMid, 1);    // forehead vs cheek

  let shape = 'oval'; // default
  if (ratio > 0.85 && jawRatio > 0.80) {
    shape = 'round';
  } else if (ratio > 0.82 && jawRatio > 0.85 && foreRatio > 0.85) {
    shape = 'square';
  } else if (ratio < 0.68) {
    shape = 'oblong';
  } else if (foreRatio > 0.90 && jawRatio < 0.72) {
    shape = 'heart';
  } else {
    shape = 'oval';
  }

  selectFaceShape(shape);
  showToast(`Detected face shape: ${shape.charAt(0).toUpperCase() + shape.slice(1)}`, 'success');
}

// ─── Face shape selection ─────────────────────────────────────────────────────
function selectFaceShape(shape) {
  selectedFaceShape = shape;
  document.querySelectorAll('.face-shape-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.shape === shape);
  });
  const shapeNames = { oval: 'Oval', round: 'Round', square: 'Square', heart: 'Heart', oblong: 'Oblong' };
  document.getElementById('detectedShape').classList.remove('d-none');
  document.getElementById('shapeLabel').textContent = shapeNames[shape] || shape;
  document.getElementById('getRecommendBtn').disabled = false;
}

// ─── AI Recommendation ────────────────────────────────────────────────────────
async function getRecommendation() {
  if (!selectedFaceShape) return;

  document.getElementById('aiLoading').classList.remove('d-none');
  document.getElementById('bestMatchCard').classList.add('d-none');
  document.getElementById('scoreGridCard').classList.add('d-none');
  document.getElementById('frameGallery').classList.add('d-none');

  const payload = {
    face_shape: selectedFaceShape,
    sph_re: typeof latestRx !== 'undefined' ? latestRx.sph_re : null,
    sph_le: typeof latestRx !== 'undefined' ? latestRx.sph_le : null,
    cyl:    typeof latestRx !== 'undefined' ? latestRx.cyl    : null,
  };

  try {
    const res = await fetch('/api/frame_recommendation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) renderRecommendation(data.data);
  } catch (e) {
    // Fallback
    renderRecommendation({
      best_shape: 'oval', best_rim: 'full-rim',
      reason: `For a ${selectedFaceShape} face shape, oval frames provide excellent balance and are universally flattering.`,
      scores: { round:75, square:80, oval:92, 'cat-eye':65, aviator:72, wayfarer:85, geometric:60, browline:58 },
      lens_recommendation: 'Single vision lenses recommended for your prescription range.',
      style_tip: 'Choose a frame width that matches your face width for best proportions.'
    });
  }
}

function renderRecommendation(rec) {
  document.getElementById('aiLoading').classList.add('d-none');

  // Best match
  const bestFrame = FRAMES.find(f => f.type === rec.best_shape) || FRAMES[2];
  document.getElementById('bestFrameSvg').innerHTML = getFrameSVG(rec.best_shape, '#6366f1', 100, 55);
  document.getElementById('bestFrameName').textContent = bestFrame.name;
  document.getElementById('bestRimType').textContent = `${(rec.best_rim || 'full-rim').replace('-', ' ')} • ${rec.best_shape} shape`;
  document.getElementById('aiReason').textContent = rec.reason;
  document.getElementById('lensRec').textContent = rec.lens_recommendation || '';
  document.getElementById('styleTip').textContent = rec.style_tip || '';
  document.getElementById('bestMatchCard').classList.remove('d-none');

  // Score grid
  const scoreGrid = document.getElementById('frameScoreGrid');
  scoreGrid.innerHTML = '';
  FRAMES.forEach(f => {
    const score = rec.scores?.[f.type] || 50;
    const isBest = f.type === rec.best_shape;
    const col = document.createElement('div');
    col.className = 'col-6 col-md-3';
    col.innerHTML = `
      <div class="frame-score-item ${isBest ? 'border border-primary' : ''}">
        <div>${getFrameSVG(f.type, isBest ? '#6366f1' : '#6b7280', 36, 22)}</div>
        <div style="flex:1">
          <div style="font-size:.72rem;font-weight:600;color:${isBest ? '#a5b4fc' : '#d1d5db'}">${f.name}</div>
          <div class="score-bar mt-1"><div class="score-fill" style="width:${score}%;background:${isBest ? '#6366f1' : '#4b5563'}"></div></div>
        </div>
        <div style="font-size:.7rem;color:${isBest ? '#a5b4fc' : '#6b7280'};font-weight:600">${score}%</div>
      </div>`;
    scoreGrid.appendChild(col);
  });
  document.getElementById('scoreGridCard').classList.remove('d-none');

  // Frame gallery
  buildFrameGallery(rec.best_shape);
  document.getElementById('frameGallery').classList.remove('d-none');
}

function buildFrameGallery(bestShape) {
  const grid = document.getElementById('frameGalleryGrid');
  grid.innerHTML = '';
  FRAMES.forEach(f => {
    const isBest = f.type === bestShape;
    const inWishlist = wishlistSet.has(f.name);
    const col = document.createElement('div');
    col.className = 'col-6 col-md-3';
    col.innerHTML = `
      <div class="frame-card-gallery ${isBest ? 'border-primary' : ''}" id="gallery_${f.type}">
        ${isBest ? '<div style="font-size:.65rem;color:#a5b4fc;font-weight:600;margin-bottom:.25rem">⭐ Best Match</div>' : ''}
        <div class="d-flex justify-content-center mb-2">${getFrameSVG(f.type, isBest ? '#6366f1' : '#9ca3af', 90, 52)}</div>
        <div class="fw-semibold mb-1" style="color:var(--text-primary)" style="font-size:.82rem">${f.name}</div>
        <div class="text-secondary mb-1" style="font-size:.7rem">${f.rim}</div>
        <div class="text-secondary mb-2" style="font-size:.68rem;line-height:1.4">${f.desc}</div>
        <div class="d-flex gap-1 flex-wrap mb-2">
          <a href="https://www.lenskart.com/search?q=${encodeURIComponent(f.type)}+frames" target="_blank" class="btn btn-xs btn-outline-primary">Lenskart</a>
          <a href="https://www.specsmakers.in/search?q=${encodeURIComponent(f.type)}" target="_blank" class="btn btn-xs btn-outline-info">Specsmakers</a>
          <a href="https://www.titaneyeplus.com/search?q=${encodeURIComponent(f.type)}" target="_blank" class="btn btn-xs btn-outline-warning">Titan Eye+</a>
          <a href="https://www.johnjacobs.com/search?q=${encodeURIComponent(f.type)}" target="_blank" class="btn btn-xs btn-outline-success">John Jacobs</a>
        </div>
        <button class="btn btn-sm w-100 ${inWishlist ? 'btn-danger' : 'btn-outline-danger'}" onclick="toggleWishlist('${f.name}','${f.type}','${f.rim}',this)" id="wbtn_${f.type}">
          <i class="bi bi-heart${inWishlist ? '-fill' : ''} me-1"></i>${inWishlist ? 'Saved' : 'Save'}
        </button>
      </div>`;
    grid.appendChild(col);
  });
}

// ─── Wishlist toggle ──────────────────────────────────────────────────────────
async function toggleWishlist(name, type, rim, btn) {
  try {
    const res = await fetch('/api/wishlist/toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame_name: name, frame_type: type, rim_type: rim })
    });
    const data = await res.json();
    if (data.success) {
      if (data.action === 'added') {
        wishlistSet.add(name);
        btn.className = 'btn btn-sm w-100 btn-danger';
        btn.innerHTML = '<i class="bi bi-heart-fill me-1"></i>Saved';
        showToast(`${name} added to wishlist`, 'success');
      } else {
        wishlistSet.delete(name);
        btn.className = 'btn btn-sm w-100 btn-outline-danger';
        btn.innerHTML = '<i class="bi bi-heart me-1"></i>Save';
        showToast(`${name} removed from wishlist`, 'info');
      }
    }
  } catch (e) {
    showToast('Could not update wishlist', 'danger');
  }
}

// Expose globally for wishlist page
window.getFrameSVG = getFrameSVG;
