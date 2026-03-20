const CONFIG = {
  API_BASE_URL: "https://two017-class.onrender.com",
};

const state = {
  students: [],
  relationships: [],
  positions: new Map(),
  velocities: new Map(),
  backgroundStars: [],
  hoveredId: null,
  token: localStorage.getItem("class_token") || "",
  me: null,
  lastFrame: performance.now(),
};

const canvas = document.getElementById("starCanvas");
const ctx = canvas?.getContext("2d");
const hoverCard = document.getElementById("hoverCard");
const statusEl = document.getElementById("status");
const httpsWarning = document.getElementById("httpsWarning");
const pageStack = document.getElementById("pageStack");
const homeSection = document.getElementById("home");
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

function openDrawer() {
  sidebarDrawer.classList.add("open");
  sidebarDrawer.setAttribute("aria-hidden", "false");
  closeProfile.classList.add("open");
}

function closeDrawer() {
  sidebarDrawer.classList.remove("open");
  sidebarDrawer.setAttribute("aria-hidden", "true");
  closeProfile.classList.remove("open");
}

function updateHeaderHeight() {
  const header = document.querySelector(".topbar");
  const height = header ? header.offsetHeight : 72;
  document.documentElement.style.setProperty("--header-h", `${height}px`);
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  buildBackgroundStars();
  drawScene();
}

function buildBackgroundStars() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  state.backgroundStars = Array.from({ length: 240 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.6 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
  }));
}

function initPositions() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.38;
  const goldenAngle = 2.399963229728653;

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
    if (!state.students.find((s) => s.id === id)) {
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

  for (let i = 0; i < ids.length; i += 1) {
    const idA = ids[i];
    const posA = state.positions.get(idA);
    const velA = state.velocities.get(idA);
    if (!posA || !velA) continue;

    let fx = (center.x - posA.x) * attraction;
    let fy = (center.y - posA.y) * attraction;

    for (let j = 0; j < ids.length; j += 1) {
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

    state.relationships.forEach((rel) => {
      if (rel.from_student_id !== idA) return;
      const posB = state.positions.get(rel.to_student_id);
      if (!posB) return;
      fx += (posB.x - posA.x) * 0.008;
      fy += (posB.y - posA.y) * 0.008;
    });

    velA.x = (velA.x + fx * dt) * 0.88;
    velA.y = (velA.y + fy * dt) * 0.88;

    posA.x += velA.x * dt * 60;
    posA.y += velA.y * dt * 60;

    posA.x = Math.max(edgePadding, Math.min(width - edgePadding, posA.x));
    posA.y = Math.max(edgePadding, Math.min(height - edgePadding, posA.y));
  }
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  initPositions();
  const t = performance.now() / 1000;

  state.backgroundStars.forEach((star) => {
    const twinkle = 0.4 + 0.6 * Math.sin(t * 1.2 + star.phase);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 220, 255, ${0.12 + twinkle * 0.2})`;
    ctx.fill();
  });

  ctx.save();
  ctx.lineWidth = 1.2;
  state.relationships.forEach((rel, index) => {
    const from = state.positions.get(rel.from_student_id);
    const to = state.positions.get(rel.to_student_id);
    if (!from || !to) return;
    const pulse = 0.3 + 0.7 * Math.sin(t * 1.2 + index);
    ctx.strokeStyle = `rgba(141, 211, 255, ${0.15 + pulse * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });
  ctx.restore();

  state.students.forEach((student) => {
    const pos = state.positions.get(student.id);
    if (!pos) return;
    const flicker = 0.6 + 0.4 * Math.sin(t * 2.2 + student.id.length);
    const radius = state.hoveredId === student.id ? 6 : 3 + flicker * 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = state.hoveredId === student.id ? "#fef9d7" : "rgba(254, 249, 215, 0.85)";
    ctx.shadowColor = "rgba(242, 167, 255, 0.8)";
    ctx.shadowBlur = state.hoveredId === student.id ? 12 : 4 + flicker * 6;
    ctx.fill();
  });
}

function animate() {
  if (!canvas || !ctx) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  applyForces(dt);
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

function refreshStudentList() {
  studentList.innerHTML = "";
  state.students.forEach((student) => {
    const card = document.createElement("div");
    card.className = "student-card";
    card.innerHTML = `
      <strong>${student.name}</strong>
      <div>${student.tags || ""}</div>
    `;
    studentList.appendChild(card);
  });

  relationTo.innerHTML = "";
  state.students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = `${student.name} (${student.id})`;
    relationTo.appendChild(option);
  });
}

function refreshRelations() {
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
    featuredTitle.textContent = data.featured.title || "";
    featuredDate.textContent = data.featured.date || "";
    featuredDesc.textContent = data.featured.desc || "";
  }

  eventsList.innerHTML = "";
  (data.events || []).forEach((event) => {
    const li = document.createElement("li");
    li.textContent = event;
    eventsList.appendChild(li);
  });

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
    refreshStudentList();
    refreshRelations();
    drawScene();
    await loadPendingRelations();
  } catch (err) {
    setStatus(err.message);
  }
}

async function loadMessages() {
  try {
    const data = await apiFetch("/messages");
    messageList.innerHTML = "";
    data.forEach((msg) => {
      const card = document.createElement("div");
      card.className = "message-card";
      const author = msg.is_anonymous ? "匿名同学" : (msg.nickname || msg.student_id);
      card.innerHTML = `
        <strong>${author}</strong>
        <div class="message-meta">${msg.subtitle || ""} ${msg.created_at ? "· " + msg.created_at.split("T")[0] : ""}</div>
        <p>${msg.content}</p>
        ${msg.image_url ? `<img src="${msg.image_url}" alt="message" />` : ""}
      `;
      messageList.appendChild(card);
    });
  } catch (err) {
    msgHint.textContent = err.message.includes("Missing token")
      ? "请先登录后查看留言"
      : err.message;
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
    await loadData();
    closeModal();
  } catch (err) {
    setStatus(err.message);
  }
}

function fillMe() {
  if (!state.me) return;
  meName.value = state.me.name || "";
  meGender.value = state.me.gender || "";
  meAvatar.value = state.me.avatar || "";
  meBio.value = state.me.bio || "";
  meContact.value = state.me.contact || "";
  meTags.value = state.me.tags || "";
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
  if (!homeSection || !pageStack) return;
  const originalBehavior = pageStack.style.scrollBehavior;
  pageStack.style.scrollBehavior = "auto";
  if (location.hash && location.hash !== "#home") {
    history.replaceState(null, "", "#home");
  }
  const top = homeSection.offsetTop;
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

pageStack.addEventListener(
  "wheel",
  (event) => {
    if (autoScrollLock) return;
    const delta = event.deltaY;
    if (isNearSectionTop(homeSection) && delta < -12) {
      event.preventDefault();
      smoothTo(starSection);
      return;
    }
    if (isNearSectionTop(starSection) && delta > 12) {
      event.preventDefault();
      smoothTo(homeSection);
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
    const delta = event.touches[0].clientY - touchStartY;
    if (isNearSectionTop(homeSection) && delta < -35) {
      event.preventDefault();
      smoothTo(starSection);
      return;
    }
    if (isNearSectionTop(starSection) && delta > 35) {
      event.preventDefault();
      smoothTo(homeSection);
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

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  let hovered = null;
  for (const student of state.students) {
    const pos = state.positions.get(student.id);
    if (!pos) continue;
    const dx = x - pos.x;
    const dy = y - pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < 8) {
      hovered = student;
      break;
    }
  }

  if (hovered) {
    state.hoveredId = hovered.id;
    showHoverCard(hovered, x, y);
  } else {
    state.hoveredId = null;
    hideHoverCard();
  }
  drawScene();
});

canvas.addEventListener("mouseleave", () => {
  state.hoveredId = null;
  hideHoverCard();
  drawScene();
});

registerBtn.addEventListener("click", register);
loginBtn.addEventListener("click", () => loginWithToken(loginToken.value.trim()));
saveMeBtn.addEventListener("click", saveMe);
addRelationBtn.addEventListener("click", addRelation);
msgSubmit.addEventListener("click", submitMessage);

if (toggleMessages && messagePanel) {
  toggleMessages.addEventListener("click", () => {
    const isCollapsed = messagePanel.classList.contains("collapsed");
    messagePanel.classList.toggle("collapsed", !isCollapsed);
    messagePanel.classList.toggle("expanded", isCollapsed);
    toggleMessages.textContent = isCollapsed ? "收起留言区" : "展开留言区";
  });
}

openAuth.addEventListener("click", openModal);
closeAuth.addEventListener("click", closeModal);
openProfile.addEventListener("click", openDrawer);
closeProfile.addEventListener("click", closeDrawer);
lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", () => {
  if (!albumItems.length) return;
  albumIndex = (albumIndex - 1 + albumItems.length) % albumItems.length;
  showLightbox();
});
lightboxNext.addEventListener("click", () => {
  if (!albumItems.length) return;
  albumIndex = (albumIndex + 1) % albumItems.length;
  showLightbox();
});

window.addEventListener("resize", () => {
  updateHeaderHeight();
  resizeCanvas();
});

if (scrollHome) {
  scrollHome.addEventListener("click", () => {
    document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
  });
}

if (scrollEvents) {
  scrollEvents.addEventListener("click", () => {
    document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
  });
}

if (scrollProfile) {
  scrollProfile.addEventListener("click", () => {
    document.getElementById("meSection")?.scrollIntoView({ behavior: "smooth" });
    openDrawer();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    closeDrawer();
    closeLightbox();
  }
});

async function init() {
  showWarningIfNeeded();
  updateHeaderHeight();
  resizeCanvas();
  forceHomeView();
  setStatus("加载中...");
  await loadContent();
  await loadData();
  await loadMessages();
  if (state.token) {
    loginToken.value = state.token;
    await loginWithToken(state.token);
  } else {
    setStatus("请登录后编辑自己的星光资料");
  }
}

init();
animate();

window.addEventListener("load", () => {
  if (!pageStack || !homeSection) return;
  if (!isNearSectionTop(homeSection)) {
    forceHomeView();
  }
});

