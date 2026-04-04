const CONFIG = {
  API_BASE_URL:
   // "http://localhost:4000"
   "https://two017-class.onrender.com",

};

const state = {
  students: [],
  relationships: [],
  positions: new Map(),
  velocities: new Map(),
  linksById: new Map(),
  linkDrawList: [],
  backgroundStars: [],
  dustParticles: [],
  shootingStars: [],
  hoveredId: null,
  selectedId: null,
  panelExpandedId: null,
  viewOffset: { x: 0, y: 0 },
  targetOffset: { x: 0, y: 0 },
  viewScale: 1,
  targetScale: 1,
  dragOffset: { x: 0, y: 0 },
  dragActive: false,
  dragStart: null,
  dragBaseline: null,
  lowPower: false,
  repulsionStride: 1,
  token: localStorage.getItem("class_token") || "",
  me: null,
  lastFrame: performance.now(),
};

const canvas = document.getElementById("starCanvas");
const ctx = canvas?.getContext("2d");
const hoverCard = document.getElementById("hoverCard");
const starPanel = document.getElementById("starPanel");
const starPanelTitle = document.getElementById("starPanelTitle");
const starPanelMeta = document.getElementById("starPanelMeta");
const starPanelList = document.getElementById("starPanelList");
const starPanelClose = document.getElementById("starPanelClose");
const statusEl = document.getElementById("status");
const httpsWarning = document.getElementById("httpsWarning");
const pageStack = document.getElementById("pageStack");
const homeSection = document.getElementById("home");
const mainSection = document.getElementById("pageMain") || homeSection;
const starSection = document.getElementById("constellation");

const openAuth = document.getElementById("openAuth");
const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");

const registerName = document.getElementById("registerName");
const registerInvite = document.getElementById("registerInvite");
const registerBtn = document.getElementById("registerBtn");
const loginToken = document.getElementById("loginToken");
const loginBtn = document.getElementById("loginBtn");
const tokenHint = document.getElementById("tokenHint");

const meName = document.getElementById("meName");
const meGender = document.getElementById("meGender");
const meAvatar = document.getElementById("meAvatar");
const meBio = document.getElementById("meBio");
const meContact = document.getElementById("meContact");
const meTags = document.getElementById("meTags");
const saveMeBtn = document.getElementById("saveMeBtn");

const relationTo = document.getElementById("relationTo");
const relationType = document.getElementById("relationType");
const relationNote = document.getElementById("relationNote");
const addRelationBtn = document.getElementById("addRelationBtn");
const relationList = document.getElementById("relationList");
const relationRequests = document.getElementById("relationRequests");

const studentList = document.getElementById("studentList");
const scrollHome = document.getElementById("scrollHome");
const scrollEvents = document.getElementById("scrollEvents");
const scrollProfile = document.getElementById("scrollProfile");
const openProfile = document.getElementById("openProfile");
const closeProfile = document.getElementById("closeProfile");
const sidebarDrawer = document.getElementById("sidebarDrawer");
const navLinks = document.querySelectorAll(".nav a");
const navIndicator = document.getElementById("navIndicator");
const bottomNavIndicator = document.getElementById("bottomNavIndicator");
const bottomNav = document.querySelector(".bottom-nav");
const pageTransition = document.getElementById("pageTransition");
const toastStack = document.getElementById("toastStack");
const serverGate = document.getElementById("serverGate");
const serverGateStatus = document.getElementById("serverGateStatus");
const openNotifications = document.getElementById("openNotifications");
const notificationModal = document.getElementById("notificationModal");
const closeNotifications = document.getElementById("closeNotifications");
const notificationList = document.getElementById("notificationList");
const notificationBadge = document.getElementById("notificationBadge");
const logoutBtn = document.getElementById("logoutBtn");

const featuredTitle = document.getElementById("featuredTitle");
const featuredDate = document.getElementById("featuredDate");
const featuredDesc = document.getElementById("featuredDesc");
const eventsList = document.getElementById("eventsList");
const timelineList = document.getElementById("timelineList");
const postList = document.getElementById("postList");
const albumGrid = document.getElementById("albumGrid");
const lightbox = document.getElementById("lightbox");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxMeta = document.getElementById("lightboxMeta");

const messageList = document.getElementById("messageList");
const msgNickname = document.getElementById("msgNickname");
const msgSubtitle = document.getElementById("msgSubtitle");
const msgContent = document.getElementById("msgContent");
const msgImageFile = document.getElementById("msgImageFile");
const msgImage = document.getElementById("msgImage");
const msgAnonymous = document.getElementById("msgAnonymous");
const msgSubmit = document.getElementById("msgSubmit");
const msgHint = document.getElementById("msgHint");
const toggleMessages = document.getElementById("toggleMessages");
const messagePanel = document.getElementById("messagePanel");
const toggleStudents = document.getElementById("toggleStudents");
const studentPanel = document.getElementById("studentPanel");
const togglePosts = document.getElementById("togglePosts");
const postsPanel = document.getElementById("postsPanel");
const toggleEvents = document.getElementById("toggleEvents");
const eventsPanel = document.getElementById("eventsPanel");
const toggleTimeline = document.getElementById("toggleTimeline");
const timelinePanel = document.getElementById("timelinePanel");
const toggleAlbums = document.getElementById("toggleAlbums");
const albumsPanel = document.getElementById("albumsPanel");

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

if (pageStack) {
  pageStack.classList.add("hidden");
}

document.body.classList.add("constellation-lock");

function apiUrl(path) {
  return `${CONFIG.API_BASE_URL.replace(/\/+$/, "")}${path}`;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function updateAuthUI() {
  const loggedIn = !!state.token && !!state.me;
  if (openAuth) openAuth.style.display = loggedIn ? "none" : "";
  if (logoutBtn) logoutBtn.style.display = loggedIn ? "" : "none";
  if (!loggedIn) {
    setStatus("未登录");
    if (notificationBadge) notificationBadge.classList.add("hidden");
  }
}

let albumItems = [];
let albumIndex = 0;

function showLightbox() {
  if (!albumItems.length) return;
  const item = albumItems[albumIndex];
  lightboxImage.src = item.url;
  lightboxMeta.textContent = `${item.title || ""}${item.date ? " · " + item.date : ""}`;
}

function openLightbox(index) {
  albumIndex = index;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  showLightbox();
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
}

function showWarningIfNeeded() {
  if (location.protocol === "https:" && CONFIG.API_BASE_URL.startsWith("http://")) {
    httpsWarning.style.display = "block";
  }
}

function openModal() {
  authModal.classList.add("open");
  authModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
}

function openNotificationModal() {
  if (!notificationModal) return;
  notificationModal.classList.add("open");
  notificationModal.setAttribute("aria-hidden", "false");
}

function closeNotificationModal() {
  if (!notificationModal) return;
  notificationModal.classList.remove("open");
  notificationModal.setAttribute("aria-hidden", "true");
}

function openDrawer() {
  if (!window.location.pathname.includes("/students")) {
    showToast("提示", "资料/关系仅在 Students 页面可用。");
    return;
  }
  if (!sidebarDrawer || !closeProfile) {
    showToast("提示", "当前页面未加载资料面板。");
    return;
  }
  sidebarDrawer.removeAttribute("inert");
  sidebarDrawer.classList.add("open");
  sidebarDrawer.setAttribute("aria-hidden", "false");
  closeProfile.classList.add("open");
  requestAnimationFrame(() => {
    const focusTarget =
      sidebarDrawer.querySelector("input, textarea, select, button") || sidebarDrawer;
    if (focusTarget && focusTarget.focus) focusTarget.focus();
  });
}

function closeDrawer() {
  if (!sidebarDrawer || !closeProfile) return;
  if (document.activeElement && sidebarDrawer.contains(document.activeElement)) {
    if (openProfile && openProfile.focus) openProfile.focus();
    else document.activeElement.blur();
  }
  sidebarDrawer.classList.remove("open");
  sidebarDrawer.setAttribute("aria-hidden", "true");
  sidebarDrawer.setAttribute("inert", "");
  closeProfile.classList.remove("open");
}

function updateHeaderHeight() {
  const header = document.querySelector(".topbar");
  const height = header ? header.offsetHeight : 72;
  document.documentElement.style.setProperty("--header-h", `${height}px`);
}

function showToast(title, message) {
  if (!toastStack) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-title">${title || "提示"}</div>
    <div>${message || ""}</div>
  `;
  toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 240);
  }, 2400);
}

function showServerGate(message) {
  if (!serverGate) return;
  if (serverGateStatus && message) serverGateStatus.textContent = message;
  serverGate.classList.add("show");
  serverGate.setAttribute("aria-hidden", "false");
}

function hideServerGate() {
  if (!serverGate) return;
  serverGate.classList.remove("show");
  serverGate.setAttribute("aria-hidden", "true");
}

function normalizePath(pathname) {
  if (!pathname) return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function setNavIndicator(container, indicator, scrollIntoView = false) {
  if (!container || !indicator) return;
  const links = Array.from(container.querySelectorAll("a"));
  if (!links.length) return;
  const currentPath = normalizePath(window.location.pathname);
  let active = links.find((link) => {
    const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
    return linkPath === currentPath;
  });
  if (!active) {
    active = links[0];
  }
  links.forEach((link) => link.classList.toggle("nav-active", link === active));
  const rect = active.getBoundingClientRect();
  const parentRect = container.getBoundingClientRect();
  const left = rect.left - parentRect.left + container.scrollLeft;
  indicator.style.width = `${rect.width}px`;
  indicator.style.transform = `translateX(${left}px)`;
  if (scrollIntoView) {
    active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function updateNavIndicators() {
  setNavIndicator(document.querySelector(".nav"), navIndicator);
  setNavIndicator(bottomNav, bottomNavIndicator, true);
}

function getNavOrder() {
  return Array.from(document.querySelectorAll(".nav a")).map((link) =>
    normalizePath(new URL(link.href, window.location.origin).pathname)
  );
}

function applyEnterTransition() {
  const dir = sessionStorage.getItem("navDirection");
  if (!dir) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove(`nav-enter-${dir}`);
      sessionStorage.removeItem("navDirection");
    });
  });
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  updateRenderBudget();
  buildBackgroundStars();
  drawScene();
}

function updateRenderBudget() {
  const isSmallScreen = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
  const heavyGraph = state.students.length > 120 || state.relationships.length > 260;
  state.lowPower = isSmallScreen || heavyGraph;
  state.repulsionStride = state.students.length > 140 ? 3 : state.students.length > 90 ? 2 : 1;
  document.body.classList.toggle("low-power", state.lowPower);
  rebuildLinkDrawList();
}

function buildBackgroundStars() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const starCount = state.lowPower ? 140 : 260;
  const dustCount = state.lowPower ? 40 : 80;
  state.backgroundStars = Array.from({ length: starCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.6 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    hue: 210 + Math.random() * 40,
  }));
  state.dustParticles = Array.from({ length: dustCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 6 + Math.random() * 14,
    a: 0.05 + Math.random() * 0.08,
    drift: 0.02 + Math.random() * 0.05,
  }));
  state.shootingStars = [];
}

function rebuildRelationIndex() {
  const linksById = new Map();
  state.relationships.forEach((rel) => {
    const from = rel.from_student_id;
    const to = rel.to_student_id;
    if (!linksById.has(from)) linksById.set(from, []);
    if (!linksById.has(to)) linksById.set(to, []);
    linksById.get(from).push(rel);
    linksById.get(to).push(rel);
  });
  state.linksById = linksById;
  rebuildLinkDrawList();
}

function rebuildLinkDrawList() {
  const limit = state.lowPower ? 220 : 9999;
  if (state.relationships.length <= limit) {
    state.linkDrawList = state.relationships;
    return;
  }
  const stride = Math.ceil(state.relationships.length / limit);
  state.linkDrawList = state.relationships.filter((_, idx) => idx % stride === 0);
}

function initPositions() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.38;
  const goldenAngle = 2.399963229728653;
  const studentIds = new Set(state.students.map((s) => s.id));

  state.students.forEach((student, index) => {
    if (!state.positions.has(student.id)) {
      const r = Math.sqrt(index + 1) / Math.sqrt(state.students.length + 1) * maxRadius;
      const angle = index * goldenAngle;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      state.positions.set(student.id, { x, y });
      state.velocities.set(student.id, { x: 0, y: 0 });
    }
  });

  for (const id of state.positions.keys()) {
    if (!studentIds.has(id)) {
      state.positions.delete(id);
      state.velocities.delete(id);
    }
  }
}

function applyForces(dt) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const center = { x: width / 2, y: height / 2 };

  const ids = state.students.map((s) => s.id);
  const repulsion = 2200;
  const attraction = 0.004;
  const edgePadding = 40;
  const repulsionStride = state.repulsionStride || 1;

  for (let i = 0; i < ids.length; i += 1) {
    const idA = ids[i];
    const posA = state.positions.get(idA);
    const velA = state.velocities.get(idA);
    if (!posA || !velA) continue;

    let fx = (center.x - posA.x) * attraction;
    let fy = (center.y - posA.y) * attraction;

    for (let j = 0; j < ids.length; j += repulsionStride) {
      if (i === j) continue;
      const idB = ids[j];
      const posB = state.positions.get(idB);
      if (!posB) continue;
      const dx = posA.x - posB.x;
      const dy = posA.y - posB.y;
      const distSq = dx * dx + dy * dy + 0.01;
      const force = repulsion / distSq;
      fx += (dx / Math.sqrt(distSq)) * force;
      fy += (dy / Math.sqrt(distSq)) * force;
    }

    const links = state.linksById.get(idA);
    if (links) {
      links.forEach((rel) => {
        const otherId = rel.from_student_id === idA ? rel.to_student_id : rel.from_student_id;
        const posB = state.positions.get(otherId);
        if (!posB) return;
        fx += (posB.x - posA.x) * 0.008;
        fy += (posB.y - posA.y) * 0.008;
      });
    }

    velA.x = (velA.x + fx * dt) * 0.88;
    velA.y = (velA.y + fy * dt) * 0.88;

    posA.x += velA.x * dt * 60;
    posA.y += velA.y * dt * 60;

    posA.x = Math.max(edgePadding, Math.min(width - edgePadding, posA.x));
    posA.y = Math.max(edgePadding, Math.min(height - edgePadding, posA.y));
  }
}

function getDrawLinks() {
  if (state.selectedId) {
    return state.linksById.get(state.selectedId) || [];
  }
  return state.linkDrawList || [];
}

function getScreenPosition(pos) {
  return {
    x: pos.x * state.viewScale + state.viewOffset.x + state.dragOffset.x,
    y: pos.y * state.viewScale + state.viewOffset.y + state.dragOffset.y,
  };
}

function updateViewOffset() {
  if (!canvas) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  let targetX = 0;
  let targetY = 0;
  let targetScale = 1;
  if (state.selectedId) {
    const pos = state.positions.get(state.selectedId);
    if (pos) {
      targetScale = state.lowPower ? 1.035 : 1.06;
      targetX = width / 2 - pos.x * targetScale;
      targetY = height / 2 - pos.y * targetScale;
    }
  }
  state.targetOffset.x = targetX;
  state.targetOffset.y = targetY;
  state.targetScale = targetScale;
  const ease = state.lowPower ? 0.12 : 0.08;
  state.viewOffset.x += (targetX - state.viewOffset.x) * ease;
  state.viewOffset.y += (targetY - state.viewOffset.y) * ease;
  state.viewScale += (targetScale - state.viewScale) * ease;
  if (!state.dragActive) {
    state.dragOffset.x *= 0.86;
    state.dragOffset.y *= 0.86;
  }
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  initPositions();
  const t = performance.now() / 1000;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const focusPos = state.selectedId ? state.positions.get(state.selectedId) : null;
  const focusScreen = focusPos ? getScreenPosition(focusPos) : null;

  // deep space backdrop glow
  const bg = ctx.createRadialGradient(width * 0.2, height * 0.2, 20, width * 0.5, height * 0.5, Math.max(width, height));
  bg.addColorStop(0, "rgba(40, 70, 140, 0.35)");
  bg.addColorStop(0.45, "rgba(15, 25, 60, 0.2)");
  bg.addColorStop(1, "rgba(4, 6, 16, 0.9)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // subtle radial bloom for depth
  const wave = 0.5 + 0.5 * Math.sin(t * 0.35);
  const bloomX = focusScreen ? focusScreen.x : width * 0.6;
  const bloomY = focusScreen ? focusScreen.y : height * 0.45;
  const bloom = ctx.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, Math.max(width, height) * 0.6);
  bloom.addColorStop(0, `rgba(100, 160, 255, ${0.08 + wave * 0.08})`);
  bloom.addColorStop(0.5, "rgba(70, 120, 220, 0.04)");
  bloom.addColorStop(1, "rgba(4, 6, 16, 0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);

  if (focusScreen && !state.lowPower) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
    const halo = ctx.createRadialGradient(
      focusScreen.x,
      focusScreen.y,
      0,
      focusScreen.x,
      focusScreen.y,
      220 + pulse * 140
    );
    halo.addColorStop(0, `rgba(140, 210, 255, ${0.18 + pulse * 0.12})`);
    halo.addColorStop(0.35, "rgba(90, 150, 255, 0.08)");
    halo.addColorStop(1, "rgba(6, 10, 24, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);
  }

  // nebula dust
  if (!state.lowPower) {
    state.dustParticles.forEach((dust, idx) => {
      const offset = (t * dust.drift * 10 + idx) % width;
      const x = (dust.x + offset) % width;
      const y = (dust.y + Math.sin(t * dust.drift + idx) * 6 + height) % height;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, dust.r);
      gradient.addColorStop(0, `rgba(120, 170, 255, ${dust.a})`);
      gradient.addColorStop(1, "rgba(120, 170, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, dust.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  state.backgroundStars.forEach((star) => {
    const twinkle = 0.4 + 0.6 * Math.sin(t * 1.2 + star.phase);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${star.hue}, 70%, 85%, ${0.12 + twinkle * 0.25})`;
    ctx.fill();
  });

  // random shooting stars
  if (!state.lowPower && Math.random() < 0.01 && state.shootingStars.length < 2) {
    state.shootingStars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.5,
      vx: 6 + Math.random() * 4,
      vy: 3 + Math.random() * 2,
      life: 0,
    });
  }
  state.shootingStars = state.shootingStars.filter((s) => s.life < 1.2);
  state.shootingStars.forEach((s) => {
    s.life += 0.02;
    s.x += s.vx;
    s.y += s.vy;
    const trail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 10, s.y - s.vy * 10);
    trail.addColorStop(0, "rgba(210, 235, 255, 0.8)");
    trail.addColorStop(1, "rgba(210, 235, 255, 0)");
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 10, s.y - s.vy * 10);
    ctx.stroke();
  });

  ctx.save();
  ctx.translate(state.viewOffset.x + state.dragOffset.x, state.viewOffset.y + state.dragOffset.y);
  ctx.scale(state.viewScale, state.viewScale);
  ctx.lineWidth = 1.2;
  const linksToDraw = getDrawLinks();
  linksToDraw.forEach((rel, index) => {
    const from = state.positions.get(rel.from_student_id);
    const to = state.positions.get(rel.to_student_id);
    if (!from || !to) return;
    const pulse = 0.3 + 0.7 * Math.sin(t * 1.1 + index);
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2 - 20;
    const isFocus = state.selectedId && (rel.from_student_id === state.selectedId || rel.to_student_id === state.selectedId);
    const alphaBoost = isFocus ? 0.55 : 0.0;
    const baseAlpha = 0.05 + pulse * (0.18 + alphaBoost);
    const dimFactor = state.selectedId && !isFocus ? 0.22 : 1;
    if (!state.lowPower) {
      const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      grad.addColorStop(0, `rgba(120, 190, 255, ${baseAlpha * 0.6 * dimFactor})`);
      grad.addColorStop(0.5, `rgba(190, 230, 255, ${baseAlpha * 1.2 * dimFactor})`);
      grad.addColorStop(1, `rgba(120, 190, 255, ${baseAlpha * 0.5 * dimFactor})`);
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = `rgba(141, 211, 255, ${baseAlpha * dimFactor})`;
    }
    if (isFocus) {
      ctx.shadowColor = "rgba(120, 210, 255, 0.6)";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.1;
    } else {
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.1;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.stroke();
  });

  state.students.forEach((student) => {
    const pos = state.positions.get(student.id);
    if (!pos) return;
    const flicker = 0.6 + 0.4 * Math.sin(t * 2.2 + student.id.length);
    const isHovered = state.hoveredId === student.id;
    const isSelected = state.selectedId === student.id;
    const dim = state.selectedId && !isSelected ? 0.4 : 1;
    const radius = isSelected ? 9 : isHovered ? 7 : 3.2 + flicker * 1.6;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isSelected
      ? "#fff6c2"
      : isHovered
        ? `rgba(254, 249, 215, ${0.95 * dim})`
        : `rgba(254, 249, 215, ${0.75 * dim})`;
    ctx.shadowColor = isSelected ? "rgba(140, 220, 255, 0.9)" : "rgba(242, 167, 255, 0.7)";
    ctx.shadowBlur = isSelected ? 26 : isHovered ? 14 : (6 + flicker * 8) * dim;
    ctx.fill();
  });

  if (state.selectedId) {
    const pos = state.positions.get(state.selectedId);
    if (pos) {
      const screenPos = getScreenPosition(pos);
      positionStarPanel(screenPos.x, screenPos.y);
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 14 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160, 220, 255, ${0.35 + pulse * 0.35})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 26 + pulse * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120, 180, 255, ${0.12 + pulse * 0.18})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function animate() {
  if (!canvas || !ctx) return;
  const now = performance.now();
  const frameSkip = state.lowPower ? 2 : 1;
  state._frameCount = (state._frameCount || 0) + 1;
  if (frameSkip > 1 && state._frameCount % frameSkip !== 0) {
    requestAnimationFrame(animate);
    return;
  }
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  applyForces(dt);
  updateViewOffset();
  drawScene();
  requestAnimationFrame(animate);
}

function showHoverCard(student, x, y) {
  hoverCard.innerHTML = `
    <strong>${student.name}</strong><br />
    <span>${student.bio || ""}</span><br />
    <small>${student.contact || ""}</small>
  `;
  hoverCard.style.left = `${x + 12}px`;
  hoverCard.style.top = `${y + 12}px`;
  hoverCard.classList.add("visible");
}

function hideHoverCard() {
  hoverCard.classList.remove("visible");
}

function getStudentById(id) {
  return state.students.find((s) => s.id === id);
}

function positionStarPanel(x, y) {
  if (!starPanel || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const panelRect = starPanel.getBoundingClientRect();
  const margin = 12;
  let left = rect.left + x + 16;
  let top = rect.top + y + 16;
  if (left + panelRect.width > rect.right - margin) {
    left = rect.right - panelRect.width - margin;
  }
  if (top + panelRect.height > rect.bottom - margin) {
    top = rect.bottom - panelRect.height - margin;
  }
  left = Math.max(rect.left + margin, left);
  top = Math.max(rect.top + margin, top);
  starPanel.style.left = `${left - rect.left}px`;
  starPanel.style.top = `${top - rect.top}px`;
}

function renderStarPanel(studentId) {
  if (!starPanel || !starPanelTitle || !starPanelList) return;
  if (!studentId) {
    starPanel.classList.remove("show");
    starPanel.classList.add("hidden");
    starPanelTitle.textContent = "";
    starPanelMeta.textContent = "";
    starPanelList.innerHTML = "";
    state.panelExpandedId = null;
    return;
  }
  starPanel.classList.remove("hidden");
  starPanel.classList.add("show");
  const student = getStudentById(studentId);
  starPanelTitle.textContent = student ? student.name : studentId;
  const links = state.linksById.get(studentId) || [];
  const metaParts = [];
  if (student?.tags) metaParts.push(student.tags);
  if (student?.contact) metaParts.push(student.contact);
  metaParts.push(`关系 ${links.length} 条`);
  starPanelMeta.textContent = metaParts.filter(Boolean).join(" · ");

  if (!links.length) {
    starPanelList.innerHTML = "<div class='star-panel-item'>暂无关系</div>";
    return;
  }
  const maxItems = state.lowPower ? 12 : 20;
  const isExpanded = state.panelExpandedId === studentId;
  const visibleLinks = isExpanded ? links : links.slice(0, maxItems);
  starPanelList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  visibleLinks.forEach((rel) => {
    const otherId = rel.from_student_id === studentId ? rel.to_student_id : rel.from_student_id;
    const other = getStudentById(otherId);
    const item = document.createElement("div");
    item.className = "star-panel-item";
    const name = document.createElement("span");
    name.className = "relation-name";
    name.textContent = other ? other.name : otherId;
    const type = document.createElement("span");
    type.className = "relation-tag";
    type.textContent = rel.type || "关系";
    item.appendChild(name);
    item.appendChild(document.createTextNode(" · "));
    item.appendChild(type);
    if (rel.note) {
      const note = document.createElement("span");
      note.className = "relation-note";
      note.textContent = rel.note;
      item.appendChild(document.createTextNode(" · "));
      item.appendChild(note);
    }
    fragment.appendChild(item);
  });
  if (links.length > maxItems) {
    const more = document.createElement("button");
    more.className = "star-panel-more";
    more.type = "button";
    more.textContent = isExpanded ? `收起关系 (${links.length})` : `查看更多关系 (${links.length})`;
    more.addEventListener("click", () => {
      state.panelExpandedId = isExpanded ? null : studentId;
      renderStarPanel(studentId);
    });
    fragment.appendChild(more);
  }
  starPanelList.appendChild(fragment);
}

function refreshStudentList() {
  if (!studentList) return;
  studentList.innerHTML = "";
  state.students.forEach((student) => {
    const card = document.createElement("div");
    card.className = "student-card";
    const bio = student.bio || "暂无简介";
    const contact = student.contact || "暂无联系方式";
    const tags = student.tags || "暂无标签";
    card.innerHTML = `
      <strong>${student.name}</strong>
      <div>${student.tags || ""}</div>
      <div class="student-details">
        <div>${bio}</div>
        <div>${contact}</div>
        <div>${tags}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      const isExpanded = card.classList.contains("expanded");
      document.querySelectorAll(".student-card.expanded").forEach((el) => {
        if (el !== card) el.classList.remove("expanded");
      });
      card.classList.toggle("expanded", !isExpanded);
    });
    studentList.appendChild(card);
  });

  if (!relationTo) return;
  relationTo.innerHTML = "";
  state.students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = `${student.name} (${student.id})`;
    relationTo.appendChild(option);
  });
}

function refreshRelations() {
  if (!relationList) return;
  relationList.innerHTML = "";
  if (!state.me) return;
  const mine = state.relationships.filter((rel) => rel.from_student_id === state.me.id);
  mine.forEach((rel) => {
    const target = getStudentById(rel.to_student_id);
    const item = document.createElement("div");
    item.className = "relation-item";
    item.innerHTML = `
      <span>${target ? target.name : rel.to_student_id} · ${rel.type || "关系"}</span>
      <button data-id="${rel.id}">删除</button>
    `;
    item.querySelector("button").addEventListener("click", async () => {
      await deleteRelation(rel.id);
    });
    relationList.appendChild(item);
  });
}

async function loadPendingRelations() {
  if (!state.me || !relationRequests) return;
  try {
    const pending = await apiFetch("/relationships/pending");
    relationRequests.innerHTML = "";
    pending.forEach((rel) => {
      const isIncoming = rel.to_student_id === state.me.id;
      const otherId = isIncoming ? rel.from_student_id : rel.to_student_id;
      const other = getStudentById(otherId);
      const item = document.createElement("div");
      item.className = "request-item";
      item.innerHTML = `
        <strong>${other ? other.name : otherId}</strong>
        <div>${rel.type || "关系请求"} ${rel.note ? "· " + rel.note : ""}</div>
        <div class="request-actions">
          ${isIncoming ? `<button data-accept="${rel.id}">同意</button>` : ""}
          ${isIncoming ? `<button class="ghost" data-reject="${rel.id}">拒绝</button>` : ""}
          ${!isIncoming ? `<span class="hint">已发送，等待对方同意</span>` : ""}
        </div>
      `;
      if (isIncoming) {
        item.querySelector(`[data-accept="${rel.id}"]`).addEventListener("click", async () => {
          await apiFetch(`/relationships/${rel.id}/accept`, { method: "POST" });
          await loadData();
          await loadPendingRelations();
        });
        item.querySelector(`[data-reject="${rel.id}"]`).addEventListener("click", async () => {
          await apiFetch(`/relationships/${rel.id}/reject`, { method: "POST" });
          await loadPendingRelations();
        });
      }
      relationRequests.appendChild(item);
    });
  } catch (err) {
    relationRequests.innerHTML = `<div class="hint">${err.message}</div>`;
  }
}

function renderContent(data) {
  if (data.featured) {
    if (featuredTitle) featuredTitle.textContent = data.featured.title || "";
    if (featuredDate) featuredDate.textContent = data.featured.date || "";
    if (featuredDesc) featuredDesc.textContent = data.featured.desc || "";
  }

  if (eventsList) {
    eventsList.innerHTML = "";
    (data.events || []).forEach((event) => {
      const li = document.createElement("li");
      li.textContent = event;
      eventsList.appendChild(li);
    });
  }

  if (postList) {
    postList.innerHTML = "";
    (data.posts || []).forEach((post) => {
      const card = document.createElement("div");
      card.className = "post-card";
      card.innerHTML = `
        <img class="post-cover" src="${post.cover || ""}" alt="${post.title || ""}" />
        <div>
          <strong>${post.title || ""}</strong>
          <div class="post-meta">${post.date || ""}</div>
          <p>${post.summary || ""}</p>
        </div>
      `;
      postList.appendChild(card);
    });
  }

  if (timelineList) {
    timelineList.innerHTML = "";
    (data.timeline || []).forEach((item) => {
      const div = document.createElement("div");
      div.className = "timeline-item";
      div.innerHTML = `
        <div class="dot"></div>
        <div>
          <strong>${item.year || ""}</strong>
          <p>${item.text || ""}</p>
        </div>
      `;
      timelineList.appendChild(div);
    });
  }

  if (albumGrid) {
    albumGrid.innerHTML = "";
    albumItems = data.albums || [];
    albumItems.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "album-item";
      div.innerHTML = `
        <img class="album-img" src="${item.url}" alt="${item.title || ""}" />
        <div class="album-caption">${item.title || ""} ${item.date ? "· " + item.date : ""}</div>
      `;
      div.addEventListener("click", () => openLightbox(index));
      albumGrid.appendChild(div);
    });
  }
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(apiUrl(path), { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
  return res.json();
}

async function loadContent() {
  try {
    const data = await apiFetch("/content");
    renderContent(data);
  } catch (err) {
    setStatus(err.message);
  }
}

async function loadData() {
  try {
    const [students, relationships] = await Promise.all([
      apiFetch("/students"),
      apiFetch("/relationships"),
    ]);
    state.students = students;
    state.relationships = relationships;
    rebuildRelationIndex();
    updateRenderBudget();
    refreshStudentList();
    refreshRelations();
    renderStarPanel(state.selectedId);
    drawScene();
    await loadPendingRelations();
  } catch (err) {
    setStatus(err.message);
  }
}

async function loadMessages() {
  try {
    if (!messageList) return;
    const data = await apiFetch("/messages");
    messageList.innerHTML = "";
    data.forEach((msg) => {
      const card = document.createElement("div");
      card.className = "message-card";
      const author = msg.is_anonymous ? "匿名同学" : (msg.student_name || msg.student_id);
      const comments = Array.isArray(msg.comments) ? msg.comments : [];
      const commentItems = comments
        .map((c) => {
          const name = c.student_name || c.student_id;
          const date = c.created_at ? c.created_at.split("T")[0] : "";
          const canDelete = state.me && state.me.id === c.student_id;
          return `
            <div class="comment-item">
              <div class="comment-head">
                <strong>${name}</strong>
                <span>${date}</span>
                ${canDelete ? `<button class="ghost" data-delete="${c.id}" data-message="${msg.id}">删除</button>` : ""}
              </div>
              <div class="comment-body">${c.content}</div>
            </div>
          `;
        })
        .join("");
      card.innerHTML = `
        <strong>${author}</strong>
        <div class="message-meta">${msg.subtitle || ""} ${msg.created_at ? "· " + msg.created_at.split("T")[0] : ""}</div>
        <p>${msg.content}</p>
        ${msg.image_url ? `<img src="${msg.image_url}" alt="message" />` : ""}
        <div class="comment-section">
          <div class="comment-title">评论</div>
          <div class="comment-list">${commentItems || "<div class='comment-empty'>暂无评论</div>"}</div>
          <div class="comment-form">
            <input type="text" placeholder="${state.token ? "写下你的评论" : "请先登录后评论"}" ${state.token ? "" : "disabled"} />
            <button ${state.token ? "" : "disabled"} data-submit="${msg.id}">发送</button>
          </div>
        </div>
      `;
      const input = card.querySelector(".comment-form input");
      const submitBtn = card.querySelector(`[data-submit="${msg.id}"]`);
      if (submitBtn && input) {
        submitBtn.addEventListener("click", async () => {
          const content = input.value.trim();
          if (!content) return;
          try {
            await apiFetch(`/messages/${msg.id}/comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            });
            await loadMessages();
          } catch (err) {
            msgHint.textContent = err.message;
          }
        });
      }
      card.querySelectorAll("[data-delete]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const commentId = btn.getAttribute("data-delete");
            const messageId = btn.getAttribute("data-message");
            await apiFetch(`/messages/${messageId}/comments/${commentId}`, { method: "DELETE" });
            await loadMessages();
          } catch (err) {
            msgHint.textContent = err.message;
          }
        });
      });
      messageList.appendChild(card);
    });
  } catch (err) {
    if (msgHint) {
      msgHint.textContent = err.message.includes("Missing token")
        ? "请先登录后查看留言"
        : err.message;
    }
  }
}

let lastNotificationId = null;
let notificationTimer = null;

async function loadNotifications({ toastIfNew } = { toastIfNew: false }) {
  try {
    if (!state.token || !notificationList) return;
    const data = await apiFetch("/notifications");
    const { unread, items } = data || { unread: 0, items: [] };
    if (notificationBadge) {
      notificationBadge.textContent = unread;
      notificationBadge.classList.toggle("hidden", unread === 0);
    }
    notificationList.innerHTML = "";
    if (!items.length) {
      notificationList.innerHTML = "<div class='hint'>暂无消息</div>";
    }
    items.forEach((note) => {
      const item = document.createElement("div");
      item.className = `notification-item ${note.is_read ? "" : "unread"}`;
      item.innerHTML = `
        <strong>${note.title}</strong>
        <div>${note.content}</div>
        <div class="notification-meta">${note.created_at ? note.created_at.split("T")[0] : ""}</div>
      `;
      item.addEventListener("click", async () => {
        await apiFetch(`/notifications/${note.id}/read`, { method: "POST" });
        if (note.link) {
          window.location.href = note.link;
        } else {
          await loadNotifications();
        }
      });
      notificationList.appendChild(item);
    });
    const newestId = items[0]?.id || null;
    if (toastIfNew && newestId && newestId !== lastNotificationId) {
      showToast("新消息", items[0]?.title || "你有新的消息");
    }
    if (!lastNotificationId) {
      lastNotificationId = newestId;
    } else if (newestId) {
      lastNotificationId = newestId;
    }
  } catch (err) {
    setStatus(err.message);
  }
}

async function register() {
  try {
    const name = registerName.value.trim();
    const inviteCode = registerInvite.value.trim();
    if (!name) throw new Error("请输入姓名");
    if (!inviteCode) throw new Error("请输入邀请码");

    const res = await apiFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, inviteCode }),
    });

    state.token = res.token;
    localStorage.setItem("class_token", res.token);
    tokenHint.textContent = `你的Token：${res.token}`;
    loginToken.value = res.token;
    await loginWithToken(res.token);
    closeModal();
  } catch (err) {
    setStatus(err.message);
  }
}

async function loginWithToken(token) {
  try {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    state.token = res.token;
    localStorage.setItem("class_token", res.token);
    state.me = res.student;
    fillMe();
    setStatus(`已登录：${state.me.name}`);
    updateAuthUI();
    await loadData();
    await loadNotifications();
    if (!notificationTimer) {
      notificationTimer = setInterval(() => loadNotifications({ toastIfNew: true }), 30000);
    }
    closeModal();
  } catch (err) {
    setStatus(err.message);
  }
}

function fillMe() {
  if (!state.me) return;
  if (meName) meName.value = state.me.name || "";
  if (meGender) meGender.value = state.me.gender || "";
  if (meAvatar) meAvatar.value = state.me.avatar || "";
  if (meBio) meBio.value = state.me.bio || "";
  if (meContact) meContact.value = state.me.contact || "";
  if (meTags) meTags.value = state.me.tags || "";
}

async function saveMe() {
  if (!state.me) return;
  try {
    const payload = {
      name: meName.value.trim(),
      gender: meGender.value.trim() || null,
      avatar: meAvatar.value.trim() || null,
      bio: meBio.value.trim() || null,
      contact: meContact.value.trim() || null,
      tags: meTags.value.trim() || null,
    };

    const updated = await apiFetch(`/students/${state.me.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    state.me = updated;
    setStatus("资料已更新");
    await loadData();
  } catch (err) {
    setStatus(err.message);
  }
}

async function addRelation() {
  try {
    if (!state.me) throw new Error("请先登录");
    const toStudentId = relationTo.value;
    const type = relationType.value.trim();
    const note = relationNote.value.trim();

    await apiFetch("/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStudentId, type, note }),
    });

    relationType.value = "";
    relationNote.value = "";
    setStatus("已发送关系请求，等待对方同意");
    await loadPendingRelations();
  } catch (err) {
    setStatus(err.message);
  }
}

async function deleteRelation(id) {
  try {
    await apiFetch(`/relationships/${id}`, { method: "DELETE" });
    await loadData();
  } catch (err) {
    setStatus(err.message);
  }
}

async function submitMessage() {
  try {
    if (!state.token) {
      msgHint.textContent = "请先登录后留言";
      return;
    }
    let imageUrl = msgImage.value.trim();
    if (msgImageFile.files && msgImageFile.files[0]) {
      const form = new FormData();
      form.append("file", msgImageFile.files[0]);
      const uploadRes = await fetch(apiUrl("/upload"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
        body: form,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || "图片上传失败");
      }
      const uploadData = await uploadRes.json();
      imageUrl = uploadData.url;
    }
    const payload = {
      nickname: msgNickname.value.trim(),
      subtitle: msgSubtitle.value.trim(),
      content: msgContent.value.trim(),
      imageUrl,
      isAnonymous: msgAnonymous.checked,
    };
    if (!payload.content) {
      msgHint.textContent = "留言内容不能为空";
      return;
    }
    await apiFetch("/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    msgHint.textContent = "已提交，等待管理员审核";
    msgContent.value = "";
    msgImage.value = "";
    msgImageFile.value = "";
  } catch (err) {
    msgHint.textContent = err.message;
  }
}

let autoScrollLock = false;
let lastAutoScroll = 0;

function smoothTo(section) {
  if (!section || autoScrollLock) return;
  const now = Date.now();
  if (now - lastAutoScroll < 500) return;
  autoScrollLock = true;
  lastAutoScroll = now;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    autoScrollLock = false;
  }, 700);
}

function isNearSectionTop(section) {
  if (!section || !pageStack) return false;
  const top = section.offsetTop;
  return Math.abs(pageStack.scrollTop - top) <= 2;
}

function forceHomeView() {
  const target = mainSection;
  if (!target || !pageStack) return;
  const originalBehavior = pageStack.style.scrollBehavior;
  pageStack.style.scrollBehavior = "auto";
  if (location.hash && location.hash !== "#pageMain") {
    history.replaceState(null, "", "#pageMain");
  }
  const top = target.offsetTop;
  pageStack.scrollTop = top;
  requestAnimationFrame(() => {
    pageStack.scrollTop = top;
  });
  setTimeout(() => {
    pageStack.scrollTop = top;
  }, 120);
  setTimeout(() => {
    pageStack.scrollTop = top;
    pageStack.style.scrollBehavior = originalBehavior || "";
    document.body.classList.remove("constellation-lock");
    pageStack.classList.remove("hidden");
  }, 320);
}

let touchStartY = null;

if (pageStack) {
  pageStack.addEventListener(
    "wheel",
    (event) => {
      if (autoScrollLock) return;
      const delta = event.deltaY;
      if (isNearSectionTop(mainSection) && delta < -12) {
        event.preventDefault();
        smoothTo(starSection);
        return;
      }
      if (isNearSectionTop(starSection) && delta > 12) {
        event.preventDefault();
        smoothTo(mainSection);
      }
    },
    { passive: false }
  );

  pageStack.addEventListener(
    "touchstart",
    (event) => {
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  pageStack.addEventListener(
    "touchmove",
    (event) => {
      if (autoScrollLock || touchStartY === null) return;
      if (!event.cancelable) return;
      const delta = event.touches[0].clientY - touchStartY;
      if (isNearSectionTop(mainSection) && delta < -35) {
        event.preventDefault();
        smoothTo(starSection);
        return;
      }
      if (isNearSectionTop(starSection) && delta > 35) {
        event.preventDefault();
        smoothTo(mainSection);
      }
    },
    { passive: false }
  );

  pageStack.addEventListener(
    "touchend",
    () => {
      touchStartY = null;
    },
    { passive: true }
  );
}

if (canvas) canvas.addEventListener("mousemove", (event) => {
  if (state.dragActive) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const worldX = (x - state.viewOffset.x - state.dragOffset.x) / state.viewScale;
  const worldY = (y - state.viewOffset.y - state.dragOffset.y) / state.viewScale;

  let hovered = null;
  let closestDist = Infinity;
  for (const student of state.students) {
    const pos = state.positions.get(student.id);
    if (!pos) continue;
    const dx = worldX - pos.x;
    const dy = worldY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      hovered = student;
    }
  }

  const snapRadius = 18 / state.viewScale;
  if (hovered && closestDist <= snapRadius) {
    state.hoveredId = hovered.id;
    showHoverCard(hovered, x, y);
  } else {
    state.hoveredId = null;
    hideHoverCard();
  }
});

if (canvas) canvas.addEventListener("mouseleave", () => {
  state.hoveredId = null;
  hideHoverCard();
});

  if (canvas) {
  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldX = (x - state.viewOffset.x - state.dragOffset.x) / state.viewScale;
    const worldY = (y - state.viewOffset.y - state.dragOffset.y) / state.viewScale;
    let hit = false;
    for (const student of state.students) {
      const pos = state.positions.get(student.id);
      if (!pos) continue;
      const dx = worldX - pos.x;
      const dy = worldY - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 10 / state.viewScale) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      state.dragActive = true;
      state.dragStart = { x: event.clientX, y: event.clientY, moved: false };
      state.dragBaseline = { x: state.dragOffset.x, y: state.dragOffset.y };
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragActive || !state.dragStart || !state.dragBaseline) return;
    const dx = event.clientX - state.dragStart.x;
    const dy = event.clientY - state.dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 6) state.dragStart.moved = true;
    state.dragOffset.x = state.dragBaseline.x + dx;
    state.dragOffset.y = state.dragBaseline.y + dy;
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!state.dragActive) return;
    state.dragActive = false;
    canvas.releasePointerCapture(event.pointerId);
    state.dragStart = null;
    state.dragBaseline = null;
  });

  canvas.addEventListener("pointercancel", () => {
    state.dragActive = false;
    state.dragStart = null;
    state.dragBaseline = null;
  });
}

if (canvas) canvas.addEventListener("click", (event) => {
  if (state.dragStart && state.dragStart.moved) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const worldX = (x - state.viewOffset.x - state.dragOffset.x) / state.viewScale;
  const worldY = (y - state.viewOffset.y - state.dragOffset.y) / state.viewScale;
  let picked = null;
  let minDist = 999;
  for (const student of state.students) {
    const pos = state.positions.get(student.id);
    if (!pos) continue;
    const dx = worldX - pos.x;
    const dy = worldY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10 / state.viewScale && dist < minDist) {
      picked = student;
      minDist = dist;
    }
  }
  state.selectedId = picked ? picked.id : null;
  renderStarPanel(state.selectedId);
  if (state.selectedId) {
    const pos = state.positions.get(state.selectedId);
    if (pos) {
      const screenPos = getScreenPosition(pos);
      positionStarPanel(screenPos.x, screenPos.y);
    }
  }
});

if (starPanelClose) {
  starPanelClose.addEventListener("click", () => {
    state.selectedId = null;
    renderStarPanel(null);
    drawScene();
  });
}

if (registerBtn) registerBtn.addEventListener("click", register);
if (loginBtn) loginBtn.addEventListener("click", () => loginWithToken(loginToken.value.trim()));
if (saveMeBtn) saveMeBtn.addEventListener("click", saveMe);
if (addRelationBtn) addRelationBtn.addEventListener("click", addRelation);
if (msgSubmit) msgSubmit.addEventListener("click", submitMessage);

if (toggleMessages && messagePanel) {
  toggleMessages.addEventListener("click", () => {
    const isCollapsed = messagePanel.classList.contains("collapsed");
    messagePanel.classList.toggle("collapsed", !isCollapsed);
    messagePanel.classList.toggle("expanded", isCollapsed);
    toggleMessages.textContent = isCollapsed ? "收起留言区" : "展开留言区";
  });
}

if (toggleStudents && studentPanel) {
  toggleStudents.addEventListener("click", () => {
    const isCollapsed = studentPanel.classList.contains("collapsed");
    studentPanel.classList.toggle("collapsed", !isCollapsed);
    studentPanel.classList.toggle("expanded", isCollapsed);
    toggleStudents.textContent = isCollapsed ? "收起学生列表" : "展开学生列表";
  });
}

function bindToggle(btn, panel, expandedText, collapsedText) {
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    const isCollapsed = panel.classList.contains("collapsed");
    panel.classList.toggle("collapsed", !isCollapsed);
    panel.classList.toggle("expanded", isCollapsed);
    btn.textContent = isCollapsed ? expandedText : collapsedText;
  });
}

bindToggle(togglePosts, postsPanel, "收起班级动态", "展开班级动态");
bindToggle(toggleEvents, eventsPanel, "收起活动回顾", "展开活动回顾");
bindToggle(toggleTimeline, timelinePanel, "收起时间轴", "展开时间轴");
bindToggle(toggleAlbums, albumsPanel, "收起相册墙", "展开相册墙");

if (openAuth) openAuth.addEventListener("click", openModal);
if (closeAuth) closeAuth.addEventListener("click", closeModal);
if (logoutBtn) logoutBtn.addEventListener("click", () => {
  state.token = "";
  state.me = null;
  localStorage.removeItem("class_token");
  updateAuthUI();
  closeDrawer();
});
if (openNotifications) openNotifications.addEventListener("click", () => {
  if (!state.token) {
    showToast("提示", "请先登录后查看消息");
    return;
  }
  openNotificationModal();
  loadNotifications();
});
if (closeNotifications) closeNotifications.addEventListener("click", closeNotificationModal);
if (openProfile) openProfile.addEventListener("click", openDrawer);
if (closeProfile) closeProfile.addEventListener("click", closeDrawer);
if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
if (lightboxPrev) lightboxPrev.addEventListener("click", () => {
  if (!albumItems.length) return;
  albumIndex = (albumIndex - 1 + albumItems.length) % albumItems.length;
  showLightbox();
});
if (lightboxNext) lightboxNext.addEventListener("click", () => {
  if (!albumItems.length) return;
  albumIndex = (albumIndex + 1) % albumItems.length;
  showLightbox();
});

window.addEventListener("resize", () => {
  updateHeaderHeight();
  resizeCanvas();
  updateNavIndicators();
});

if (scrollHome) {
  scrollHome.addEventListener("click", () => {
    document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
  });
}

if (scrollEvents) {
  scrollEvents.addEventListener("click", () => {
    window.location.href = "/2017-class/class/";
  });
}

if (scrollProfile) {
  scrollProfile.addEventListener("click", () => {
    window.location.href = "/2017-class/students/";
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (!target || !pageStack) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
  });
});

document.querySelectorAll(".nav a, .bottom-nav a").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#")) return;
    // Let the browser handle navigation (view-transition meta will animate cross-page)
    event.preventDefault();
    const navOrder = getNavOrder();
    const current = normalizePath(window.location.pathname);
    const target = normalizePath(new URL(href, window.location.origin).pathname);
    const currentIndex = navOrder.indexOf(current);
    const targetIndex = navOrder.indexOf(target);
    const dir = currentIndex !== -1 && targetIndex !== -1 && targetIndex < currentIndex ? "left" : "right";
    sessionStorage.setItem("navDirection", dir);
    document.documentElement.classList.add(`nav-leave-${dir}`);
    setTimeout(() => {
      window.location.href = href;
    }, 320);
  });
  link.addEventListener("mouseenter", () => prefetchUrl(link.getAttribute("href")));
  link.addEventListener("focus", () => prefetchUrl(link.getAttribute("href")));
});

function prefetchUrl(href) {
  if (!href || href.startsWith("#")) return;
  if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  link.as = "document";
  document.head.appendChild(link);
}

function prefetchNavNeighbors() {
  const links = Array.from(document.querySelectorAll(".nav a"));
  if (!links.length) return;
  const current = normalizePath(window.location.pathname);
  const index = links.findIndex((link) => normalizePath(new URL(link.href, window.location.origin).pathname) === current);
  if (index === -1) return;
  const prev = links[index - 1];
  const next = links[index + 1];
  if (prev) prefetchUrl(prev.getAttribute("href"));
  if (next) prefetchUrl(next.getAttribute("href"));
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    closeDrawer();
    closeLightbox();
    closeNotificationModal();
  }
});

document.addEventListener("mousedown", (event) => {
  if (!sidebarDrawer || !sidebarDrawer.classList.contains("open")) return;
  const target = event.target;
  if (sidebarDrawer.contains(target)) return;
  if (openProfile && openProfile.contains(target)) return;
  closeDrawer();
});

async function init() {
  showWarningIfNeeded();
  applyEnterTransition();
  updateHeaderHeight();
  updateNavIndicators();
  resizeCanvas();
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  idle(prefetchNavNeighbors);
  if (homeSection && pageStack) {
    forceHomeView();
  } else if (pageStack) {
    document.body.classList.remove("constellation-lock");
    pageStack.classList.remove("hidden");
  }
  setStatus("加载中...");
  let attempts = 0;
  let ready = false;
  while (!ready && attempts < 6) {
    attempts += 1;
    showServerGate(`正在连接后端…第 ${attempts} 次`);
    try {
      await loadContent();
      await loadData();
      await loadMessages();
      ready = true;
    } catch (err) {
      showServerGate("服务器正在启动，请稍等...");
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  hideServerGate();
  if (state.token) {
    loginToken.value = state.token;
    await loginWithToken(state.token);
  } else {
    setStatus("请登录后编辑自己的星光资料");
  }
  updateAuthUI();
  if (state.token && !notificationTimer) {
    await loadNotifications();
    notificationTimer = setInterval(() => loadNotifications({ toastIfNew: true }), 30000);
  }
  document.body.classList.add("ready");
}

init();
animate();

window.addEventListener("load", () => {
  if (!pageStack || !mainSection) return;
  if (!isNearSectionTop(mainSection)) {
    forceHomeView();
  }
  updateNavIndicators();
  setTimeout(updateNavIndicators, 120);
});

// Reveal animations
const revealTargets = document.querySelectorAll(
  ".card, .hero-content, .hero-card, .post-card, .album-item, .message-card"
);
revealTargets.forEach((el) => el.classList.add("reveal"));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.12 }
);

revealTargets.forEach((el) => observer.observe(el));

