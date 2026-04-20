// main.js — VisionCheck Pro global utilities

// Inject current hour into dashboard greeting
document.addEventListener('DOMContentLoaded', () => {
  // Tooltip init
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    new bootstrap.Tooltip(el);
  });
});

// Generic POST helper
async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

// Toast helper
function showToast(message, type = 'success') {
  const id = 'toast_' + Date.now();
  const colors = { success: '#059669', danger: '#dc2626', warning: '#d97706', info: '#2563eb' };
  const html = `
    <div id="${id}" style="position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
      background:#ffffff;border:1px solid ${colors[type]};border-radius:12px;
      padding:.75rem 1.25rem;color:#0f172a;font-size:.85rem;
      box-shadow:0 4px 24px rgba(15,23,42,.12);min-width:220px;
      animation:slideIn .25s ease">
      <div class="d-flex align-items-center gap-2">
        <div style="width:8px;height:8px;border-radius:50%;background:${colors[type]};flex-shrink:0"></div>
        ${message}
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(() => document.getElementById(id)?.remove(), 3000);
}

const style = document.createElement('style');
style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
document.head.appendChild(style);
