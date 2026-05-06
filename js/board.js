window.AppBoard = (() => {
  const { addPlacedItem, removePlacedItem, updateItemPosition, uid } = window.AppState;

  /** Aktív sidebar→board touch drag állapot */
  let activeTouchDrag = null;

  function board() { return document.getElementById('board'); }
  function ghost()  { return document.getElementById('touch-ghost'); }

  // ── Inicializálás ──

  function initBoard() {
    const b = board();

    // Sidebar kártyák fogadása (HTML5 DnD)
    b.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      b.classList.add('drag-over');
    });

    b.addEventListener('dragleave', e => {
      if (!b.contains(e.relatedTarget)) b.classList.remove('drag-over');
    });

    b.addEventListener('drop', e => {
      e.preventDefault();
      b.classList.remove('drag-over');

      const cardId = e.dataTransfer.getData('product-id');
      if (!cardId) return;

      const product = window.AppSidebar.getProductByCardId(cardId);
      if (!product) return;

      const raw  = toCenterOffset(e.clientX, e.clientY);
      const pos  = snapToHoneycomb(raw.x, raw.y);
      const item = { ...product, elId: uid(), x: pos.x, y: pos.y, col: pos.col, row: pos.row };
      addPlacedItem(item);
      renderPlacedItem(item);
    });

    // Sidebar→board touch drag
    document.addEventListener('touchmove', onGhostTouchMove, { passive: false });
    document.addEventListener('touchend',  onGhostTouchEnd);
  }

  // ── Sidebar → board touch drag (ghost) ──

  function startTouchDrag(product, clientX, clientY) {
    activeTouchDrag = { product };
    const g = ghost();
    g.src = product.imageUrl;
    g.style.display = 'block';
    moveGhost(clientX, clientY);
  }

  function onGhostTouchMove(e) {
    if (!activeTouchDrag) return;
    e.preventDefault();
    moveGhost(e.touches[0].clientX, e.touches[0].clientY);
  }

  function onGhostTouchEnd(e) {
    if (!activeTouchDrag) return;
    const t = e.changedTouches[0];
    ghost().style.display = 'none';

    const b = board();
    if (isOverElement(t.clientX, t.clientY, b)) {
      const raw  = toCenterOffset(t.clientX, t.clientY);
      const pos  = snapToHoneycomb(raw.x, raw.y);
      const item = { ...activeTouchDrag.product, elId: uid(), x: pos.x, y: pos.y, col: pos.col, row: pos.row };
      addPlacedItem(item);
      renderPlacedItem(item);
    }
    activeTouchDrag = null;
  }

  function moveGhost(x, y) {
    const g = ghost();
    g.style.left = `${x}px`;
    g.style.top  = `${y}px`;
  }

  // ── Placed item renderelés ──

  function renderPlacedItem(item) {
    const el = document.createElement('div');
    el.className = 'placed-item';
    el.id  = item.elId;
    el.style.left = `calc(50% + ${item.x}px)`;
    el.style.top  = `calc(50% + ${item.y}px)`;

    const img = document.createElement('img');
    img.src = item.imageUrl;
    img.alt = item.imageAlt || item.title || '';

    el.appendChild(img);

    let rotation = 0;
    let lastClickTime = 0;

    function setRotation(deg) {
      rotation = deg;
      el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    }

    function handleTap() {
      const now = Date.now();
      if (now - lastClickTime < 300) {
        removePlacedItem(item.elId);
        el.remove();
      } else {
        setRotation(rotation + 30);
      }
      lastClickTime = now;
    }

    // ── Mouse drag (desktop) ──
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const elRect  = el.getBoundingClientRect();
      // Eltolás: hol fogtuk meg az elemen belül (középponttól mérve)
      const offsetX = e.clientX - (elRect.left + elRect.width  / 2);
      const offsetY = e.clientY - (elRect.top  + elRect.height / 2);

      let dragged = false;
      el.classList.add('dragging');

      function onMouseMove(e) {
        dragged = true;
        const b = board().getBoundingClientRect();
        const curX = e.clientX - offsetX - (b.left + b.width / 2);
        const curY = e.clientY - offsetY - (b.top + b.height / 2);
        el.style.left = `calc(50% + ${curX}px)`;
        el.style.top  = `calc(50% + ${curY}px)`;
      }

      function onMouseUp(e) {
        el.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);

        if (!dragged) {
          handleTap();
          return;
        }

        const b = board().getBoundingClientRect();
        const rawX = e.clientX - offsetX - (b.left + b.width / 2);
        const rawY = e.clientY - offsetY - (b.top + b.height / 2);
        const { x, y, col, row } = snapToHoneycomb(rawX, rawY);
        el.style.left = `calc(50% + ${x}px)`;
        el.style.top  = `calc(50% + ${y}px)`;
        updateItemPosition(item.elId, x, y, col, row);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
    });

    // ── Touch drag (mobile) ──
    let lastTapTime = 0;

    el.addEventListener('touchstart', e => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;
      if (tapLength < 300 && tapLength > 0) {
        removePlacedItem(item.elId);
        el.remove();
        e.preventDefault();
        return;
      }
      lastTapTime = currentTime;

      e.preventDefault();
      e.stopPropagation();

      const touch  = e.touches[0];
      const elRect = el.getBoundingClientRect();
      const offsetX = touch.clientX - (elRect.left + elRect.width  / 2);
      const offsetY = touch.clientY - (elRect.top  + elRect.height / 2);

      el.classList.add('dragging');
      let touchDragged = false;

      function onTouchMove(e) {
        touchDragged = true;
        e.preventDefault();
        const t = e.touches[0];
        const b = board().getBoundingClientRect();
        const curX = t.clientX - offsetX - (b.left + b.width / 2);
        const curY = t.clientY - offsetY - (b.top + b.height / 2);
        el.style.left = `calc(50% + ${curX}px)`;
        el.style.top  = `calc(50% + ${curY}px)`;
      }

      function onTouchEnd(e) {
        el.classList.remove('dragging');
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend',  onTouchEnd);

        if (!touchDragged) {
          handleTap();
          return;
        }

        const t = e.changedTouches[0];
        const b = board().getBoundingClientRect();
        const rawX = t.clientX - offsetX - (b.left + b.width / 2);
        const rawY = t.clientY - offsetY - (b.top + b.height / 2);
        const { x, y, col, row } = snapToHoneycomb(rawX, rawY);
        el.style.left = `calc(50% + ${x}px)`;
        el.style.top  = `calc(50% + ${y}px)`;
        updateItemPosition(item.elId, x, y, col, row);
      }

      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend',  onTouchEnd);
    }, { passive: false });

    board().appendChild(el);
  }

  // ── Segédfüggvények ──

  function toCenterOffset(clientX, clientY) {
    const r = board().getBoundingClientRect();
    return {
      x: clientX - (r.left + r.width / 2),
      y: clientY - (r.top + r.height / 2),
    };
  }

  /**
   * Legközelebbi honeycomb cella középpontjára snapel.
   * Az elemek mérete az aktuális csúszka értéke (alapból 100px).
   */
  function snapToHoneycomb(offsetX, offsetY, overrideItemW) {
    const slider = document.getElementById('size-slider');
    const itemW = overrideItemW !== undefined ? overrideItemW : (slider ? parseInt(slider.value, 10) : 100);
    const gap = 3;
    
    const hexHeight = itemW * (Math.sqrt(3) / 2);
    const D = hexHeight + gap;
    
    const stepX = D * (Math.sqrt(3) / 2);
    const stepY = D;

    let bestDist = Infinity, bestX = offsetX, bestY = offsetY;
    let bestCol = 0, bestRow = 0;

    const colMin = Math.floor(offsetX / stepX) - 1;
    const colMax = Math.ceil(offsetX / stepX) + 1;

    for (let c = colMin; c <= colMax; c++) {
      const colOffset = (Math.abs(c) % 2 === 1) ? stepY / 2 : 0;
      const snappedX = c * stepX;
      
      const r = Math.round((offsetY - colOffset) / stepY);
      const snappedY = r * stepY + colOffset;
      
      const dist = Math.hypot(offsetX - snappedX, offsetY - snappedY);
      if (dist < bestDist) {
        bestDist = dist;
        bestX = snappedX;
        bestY = snappedY;
        bestCol = c;
        bestRow = r;
      }
    }

    return { x: bestX, y: bestY, col: bestCol, row: bestRow };
  }

  function recalculateGrid(newItemW) {
    const gap = 3;
    const hexHeight = newItemW * (Math.sqrt(3) / 2);
    const D = hexHeight + gap;
    const stepX = D * (Math.sqrt(3) / 2);
    const stepY = D;

    window.AppState.state.placedItems.forEach(item => {
      let c = item.col;
      let r = item.row;
      if (c === undefined || r === undefined) {
        const oldGrid = snapToHoneycomb(item.x, item.y, 100);
        c = oldGrid.col;
        r = oldGrid.row;
        item.col = c;
        item.row = r;
      }
      
      const colOffset = (Math.abs(c) % 2 === 1) ? stepY / 2 : 0;
      const newX = c * stepX;
      const newY = r * stepY + colOffset;
      
      item.x = newX;
      item.y = newY;
      
      const el = document.getElementById(item.elId);
      if (el) {
        el.style.left = `calc(50% + ${newX}px)`;
        el.style.top  = `calc(50% + ${newY}px)`;
      }
    });
    
    // Mentés
    window.AppState.saveToStorage();
  }

  function isOverElement(x, y, el) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  return { initBoard, startTouchDrag, renderPlacedItem, recalculateGrid };
})();
