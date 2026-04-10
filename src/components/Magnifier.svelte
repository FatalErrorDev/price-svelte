<script>
  import { onMount, onDestroy } from 'svelte';

  const ZOOM = 2;
  const LENS_R = 118;
  const LENS_D = LENS_R * 2;
  let active = false;
  let dragging = false;
  let overlay = null;
  let lensContent = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let posX = 200;
  let posY = 200;

  function buildSVG() {
    return '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420" width="320" height="420" style="pointer-events:none">' +
      '<defs>' +
        '<filter id="mag-shadow" x="-20%" y="-20%" width="140%" height="140%">' +
          '<feDropShadow dx="3" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/>' +
        '</filter>' +
        '<radialGradient id="glass-grad" cx="40%" cy="35%" r="55%">' +
          '<stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>' +
          '<stop offset="100%" stop-color="rgba(255,255,255,0.02)"/>' +
        '</radialGradient>' +
        '<linearGradient id="rim-grad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="#d0d0d0"/>' +
          '<stop offset="30%" stop-color="#a8a8a8"/>' +
          '<stop offset="50%" stop-color="#e0e0e0"/>' +
          '<stop offset="70%" stop-color="#909090"/>' +
          '<stop offset="100%" stop-color="#b8b8b8"/>' +
        '</linearGradient>' +
        '<linearGradient id="handle-grad" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="#6b3a1f"/>' +
          '<stop offset="20%" stop-color="#8b5e3c"/>' +
          '<stop offset="40%" stop-color="#a0724a"/>' +
          '<stop offset="60%" stop-color="#8b5e3c"/>' +
          '<stop offset="80%" stop-color="#704020"/>' +
          '<stop offset="100%" stop-color="#5a2e14"/>' +
        '</linearGradient>' +
        '<linearGradient id="ferrule-grad" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="#909090"/>' +
          '<stop offset="30%" stop-color="#d0d0d0"/>' +
          '<stop offset="50%" stop-color="#e8e8e8"/>' +
          '<stop offset="70%" stop-color="#c0c0c0"/>' +
          '<stop offset="100%" stop-color="#808080"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<g filter="url(#mag-shadow)">' +
        '<path d="M145,268 L138,290 L133,340 L130,380 C129,395 135,410 160,412 C185,410 191,395 190,380 L187,340 L182,290 L175,268 Z" ' +
          'fill="url(#handle-grad)" stroke="#4a2510" stroke-width="1"/>' +
        '<line x1="137" y1="310" x2="183" y2="310" stroke="#5a2e14" stroke-width="1.5" opacity="0.5"/>' +
        '<line x1="136" y1="320" x2="184" y2="320" stroke="#5a2e14" stroke-width="1.5" opacity="0.5"/>' +
        '<line x1="135" y1="330" x2="185" y2="330" stroke="#5a2e14" stroke-width="1.5" opacity="0.5"/>' +
        '<line x1="134" y1="340" x2="186" y2="340" stroke="#5a2e14" stroke-width="1.5" opacity="0.5"/>' +
        '<line x1="134" y1="350" x2="186" y2="350" stroke="#5a2e14" stroke-width="1.5" opacity="0.5"/>' +
        '<path d="M155,275 Q157,340 158,400" stroke="rgba(255,220,180,0.25)" stroke-width="4" fill="none"/>' +
        '<rect x="135" y="258" width="50" height="18" rx="3" fill="url(#ferrule-grad)" stroke="#707070" stroke-width="0.8"/>' +
        '<line x1="138" y1="262" x2="182" y2="262" stroke="#e0e0e0" stroke-width="0.5" opacity="0.6"/>' +
        '<line x1="138" y1="270" x2="182" y2="270" stroke="#606060" stroke-width="0.5" opacity="0.4"/>' +
        '<circle cx="160" cy="130" r="128" fill="none" stroke="url(#rim-grad)" stroke-width="14"/>' +
        '<circle cx="160" cy="130" r="121" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>' +
        '<circle cx="160" cy="130" r="135" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>' +
        '<circle cx="160" cy="4" r="4" fill="#b0b0b0" stroke="#808080" stroke-width="0.8"/>' +
        '<circle cx="160" cy="256" r="4" fill="#b0b0b0" stroke="#808080" stroke-width="0.8"/>' +
        '<circle cx="34" cy="130" r="4" fill="#b0b0b0" stroke="#808080" stroke-width="0.8"/>' +
        '<circle cx="286" cy="130" r="4" fill="#b0b0b0" stroke="#808080" stroke-width="0.8"/>' +
        '<circle cx="160" cy="130" r="118" fill="url(#glass-grad)" style="pointer-events:none"/>' +
        '<path d="M90,60 Q120,35 170,50" stroke="rgba(255,255,255,0.35)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<circle cx="108" cy="72" r="5" fill="rgba(255,255,255,0.25)"/>' +
      '</g>' +
      '</svg>';
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'magnifier-overlay';
    overlay.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;';

    const lens = document.createElement('div');
    lens.id = 'magnifier-lens';
    lens.style.cssText =
      'position:absolute;left:42px;top:12px;width:' + LENS_D + 'px;height:' + LENS_D + 'px;' +
      'border-radius:50%;overflow:hidden;pointer-events:none;';

    lensContent = document.createElement('div');
    lensContent.id = 'magnifier-content';
    lensContent.style.cssText =
      'position:absolute;transform-origin:0 0;transform:scale(' + ZOOM + ');' +
      'pointer-events:none;width:' + (document.documentElement.scrollWidth) + 'px;';
    refreshContent();

    lens.appendChild(lensContent);
    overlay.appendChild(lens);

    const svgWrap = document.createElement('div');
    svgWrap.style.cssText = 'position:absolute;left:0;top:0;pointer-events:auto;cursor:grab;';
    svgWrap.innerHTML = buildSVG();
    overlay.appendChild(svgWrap);

    svgWrap.addEventListener('mousedown', onMouseDown);

    document.body.appendChild(overlay);
    updatePosition();
  }

  function refreshContent() {
    if (!lensContent) return;

    const origCanvases = document.body.querySelectorAll('canvas');
    const canvasData = [];
    origCanvases.forEach((c) => {
      try { canvasData.push(c.toDataURL()); }
      catch (e) { canvasData.push(null); }
    });

    const clone = document.body.cloneNode(true);
    const mag = clone.querySelector('#magnifier-overlay');
    if (mag) mag.remove();

    const clonedCanvases = clone.querySelectorAll('canvas');
    clonedCanvases.forEach((cc, i) => {
      if (canvasData[i]) {
        const img = document.createElement('img');
        img.src = canvasData[i];
        img.style.cssText = 'width:' + cc.width + 'px;height:' + cc.height + 'px;' + cc.style.cssText;
        cc.parentNode.replaceChild(img, cc);
      }
    });

    lensContent.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = document.body.className;
    wrapper.style.cssText = 'background:' + getComputedStyle(document.body).background + ';';
    wrapper.innerHTML = clone.innerHTML;
    lensContent.appendChild(wrapper);
  }

  function updatePosition() {
    if (!overlay) return;
    overlay.style.left = posX + 'px';
    overlay.style.top = posY + 'px';

    if (!lensContent) return;
    const centerX = posX + 160;
    const centerY = posY + 130;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const contentX = -(centerX + scrollX) * ZOOM + LENS_R;
    const contentY = -(centerY + scrollY) * ZOOM + LENS_R;
    lensContent.style.left = contentX + 'px';
    lensContent.style.top = contentY + 'px';
  }

  function onMouseDown(e) {
    e.preventDefault();
    dragging = true;
    dragOffsetX = e.clientX - posX;
    dragOffsetY = e.clientY - posY;
    overlay.querySelector('div:last-child').style.cursor = 'grabbing';
    refreshContent();
  }

  function onMouseMove(e) {
    if (!dragging) return;
    posX = e.clientX - dragOffsetX;
    posY = e.clientY - dragOffsetY;
    updatePosition();
  }

  function onMouseUp() {
    if (!dragging) return;
    dragging = false;
    if (overlay) {
      overlay.querySelector('div:last-child').style.cursor = 'grab';
    }
  }

  function toggle() {
    if (active) {
      destroy();
    } else {
      activateMag();
    }
  }

  function activateMag() {
    active = true;
    createOverlay();
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function destroy() {
    active = false;
    dragging = false;
    if (overlay) {
      overlay.remove();
      overlay = null;
      lensContent = null;
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function handleKeydown(e) {
    if (e.ctrlKey && e.altKey && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      toggle();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
    destroy();
  });
</script>
