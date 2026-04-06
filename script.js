
const reviewPanel = document.getElementById('reviewPanel');
const reviewFilm = document.getElementById('reviewFilm');
const reviewMeta = document.getElementById('reviewMeta');
const reviewBody = document.getElementById('reviewBody');
const closeReviewBtn = document.getElementById('closeReviewBtn');

const locationLabel = document.getElementById('locationLabel');
const ambientLabel = document.getElementById('ambientLabel');
const scene = document.getElementById('scene');

const backPlaques = document.getElementById('backPlaques');
const leftPlaques = document.getElementById('leftPlaques');
const rightPlaques = document.getElementById('rightPlaques');

const forwardDoor = document.getElementById('forwardDoor');
const leftDoor = document.getElementById('leftDoor');
const rightDoor = document.getElementById('rightDoor');

const turnLeftBtn = document.getElementById('turnLeftBtn');
const turnRightBtn = document.getElementById('turnRightBtn');
const forwardBtn = document.getElementById('forwardBtn');

const rooms = {
  foyer: {
    label: 'Foyer',
    colors: { wall: '#73614f', side: '#5c4d41' },
    ambience: 'entry',
    exits: { north: 'lounge', east: 'hall', south: 'foyer', west: 'foyer' }
  },
  lounge: {
    label: 'Lounge',
    colors: { wall: '#695749', side: '#56473d' },
    ambience: 'soft hum',
    exits: { south: 'foyer', east: 'study', north: 'impossible', west: 'lounge' }
  },
  hall: {
    label: 'Hall',
    colors: { wall: '#5d5f69', side: '#4b4d55' },
    ambience: 'narrow passage',
    exits: { west: 'foyer', north: 'bathroom', south: 'basement', east: 'hall' }
  },
  study: {
    label: 'Study',
    colors: { wall: '#634b44', side: '#513d37' },
    ambience: 'paper and dust',
    exits: { west: 'lounge', south: 'bedroom', north: 'impossible', east: 'study' }
  },
  bedroom: {
    label: 'Bedroom',
    colors: { wall: '#49505b', side: '#3f454f' },
    ambience: 'late rewatch',
    exits: { north: 'study', east: 'bathroom', west: 'bedroom', south: 'basement' }
  },
  bathroom: {
    label: 'Bathroom',
    colors: { wall: '#56635d', side: '#46524d' },
    ambience: 'tiles and echo',
    exits: { west: 'bedroom', south: 'hall', north: 'impossible', east: 'bathroom' }
  },
  basement: {
    label: 'Basement',
    colors: { wall: '#40352f', side: '#322923' },
    ambience: 'cold storage',
    exits: { north: 'hall', east: 'impossible', south: 'basement', west: 'bedroom' }
  },
  impossible: {
    label: 'Impossible Room',
    colors: { wall: '#31364f', side: '#252a3d' },
    ambience: 'this room should not fit here',
    exits: { south: 'study', west: 'lounge', east: 'bathroom', north: 'foyer' }
  }
};

const directions = ['north', 'east', 'south', 'west'];

let reviews = [];
let state = {
  room: 'foyer',
  facing: 'north'
};

let roomAssignments = {};

function directionIndex(dir) {
  return directions.indexOf(dir);
}

function rotateDirection(dir, delta) {
  const i = directionIndex(dir);
  return directions[(i + delta + 4) % 4];
}

function relativeWallForFacing(currentFacing, targetDirection) {
  const current = directionIndex(currentFacing);
  const target = directionIndex(targetDirection);
  const diff = (target - current + 4) % 4;
  if (diff === 0) return 'back';
  if (diff === 1) return 'right';
  if (diff === 3) return 'left';
  return 'none';
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

function renderWall(container, items) {
  container.replaceChildren();
  items.slice(0, container.classList.contains('side') ? 2 : 4).forEach((review) => {
    container.appendChild(renderPlaque(review));
  });
}

function updateDoors(room, facing) {
  const config = rooms[room];
  const frontDir = facing;
  const leftDir = rotateDirection(facing, -1);
  const rightDir = rotateDirection(facing, 1);

  const frontRoom = config.exits[frontDir];
  const leftRoomValue = config.exits[leftDir];
  const rightRoomValue = config.exits[rightDir];

  setDoor(forwardDoor, frontRoom && frontRoom !== room);
  setDoor(leftDoor, leftRoomValue && leftRoomValue !== room);
  setDoor(rightDoor, rightRoomValue && rightRoomValue !== room);

  forwardDoor.onclick = () => move(frontDir);
  leftDoor.onclick = () => move(leftDir);
  rightDoor.onclick = () => move(rightDir);

  forwardBtn.disabled = !(frontRoom && frontRoom !== room);
}

function setDoor(el, visible) {
  el.classList.toggle('hidden', !visible);
}

function renderScene() {
  const room = rooms[state.room];
  scene.style.setProperty('--wall-color', room.colors.wall);
  scene.style.setProperty('--side-color', room.colors.side);

  locationLabel.textContent = `${room.label} / ${state.facing}`;
  ambientLabel.textContent = room.ambience;

  const walls = roomAssignments[state.room] || { north: [], east: [], south: [], west: [] };
  const frontWall = relativeWallForFacing(state.facing, 'north') === 'back' ? walls.north :
                    relativeWallForFacing(state.facing, 'east') === 'back' ? walls.east :
                    relativeWallForFacing(state.facing, 'south') === 'back' ? walls.south :
                    walls.west;

  const leftWall = relativeWallForFacing(state.facing, 'north') === 'left' ? walls.north :
                   relativeWallForFacing(state.facing, 'east') === 'left' ? walls.east :
                   relativeWallForFacing(state.facing, 'south') === 'left' ? walls.south :
                   walls.west;

  const rightWall = relativeWallForFacing(state.facing, 'north') === 'right' ? walls.north :
                    relativeWallForFacing(state.facing, 'east') === 'right' ? walls.east :
                    relativeWallForFacing(state.facing, 'south') === 'right' ? walls.south :
                    walls.west;

  renderWall(backPlaques, frontWall);
  renderWall(leftPlaques, leftWall);
  renderWall(rightPlaques, rightWall);

  updateDoors(state.room, state.facing);
}

function move(direction) {
  const nextRoom = rooms[state.room].exits[direction];
  if (!nextRoom || nextRoom === state.room) return;
  state.room = nextRoom;
  state.facing = direction;
  renderScene();
}

function turn(delta) {
  state.facing = rotateDirection(state.facing, delta);
  renderScene();
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
forwardBtn.addEventListener('click', () => move(state.facing));
closeReviewBtn.addEventListener('click', closeReview);
reviewPanel.addEventListener('click', (e) => {
  if (e.target === reviewPanel) closeReview();
});

window.addEventListener('keydown', (e) => {
  if (reviewPanel.classList.contains('visible') && e.key !== 'Escape') return;
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') turn(-1);
  if (k === 'arrowright' || k === 'd') turn(1);
  if (k === 'arrowup' || k === 'w' || k === 'enter') move(state.facing);
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
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) turn(1);
    else turn(-1);
  } else if (Math.abs(dy) > 60 && dy < 0) {
    move(state.facing);
  }
}, { passive: true });

loadReviews();
