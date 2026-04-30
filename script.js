(function () {
  const ghost = document.getElementById('ghost');
  const revealedContent = document.querySelector('#revealed .content');
  const surfaceContent = document.querySelector('#surface .content');

  let mouseX = -9999;
  let mouseY = -9999;

  function updateLight(x, y) {
    document.documentElement.style.setProperty('--mouse-x', x + 'px');
    document.documentElement.style.setProperty('--mouse-y', y + 'px');
  }

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    updateLight(mouseX, mouseY);
  });

  // -------------------------------------------
  // Sync surface width to revealed width
  // so both blocks center with the same left edge
  // -------------------------------------------
  var roOffset = document.getElementById('ro-offset');
  var surfaceTitle = document.getElementById('surface-title');

  function syncLayout() {
    surfaceContent.style.minWidth = '';
    surfaceContent.style.minWidth = revealedContent.offsetWidth + 'px';
    surfaceTitle.style.paddingLeft = roOffset.offsetWidth + 'px';
  }

  syncLayout();
  document.fonts.ready.then(syncLayout);
  window.addEventListener('resize', syncLayout);

  // -------------------------------------------
  // Ghost: velocity-based drift with momentum
  // -------------------------------------------
  const FLEE_DISTANCE = 280;
  const SCARED_DISTANCE = 80;
  const PUSH_FORCE = 0.6;
  const FRICTION = 0.97;
  const GHOST_SIZE = 40;
  const RESPAWN_DELAY = 8000;
  let ghostX, ghostY;
  let ghostVX = 0, ghostVY = 0;
  let ghostAlive = true;

  function placeGhostNearName() {
    var h1 = revealedContent.querySelector('h1');
    var rect = h1.getBoundingClientRect();
    ghostX = rect.right + 20;
    ghostY = rect.top - 10;
    ghost.style.left = ghostX + 'px';
    ghost.style.top = ghostY + 'px';
  }

  function placeGhostRandom() {
    var padding = 80;
    for (var i = 0; i < 30; i++) {
      var x = padding + Math.random() * (window.innerWidth - padding * 2);
      var y = padding + Math.random() * (window.innerHeight - padding * 2);
      var dx = x - mouseX;
      var dy = y - mouseY;
      if (Math.sqrt(dx * dx + dy * dy) > FLEE_DISTANCE * 1.5) {
        ghostX = x;
        ghostY = y;
        ghost.style.left = x + 'px';
        ghost.style.top = y + 'px';
        return;
      }
    }
    ghostX = padding;
    ghostY = padding;
    ghost.style.left = padding + 'px';
    ghost.style.top = padding + 'px';
  }

  function ghostTick() {
    if (!ghostAlive) {
      requestAnimationFrame(ghostTick);
      return;
    }

    ghostVX *= FRICTION;
    ghostVY *= FRICTION;

    const cx = ghostX + GHOST_SIZE / 2;
    const cy = ghostY + GHOST_SIZE / 2;
    const dx = cx - mouseX;
    const dy = cy - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < FLEE_DISTANCE && dist > 0) {
      const proximity = 1 - dist / FLEE_DISTANCE;
      const force = proximity * proximity * PUSH_FORCE;
      const angle = Math.atan2(dy, dx);
      ghostVX += Math.cos(angle) * force;
      ghostVY += Math.sin(angle) * force;
    }

    if (dist < SCARED_DISTANCE) {
      ghost.classList.add('scared');
    } else {
      ghost.classList.remove('scared');
    }

    ghostX += ghostVX;
    ghostY += ghostVY;

    const padding = 20;
    ghostX = Math.max(padding, Math.min(window.innerWidth - padding - GHOST_SIZE, ghostX));
    ghostY = Math.max(padding, Math.min(window.innerHeight - padding - GHOST_SIZE, ghostY));

    if (ghostX <= padding || ghostX >= window.innerWidth - padding - GHOST_SIZE) ghostVX *= -0.5;
    if (ghostY <= padding || ghostY >= window.innerHeight - padding - GHOST_SIZE) ghostVY *= -0.5;

    ghost.style.left = ghostX + 'px';
    ghost.style.top = ghostY + 'px';

    requestAnimationFrame(ghostTick);
  }

  var isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches;

  function placeGhostMobile() {
    ghostX = window.innerWidth - 80;
    ghostY = surfaceContent.querySelector('h1').getBoundingClientRect().top - 60;
    ghost.style.left = ghostX + 'px';
    ghost.style.top = ghostY + 'px';
  }

  function placeGhostInitial() {
    if (isMobile) {
      placeGhostMobile();
    } else {
      placeGhostNearName();
    }
  }

  placeGhostInitial();
  document.fonts.ready.then(placeGhostInitial);
  requestAnimationFrame(ghostTick);

  // -------------------------------------------
  // Ghost click: poof and disappear
  // -------------------------------------------
  function spawnPoof(x, y) {
    var count = 10;
    for (var i = 0; i < count; i++) {
      var particle = document.createElement('div');
      particle.className = 'poof-particle';
      var angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      var distance = 30 + Math.random() * 40;
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.setProperty('--poof-x', Math.cos(angle) * distance + 'px');
      particle.style.setProperty('--poof-y', Math.sin(angle) * distance + 'px');
      particle.style.width = (4 + Math.random() * 6) + 'px';
      particle.style.height = particle.style.width;
      document.body.appendChild(particle);
      particle.addEventListener('animationend', function () {
        particle.remove();
      });
    }
  }

  ghost.addEventListener('click', function () {
    if (!ghostAlive) return;
    ghostAlive = false;
    var cx = ghostX + GHOST_SIZE / 2;
    var cy = ghostY + GHOST_SIZE / 2;
    spawnPoof(cx, cy);
    ghost.classList.add('poofed');
    ghost.classList.remove('scared');

    setTimeout(function () {
      ghostAlive = true;
      ghostVX = 0;
      ghostVY = 0;
      ghost.classList.remove('poofed');
      placeGhostRandom();
    }, RESPAWN_DELAY);
  });

  // -------------------------------------------
  // Mobile: ghost is just tappable, no light
  // -------------------------------------------
  if (matchMedia('(hover: none) and (pointer: coarse)').matches) {
    ghost.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (!ghostAlive) return;
      ghostAlive = false;
      spawnPoof(ghostX + GHOST_SIZE / 2, ghostY + GHOST_SIZE / 2);
      ghost.classList.add('poofed');
      setTimeout(function () {
        ghostAlive = true;
        ghostVX = 0;
        ghostVY = 0;
        ghost.classList.remove('poofed');
        placeGhostRandom();
      }, RESPAWN_DELAY);
    });
  }

  // -------------------------------------------
  // Email: copy to clipboard
  // -------------------------------------------
  document.querySelectorAll('.email-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var email = link.getAttribute('data-email');
      navigator.clipboard.writeText(email).then(function () {
        var existing = link.querySelector('.copied-label');
        if (existing) existing.remove();
        var label = document.createElement('span');
        label.className = 'copied-label';
        label.textContent = 'Copied!';
        link.appendChild(label);
        label.addEventListener('animationend', function () {
          label.remove();
        });
      });
    });
  });

  window.addEventListener('resize', function () {
    placeGhostInitial();
    syncLayout();
  });
})();
