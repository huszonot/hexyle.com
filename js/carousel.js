window.AppCarousel = (() => {
  const { state } = window.AppState;

  function initCarousel() {
    state.backgrounds = window.BG_IMAGES ?? [];

    if (state.backgrounds.length === 0) {
      console.warn('BG_IMAGES üres — adj hozzá képneveket a js/config.js fájlban.');
      document.getElementById('background-image').style.display = 'none';
      return;
    }

    state.currentBgIndex = 0;
    renderBackground();
  }

  function nextBackground() {
    if (state.backgrounds.length < 2) return;
    state.currentBgIndex = (state.currentBgIndex + 1) % state.backgrounds.length;
    renderBackground();
  }

  function prevBackground() {
    if (state.backgrounds.length < 2) return;
    state.currentBgIndex = (state.currentBgIndex - 1 + state.backgrounds.length) % state.backgrounds.length;
    renderBackground();
  }

  function renderBackground() {
    const filename = state.backgrounds[state.currentBgIndex];
    const src = filename.startsWith('data:') ? filename : `img/bg/${filename}`;
    const bgImg = document.getElementById('background-image');
    bgImg.style.display = 'block';
    bgImg.src = src;

    const total = state.backgrounds.length;
    document.getElementById('bg-counter').textContent = `${state.currentBgIndex + 1} / ${total}`;

    const hasMult = total > 1;
    document.getElementById('prev-bg').style.visibility = hasMult ? 'visible' : 'hidden';
    document.getElementById('next-bg').style.visibility = hasMult ? 'visible' : 'hidden';
  }

  function addCustomBackground(dataUrl) {
    state.backgrounds.push(dataUrl);
    state.currentBgIndex = state.backgrounds.length - 1;
    renderBackground();
  }

  return { initCarousel, nextBackground, prevBackground, addCustomBackground };
})();
