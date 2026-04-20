(() => {
  const { state, on, loadFromStorage }         = window.AppState;
  const { fetchProducts, createCart }          = window.AppShopify;
  const { initBoard, renderPlacedItem }        = window.AppBoard;
  const { renderProducts }                     = window.AppSidebar;
  const { initCarousel, nextBackground, prevBackground } = window.AppCarousel;

  async function main() {
    initBoard();
    initCarousel();

    // Korábban elhelyezett termékek visszaállítása
    const saved = loadFromStorage();
    if (saved.length) {
      state.placedItems = saved;
      saved.forEach(renderPlacedItem);
    }

    document.getElementById('prev-bg').addEventListener('click', prevBackground);
    document.getElementById('next-bg').addEventListener('click', nextBackground);

    // Kamera / saját háttérkép gombok
    const setupImageInput = (btnId, inputId) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (btn && input) {
        btn.addEventListener('click', () => {
          input.click();
        });
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              window.AppCarousel.addCustomBackground(ev.target.result);
            };
            reader.readAsDataURL(file);
          }
          // Tisztítás, hogy ugyanazt a fájlt újra ki lehessen választani
          e.target.value = '';
        });
      }
    };

    setupImageInput('image-btn', 'image-input');
    setupImageInput('camera-btn', 'camera-input');

    // Méret csúszka
    const sizeSlider = document.getElementById('size-slider');
    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--item-size', `${val}px`);
        window.AppBoard.recalculateGrid(parseInt(val, 10));
      });
    }

    // Új terv gomb
    document.getElementById('new-plan-btn').addEventListener('click', () => {
      if (state.placedItems.length === 0) return;
      if (!confirm('Biztosan törölsz minden elhelyezett terméket?')) return;
      document.querySelectorAll('.placed-item').forEach(el => el.remove());
      state.placedItems = [];
      localStorage.removeItem('hexyle_placed_items');
    });

    // Kosár gomb
    const cartBtn      = document.getElementById('add-to-cart-btn');
    const cartFeedback = document.getElementById('cart-feedback');

    cartBtn.addEventListener('click', async () => {
      if (state.placedItems.length === 0) {
        showFeedback('Nincs termék a boardon.', 'warn');
        return;
      }

      // Deduplikálás: ugyanaz a variant többször → quantity összeadás
      const quantityMap = new Map();
      for (const item of state.placedItems) {
        if (!item.variantId) continue;
        quantityMap.set(item.variantId, (quantityMap.get(item.variantId) ?? 0) + 1);
      }

      const lines = [...quantityMap.entries()].map(([merchandiseId, quantity]) => ({
        merchandiseId,
        quantity,
      }));

      if (lines.length === 0) {
        showFeedback('Nincs érvényes termék a kosárhoz.', 'warn');
        return;
      }

      cartBtn.disabled = true;
      cartBtn.textContent = 'Feldolgozás...';

      try {
        const checkoutUrl = await createCart(lines);
        window.open(checkoutUrl, '_blank');
        showFeedback('Kosár megnyitva új ablakban.', 'ok');
        cartBtn.disabled = false;
        cartBtn.textContent = '🛒 Kosárba helyezés';
      } catch (err) {
        console.error('Kosár hiba:', err);
        showFeedback(`Hiba: ${err.message}`, 'error');
        cartBtn.disabled = false;
        cartBtn.textContent = '🛒 Kosárba helyezés';
      }
    });

    function showFeedback(msg, type) {
      cartFeedback.textContent = msg;
      cartFeedback.className = `cart-feedback-${type}`;
      clearTimeout(cartFeedback._timer);
      cartFeedback._timer = setTimeout(() => {
        cartFeedback.textContent = '';
        cartFeedback.className = '';
      }, 3000);
    }

    // Shopify termékek
    try {
      const { products, pageInfo } = await fetchProducts();
      state.products    = products;
      state.lastCursor  = pageInfo.endCursor;
      state.hasNextPage = pageInfo.hasNextPage;
      renderProducts(products);
      setupLoadMore();
    } catch (err) {
      console.error('Shopify betöltési hiba:', err);
      document.getElementById('product-list').innerHTML =
        `<div class="loading" style="color:#e53e3e;">Hiba: ${err.message}</div>`;
    }
  }

  function setupLoadMore() {
    const btn = document.getElementById('load-more-btn');
    const refresh = () => { btn.style.display = state.hasNextPage ? 'block' : 'none'; };
    refresh();

    btn.addEventListener('click', async () => {
      if (!state.hasNextPage) return;
      btn.disabled = true;
      btn.textContent = 'Betöltés...';
      try {
        const { products, pageInfo } = await fetchProducts(state.lastCursor);
        state.products.push(...products);
        state.lastCursor  = pageInfo.endCursor;
        state.hasNextPage = pageInfo.hasNextPage;
        renderProducts(products);
      } catch (err) {
        console.error('Lapozás sikertelen:', err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'További termékek';
        refresh();
      }
    });
  }

  main();
})();
