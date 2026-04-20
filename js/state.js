window.AppState = (() => {
  const state = {
    products: [],
    backgrounds: [],
    currentBgIndex: 0,
    lastCursor: null,
    hasNextPage: false,
    placedItems: [],
  };

  const listeners = {};

  function on(event, fn) {
    (listeners[event] ??= []).push(fn);
  }

  function emit(event, data) {
    listeners[event]?.forEach(fn => fn(data));
  }

  const STORAGE_KEY = 'hexyle_placed_items';

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.placedItems));
    } catch (e) {
      console.warn('localStorage mentés sikertelen:', e);
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addPlacedItem(item) {
    state.placedItems.push(item);
    saveToStorage();
    emit('placedItemsChanged', state.placedItems);
  }

  function removePlacedItem(elId) {
    state.placedItems = state.placedItems.filter(i => i.elId !== elId);
    saveToStorage();
    emit('placedItemsChanged', state.placedItems);
  }

  function updateItemPosition(elId, x, y, col, row) {
    const item = state.placedItems.find(i => i.elId === elId);
    if (item) {
      item.x = x;
      item.y = y;
      if (col !== undefined) item.col = col;
      if (row !== undefined) item.row = row;
      saveToStorage();
      emit('placedItemsChanged', state.placedItems);
    }
  }

  function uid() {
    return Math.random().toString(36).slice(2);
  }

  return { state, on, emit, addPlacedItem, removePlacedItem, updateItemPosition, uid, loadFromStorage, saveToStorage };
})();
