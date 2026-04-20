window.AppSidebar = (() => {
  const productMap = new Map();

  function renderProducts(products) {
    const list = document.getElementById('product-list');
    const loading = list.querySelector('.loading');
    if (loading) loading.remove();

    for (const product of products) {
      list.appendChild(createProductCard(product));
    }
  }

  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.draggable = true;

    const cardId = `card-${product.id.replace(/\W/g, '-')}`;
    card.id = cardId;
    productMap.set(cardId, product);

    const img = document.createElement('img');
    img.src = product.imageUrl;
    img.alt = product.imageAlt || product.title;
    img.loading = 'lazy';

    const title = document.createElement('div');
    title.className = 'product-title';
    title.textContent = product.title;

    const price = document.createElement('div');
    price.className = 'product-price';
    price.textContent = formatPrice(product.price, product.currency);

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(price);

    card.addEventListener('dragstart', e => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('product-id', cardId);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));

    let dragStarted = false;
    let startX = 0, startY = 0;

    card.addEventListener('touchstart', e => {
      dragStarted = false;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (dragStarted) return;
      
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);

      // Ha függőlegesen húzza (és már mozdult legalább egy kicsit), akkor drag indítása
      if (dy > dx && dy > 3) {
        dragStarted = true;
        window.AppBoard.startTouchDrag(product, touch.clientX, touch.clientY);
      }
    }, { passive: true });

    return card;
  }

  function getProductByCardId(cardId) {
    return productMap.get(cardId);
  }

  function formatPrice(amount, currency) {
    try {
      return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(parseFloat(amount));
    } catch {
      return `${amount} ${currency}`;
    }
  }

  return { renderProducts, getProductByCardId };
})();
