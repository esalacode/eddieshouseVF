
const reviewPanel = document.getElementById('reviewPanel');
const reviewFilm = document.getElementById('reviewFilm');
const reviewMeta = document.getElementById('reviewMeta');
const reviewBody = document.getElementById('reviewBody');
const closeReviewBtn = document.getElementById('closeReviewBtn');

const locationLabel = document.getElementById('locationLabel');
const orientationLabel = document.getElementById('orientationLabel');
const ambientLabel = document.getElementById('ambientLabel');
const scene = document.getElementById('scene');
const transitionMask = document.getElementById('transitionMask');

const backPlaques = document.getElementById('backPlaques');
const leftPlaques = document.getElementById('leftPlaques');
const rightPlaques = document.getElementById('rightPlaques');

const backDecor = document.getElementById('backDecor');
const leftDecor = document.getElementById('leftDecor');
const rightDecor = document.getElementById('rightDecor');

const forwardDoor = document.getElementById('forwardDoor');
const leftDoorHotspot = document.getElementById('leftDoorHotspot');
const rightDoorHotspot = document.getElementById('rightDoorHotspot');

const turnLeftBtn = document.getElementById('turnLeftBtn');
const turnRightBtn = document.getElementById('turnRightBtn');
const forwardBtn = document.getElementById('forwardBtn');

const rooms = {
  foyer: {
    label: 'Foyer',
    colors: { wall: '#75624e', side: '#5f4f42', floor: '#261910', glow: 'rgba(255,228,175,0.15)' },
    ambience: 'entry',
    decor: { back: 'tall-frame', left: 'console', right: 'mirror' },
    exits: { north: 'lounge', east: 'hall', south: null, west: null }
  },
  lounge: {
    label: 'Lounge',
    colors: { wall: '#6a5848', side: '#54463b', floor: '#2c1f16', glow: 'rgba(255,220,180,0.14)' },
    ambience: 'soft hum',
    decor: { back: 'sofa-lamp', left: 'bookshelf', right: 'frame' },
    exits: { north: 'impossible', east: 'study', south: 'foyer', west: null }
  },
  hall: {
    label: 'Hall',
    colors: { wall: '#5d6069', side: '#4a4d57', floor: '#1f1712', glow: 'rgba(200,210,255,0.1)' },
    ambience: 'narrow passage',
    decor: { back: 'runner', left: 'frame', right: 'frame' },
    exits: { north: 'bathroom', east: null, south: 'basement', west: 'foyer' }
  },
  study: {
    label: 'Study',
    colors: { wall: '#614943', side: '#4e3c36', floor: '#2a1a14', glow: 'rgba(255,219,180,0.12)' },
    ambience: 'paper and dust',
    decor: { back: 'desk', left: 'bookshelf', right: 'lamp' },
    exits: { north: 'impossible', east: null, south: 'bedroom', west: 'lounge' }
  },
  bedroom: {
    label: 'Bedroom',
    colors: { wall: '#4a515c', side: '#3f454e', floor: '#201710', glow: 'rgba(210,220,255,0.1)' },
    ambience: 'late rewatch',
    decor: { back: 'bed', left: 'frame', right: 'dresser' },
    exits: { north: 'study', east: 'bathroom', south: 'basement', west: null }
  },
  bathroom: {
    label: 'Bathroom',
    colors: { wall: '#56645f', side: '#46534e', floor: '#171717', glow: 'rgba(205,255,240,0.1)' },
    ambience: 'tiles and echo',
    decor: { back: 'sink', left: 'mirror', right: 'cabinet' },
    exits: { north: 'impossible', east: null, south: 'hall', west: 'bedroom' }
  },
  basement: {
    label: 'Basement',
    colors: { wall: '#40352f', side: '#302721', floor: '#120d0b', glow: 'rgba(255,190,150,0.08)' },
    ambience: 'cold storage',
    decor: { back: 'shelves', left: 'boxes', right: 'pipe' },
    exits: { north: 'hall', east: 'impossible', south: null, west: 'bedroom' }
  },
  impossible: {
    label: 'Impossible Room',
    colors: { wall: '#313751', side: '#252a3d', floor: '#16131d', glow: 'rgba(170,190,255,0.12)' },
    ambience: 'this room should not fit here',
    decor: { back: 'double-door', left: 'frame', right: 'frame' },
    exits: { north: 'foyer', east: 'bathroom', south: 'study', west: 'lounge' }
  }
};

const directions = ['north', 'east', 'south', 'west'];
const directionLabels = {
  north: 'facing north',
  east: 'facing east',
  south: 'facing south',
  west: 'facing west'
};

let reviews = [];
let roomAssignments = {};
let isAnimating = false;

const state = {
  room: 'foyer',
  facing: 'north'
};

function directionIndex(dir) {
  return directions.indexOf(dir);
}

function rotateDirection(dir, delta) {
  const i = directionIndex(dir);
  return directions[(i + delta + 4) % 4];
}

function wallForRelative(targetDirection) {
  const current = directionIndex(state.facing);
  const target = directionIndex(targetDirection);
  const diff = (target - current + 4) % 4;
  if (diff === 0) return 'back';
  if (diff === 1) return 'right';
  if (diff === 3) return 'left';
  return 'hidden';
}

function assignRoom(index, review) {
  const order = ['foyer', 'lounge', 'hall', 'study', 'bedroom', 'bathroom', 'basement', 'impossible'];
  const rating = (review.rating || '').replace(/\s+/g, '');
  if (rating.includes('★★★★★')) return 'impossible';
  if (rating.includes('★★★★½')) return 'study';
  if (rating.includes('★★★★')) return 'lounge';
  if (rating.includes('★★★½')) return 'hall';
  if (rating.includes('★★★')) return 'bedroom';
  if (rating.includes('★★½') || rating.includes('★★') || rating.includes('★')) return 'basement';
  return order[index % order.length];
}

function distributeReviews() {
  roomAssignments = {};
  for (const room of Object.keys(rooms)) {
    roomAssignments[room] = { north: [], east: [], south: [], west: [] };
  }

  const wallOrder = ['north', 'east', 'west', 'south'];

  reviews.forEach((review, index) => {
    const room = review.room || assignRoom(index, review);
    const walls = roomAssignments[room] || roomAssignments.foyer;
    const wall = wallOrder[index % wallOrder.length];
    walls[wall].push(review);
  });
}

function decorate(el, type) {
  el.dataset.decor = type || '';
  el.innerHTML = '';
  const add = (cls, style = '') => {
    const node = document.createElement('div');
    node.className = `shape ${cls}`;
    if (style) node.style.cssText = style;
    el.appendChild(node);
  };

  switch (type) {
    case 'tall-frame':
      add('rect', 'left:14%;top:16%;width:18%;height:28%;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.15)');
      break;
    case 'console':
      add('rect', 'left:16%;bottom:14%;width:46%;height:10%;background:rgba(0,0,0,.28)');
      break;
    case 'mirror':
      add('oval', 'right:18%;top:18%;width:26%;height:22%;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04)');
      break;
    case 'sofa-lamp':
      add('rect', 'left:14%;bottom:12%;width:32%;height:14%;background:rgba(0,0,0,.24)');
      add('rect', 'right:18%;bottom:12%;width:4%;height:26%;background:rgba(0,0,0,.22)');
      add('oval', 'right:12%;bottom:35%;width:16%;height:10%;background:rgba(255,255,255,.05)');
      break;
    case 'bookshelf':
      add('rect', 'left:14%;bottom:11%;width:26%;height:42%;background:rgba(0,0,0,.24)');
      break;
    case 'frame':
      add('rect', 'left:24%;top:18%;width:22%;height:16%;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.16)');
      break;
    case 'runner':
      add('rect', 'left:42%;bottom:12%;width:16%;height:54%;background:rgba(255,255,255,.04)');
      break;
    case 'desk':
      add('rect', 'left:18%;bottom:12%;width:34%;height:12%;background:rgba(0,0,0,.24)');
      add('rect', 'left:24%;bottom:24%;width:18%;height:8%;background:rgba(0,0,0,.18)');
      break;
    case 'lamp':
      add('rect', 'right:18%;bottom:12%;width:4%;height:22%;background:rgba(0,0,0,.24)');
      add('oval', 'right:12%;bottom:33%;width:16%;height:10%;background:rgba(255,255,255,.06)');
      break;
    case 'bed':
      add('rect', 'left:16%;bottom:12%;width:44%;height:16%;background:rgba(0,0,0,.22)');
      add('rect', 'left:18%;bottom:22%;width:20%;height:8%;background:rgba(255,255,255,.05)');
      break;
    case 'dresser':
      add('rect', 'right:16%;bottom:12%;width:22%;height:24%;background:rgba(0,0,0,.22)');
      break;
    case 'sink':
      add('rect', 'left:20%;bottom:12%;width:26%;height:16%;background:rgba(255,255,255,.05)');
      add('rect', 'left:26%;bottom:28%;width:8%;height:5%;background:rgba(255,255,255,.05)');
      break;
    case 'cabinet':
      add('rect', 'right:18%;top:18%;width:22%;height:28%;background:rgba(0,0,0,.16);border:1px solid rgba(255,255,255,.07)');
      break;
    case 'shelves':
      add('rect', 'left:14%;bottom:12%;width:22%;height:42%;background:rgba(0,0,0,.24)');
      add('rect', 'right:18%;bottom:12%;width:18%;height:38%;background:rgba(0,0,0,.2)');
      break;
    case 'boxes':
      add('rect', 'left:18%;bottom:12%;width:22%;height:13%;background:rgba(0,0,0,.22)');
      add('rect', 'left:28%;bottom:24%;width:18%;height:10%;background:rgba(0,0,0,.2)');
      break;
    case 'pipe':
      add('rect', 'right:16%;top:0%;width:5%;height:65%;background:rgba(0,0,0,.22)');
      break;
    case 'double-door':
      add('rect', 'left:30%;bottom:10%;width:16%;height:46%;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07)');
      add('rect', 'left:48%;bottom:10%;width:16%;height:46%;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07)');
      break;
  }
}

function renderPlaque(review) {
  const button = document.createElement('button');
  button.className = 'plaque';
  button.type = 'button';

  const room = document.createElement('div');
  room.className = 'plaque-room';
  room.textContent = review.room || '';

  const film = document.createElement('div');
  film.className = 'plaque-film';
  film.textContent = review.film || 'Untitled';

  const meta = document.createElement('div');
  meta.className = 'plaque-meta';
  meta.textContent = [review.year, review.rating, review.watchedDate || review.date].filter(Boolean).join(' · ');

  const snippet = document.createElement('div');
  snippet.className = 'plaque-snippet';
  snippet.textContent = review.snippet || '';

  button.append(room, film, meta, snippet);
  button.addEventListener('click', () => openReview(review));
  return button;
}

function renderWall(container, items, limit) {
  container.replaceChildren();
  items.slice(0, limit).forEach((review) => container.appendChild(renderPlaque(review)));
}

function setDoor(el, visible) {
  el.classList.toggle('hidden', !visible);
}

function playAnimation(name, callback) {
  if (isAnimating) return;
  isAnimating = true;
  scene.classList.remove('anim-forward', 'anim-left', 'anim-right');
  transitionMask.classList.remove('active');
  void scene.offsetWidth;
  scene.classList.add(name);
  transitionMask.classList.add('active');
  if (callback) callback();

  window.setTimeout(() => {
    scene.classList.remove(name);
    transitionMask.classList.remove('active');
    isAnimating = false;
  }, name === 'anim-forward' ? 420 : 320);
}

function updateNavigation() {
  const config = rooms[state.room];
  const frontRoom = config.exits[state.facing];
  const leftRoom = config.exits[rotateDirection(state.facing, -1)];
  const rightRoom = config.exits[rotateDirection(state.facing, 1)];

  setDoor(forwardDoor, Boolean(frontRoom));
  setDoor(leftDoorHotspot, Boolean(leftRoom));
  setDoor(rightDoorHotspot, Boolean(rightRoom));

  forwardBtn.disabled = !frontRoom;
}

function applyRoomStyle() {
  const room = rooms[state.room];
  scene.style.setProperty('--wall-color', room.colors.wall);
  scene.style.setProperty('--side-color', room.colors.side);
  scene.style.setProperty('--floor-color', room.colors.floor);
  scene.style.setProperty('--glow-color', room.colors.glow);

  decorate(backDecor, room.decor.back);
  decorate(leftDecor, room.decor.left);
  decorate(rightDecor, room.decor.right);
}

function renderScene() {
  const room = rooms[state.room];
  applyRoomStyle();

  locationLabel.textContent = room.label;
  orientationLabel.textContent = directionLabels[state.facing];
  ambientLabel.textContent = room.ambience;

  const walls = roomAssignments[state.room] || { north: [], east: [], south: [], west: [] };

  const frontDirection = state.facing;
  const leftDirection = rotateDirection(state.facing, -1);
  const rightDirection = rotateDirection(state.facing, 1);

  renderWall(backPlaques, walls[frontDirection] || [], 4);
  renderWall(leftPlaques, walls[leftDirection] || [], 2);
  renderWall(rightPlaques, walls[rightDirection] || [], 2);

  updateNavigation();
}

function moveForward() {
  if (isAnimating) return;
  const nextRoom = rooms[state.room].exits[state.facing];
  if (!nextRoom) return;
  playAnimation('anim-forward', () => {
    state.room = nextRoom;
    renderScene();
  });
}

function turn(delta) {
  if (isAnimating) return;
  const anim = delta < 0 ? 'anim-left' : 'anim-right';
  playAnimation(anim, () => {
    state.facing = rotateDirection(state.facing, delta);
    renderScene();
  });
}

function strafe(delta) {
  if (delta < 0) {
    const next = rooms[state.room].exits[rotateDirection(state.facing, -1)];
    if (!next) return;
    turn(-1);
  } else {
    const next = rooms[state.room].exits[rotateDirection(state.facing, 1)];
    if (!next) return;
    turn(1);
  }
}

function openReview(review) {
  reviewFilm.textContent = review.film || 'Untitled';
  reviewMeta.textContent = [review.year, review.rating, review.watchedDate || review.date, review.room].filter(Boolean).join(' · ');
  reviewBody.textContent = review.body || review.snippet || '';
  reviewPanel.classList.add('visible');
}

function closeReview() {
  reviewPanel.classList.remove('visible');
}

async function loadFallbackReviews() {
  const res = await fetch('reviews.json');
  return await res.json();
}

async function loadLiveReviews() {
  const res = await fetch('/.netlify/functions/letterboxd');
  if (!res.ok) throw new Error(`Live feed failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.reviews) || !data.reviews.length) {
    throw new Error('No live reviews returned');
  }
  localStorage.setItem('myhouse-letterboxd-cache', JSON.stringify(data.reviews));
  return data.reviews;
}

async function loadReviews() {
  try {
    reviews = await loadLiveReviews();
  } catch (err) {
    const cached = localStorage.getItem('myhouse-letterboxd-cache');
    if (cached) {
      try {
        reviews = JSON.parse(cached);
      } catch (_) {}
    }
    if (!reviews.length) {
      reviews = await loadFallbackReviews();
    }
  }

  reviews = reviews
    .map((review, index) => ({
      ...review,
      id: review.id || `review-${index + 1}`,
      film: review.film || 'Untitled',
      body: (review.body || review.snippet || '').trim(),
      snippet: (review.snippet || review.body || '').replace(/\s+/g, ' ').trim().slice(0, 180),
      room: review.room || assignRoom(index, review)
    }))
    .filter((review) => review.body);

  distributeReviews();
  renderScene();
}

turnLeftBtn.addEventListener('click', () => turn(-1));
turnRightBtn.addEventListener('click', () => turn(1));
forwardBtn.addEventListener('click', moveForward);
forwardDoor.addEventListener('click', moveForward);
leftDoorHotspot.addEventListener('click', () => strafe(-1));
rightDoorHotspot.addEventListener('click', () => strafe(1));
closeReviewBtn.addEventListener('click', closeReview);

reviewPanel.addEventListener('click', (e) => {
  if (e.target === reviewPanel) closeReview();
});

window.addEventListener('keydown', (e) => {
  if (reviewPanel.classList.contains('visible') && e.key !== 'Escape') return;
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') turn(-1);
  if (k === 'arrowright' || k === 'd') turn(1);
  if (k === 'arrowup' || k === 'w' || k === 'enter') moveForward();
  if (k === 'escape') closeReview();
});

let touchStartX = 0;
let touchStartY = 0;

scene.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

scene.addEventListener('touchend', (e) => {
  if (reviewPanel.classList.contains('visible')) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) turn(1);
    else turn(-1);
  } else if (Math.abs(dy) > 60 && dy < 0) {
    moveForward();
  }
}, { passive: true });

loadReviews();
