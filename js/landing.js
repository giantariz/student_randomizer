let currentTheme = 'light';

function initTheme() {
  currentTheme = localStorage.getItem('sr_theme') || 'light';
  applyTheme(currentTheme);
  document.getElementById('btn-theme').addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });
}

function applyTheme(t) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('btn-theme').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('sr_theme', t);
}

initTheme();
