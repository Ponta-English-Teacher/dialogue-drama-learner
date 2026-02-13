const $ = (sel) => document.querySelector(sel);

const listView = $("#listView");
const playerView = $("#playerView");
const backBtn = $("#backBtn");
const crumb = $("#crumb");

const sceneImg = $("#sceneImg");
const linesWrap = $("#lines");
const audioEl = $("#audio");

const playAllBtn = $("#playAllBtn");
const prevLineBtn = $("#prevLineBtn");
const nextLineBtn = $("#nextLineBtn");

const glossaryDialog = $("#glossaryDialog");
const glossaryBody = $("#glossaryBody");
const glossaryBtn = $("#glossaryBtn");
const closeGlossaryBtn = $("#closeGlossaryBtn");

const helpDialog = $("#helpDialog");
const helpBtn = $("#helpBtn");
const closeHelpBtn = $("#closeHelpBtn");

/* NEW: Support modal elements */
const supportBtn = $("#supportBtn");
const supportDialog = $("#supportDialog");
const closeSupportBtn = $("#closeSupportBtn");
const supportSpeaker = $("#supportSpeaker");
const supportText = $("#supportText");
const supportEasyEn = $("#supportEasyEn");
const supportJp = $("#supportJp");
const supportNote = $("#supportNote");

let DATA = null;
let currentSeries = null;
let currentEpisode = null;
let currentLineIndex = -1;   // NEW: start with no selection
let isPlayingAll = false;

async function loadData() {
  const res = await fetch("./data/stories.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load stories.json");
  DATA = await res.json();
}

function setCrumb(text) {
  crumb.textContent = text;
}

function showList() {
  playerView.hidden = true;
  listView.hidden = false;
  backBtn.hidden = true;
  setCrumb("Choose a Series");
  renderSeriesList();
}

function showEpisodes(seriesId) {
  currentSeries = DATA.series.find(s => s.id === seriesId);
  currentEpisode = null;

  listView.hidden = false;
  playerView.hidden = true;
  backBtn.hidden = false;

  setCrumb(`Series: ${currentSeries.title}`);
  renderEpisodeList(currentSeries);
}

function showPlayer(seriesId, episodeId) {
  currentSeries = DATA.series.find(s => s.id === seriesId);
  currentEpisode = currentSeries.episodes.find(e => e.id === episodeId);

  listView.hidden = true;
  playerView.hidden = false;
  backBtn.hidden = false;

  setCrumb(`${currentSeries.title} · ${currentEpisode.title}`);

  stopAll();
  isPlayingAll = false;
  currentLineIndex = -1;
  supportBtn.disabled = true;

  sceneImg.src = `./${currentEpisode.sceneImage}`;

  renderLines(currentEpisode.lines);
  renderGlossary(currentEpisode.glossary || []);
}

function stopAll() {
  audioEl.pause();
  audioEl.currentTime = 0;
  isPlayingAll = false;
  highlightLine(-1);
}

function renderSeriesList() {
  const series = DATA.series || [];
  listView.innerHTML = `
    <div class="grid">
      ${series.map(s => seriesCardHtml(s)).join("")}
    </div>
  `;

  series.forEach(s => {
    document.getElementById(`series-${s.id}`)
      .addEventListener("click", () => showEpisodes(s.id));
  });
}

function renderEpisodeList(series) {
  listView.innerHTML = `
    <div class="grid">
      ${series.episodes.map(e => episodeCardHtml(series, e)).join("")}
    </div>
  `;

  series.episodes.forEach(e => {
    document.getElementById(`ep-${series.id}-${e.id}`)
      .addEventListener("click", () => showPlayer(series.id, e.id));
  });
}

function seriesCardHtml(s) {
  return `
    <div class="card" id="series-${s.id}">
      <img class="thumb" src="./${s.coverImage}" alt="cover" onerror="this.style.display='none'" />
      <div class="cardMeta">
        <div class="cardTitle">${escapeHtml(s.title)}</div>
        <p class="cardSub">${escapeHtml(s.description || "")}</p>
        <div class="badges">
          <span class="badge">${escapeHtml(s.tag || "Series")}</span>
          <span class="badge">${escapeHtml(s.level || "")}</span>
          <span class="badge">${(s.episodes?.length || 0)} episode(s)</span>
        </div>
      </div>
    </div>
  `;
}

function episodeCardHtml(series, e) {
  return `
    <div class="card" id="ep-${series.id}-${e.id}">
      <img class="thumb" src="./${e.sceneImage}" alt="scene" onerror="this.style.display='none'" />
      <div class="cardMeta">
        <div class="cardTitle">${escapeHtml(e.title)}</div>
        <p class="cardSub">${escapeHtml(e.level || "")}</p>
        <div class="badges">
          <span class="badge">${escapeHtml(series.tag || "Series")}</span>
          <span class="badge">${(e.lines?.length || 0)} lines</span>
        </div>
      </div>
    </div>
  `;
}

function renderLines(lines) {
  linesWrap.innerHTML = lines.map((ln, idx) => `
    <button class="lineBtn" id="line-${idx}">
      <span class="speaker">${escapeHtml(ln.speaker)}:</span>
      <span>${escapeHtml(ln.text)}</span>
    </button>
  `).join("");

  lines.forEach((ln, idx) => {
    document.getElementById(`line-${idx}`).addEventListener("click", () => playLine(idx));
  });
}

function highlightLine(idx) {
  const buttons = [...document.querySelectorAll(".lineBtn")];
  buttons.forEach((b, i) => b.classList.toggle("active", i === idx));
}

function playLine(idx) {
  const lines = currentEpisode.lines;
  if (!lines?.length) return;

  currentLineIndex = idx;
  isPlayingAll = false;

  audioEl.src = `./${lines[idx].audio}`;
  highlightLine(idx);

  // NEW: enable support after a line is selected
  supportBtn.disabled = false;

  audioEl.play().catch(() => {});
}

function playAllFrom(startIdx = 0) {
  const lines = currentEpisode.lines;
  if (!lines?.length) return;

  isPlayingAll = true;
  currentLineIndex = Math.max(0, startIdx);

  // NEW: enable support since a line will be active
  supportBtn.disabled = false;

  playCurrentInAllMode();
}

function playCurrentInAllMode() {
  const lines = currentEpisode.lines;
  const ln = lines[currentLineIndex];
  if (!ln) {
    isPlayingAll = false;
    highlightLine(-1);
    return;
  }
  audioEl.src = `./${ln.audio}`;
  highlightLine(currentLineIndex);
  audioEl.play().catch(() => {});
}

audioEl.addEventListener("ended", () => {
  if (!isPlayingAll) return;
  currentLineIndex += 1;
  playCurrentInAllMode();
});

prevLineBtn.addEventListener("click", () => {
  if (!currentEpisode) return;
  if (currentLineIndex < 0) currentLineIndex = 0;
  currentLineIndex = Math.max(0, currentLineIndex - 1);
  playLine(currentLineIndex);
});

nextLineBtn.addEventListener("click", () => {
  if (!currentEpisode) return;
  if (currentLineIndex < 0) currentLineIndex = 0;
  currentLineIndex = Math.min(currentEpisode.lines.length - 1, currentLineIndex + 1);
  playLine(currentLineIndex);
});

playAllBtn.addEventListener("click", () => {
  if (!currentEpisode) return;
  playAllFrom(0);
});

backBtn.addEventListener("click", () => {
  stopAll();

  try { if (supportDialog?.open) supportDialog.close(); } catch {}
  try { if (glossaryDialog?.open) glossaryDialog.close(); } catch {}
  try { if (helpDialog?.open) helpDialog.close(); } catch {}

  if (!playerView.hidden && currentSeries) {
    showEpisodes(currentSeries.id);
  } else {
    showList();
  }
});

function renderGlossary(items) {
  if (!items.length) {
    glossaryBody.innerHTML = `<p class="muted">No glossary entries for this episode.</p>`;
    return;
  }
  glossaryBody.innerHTML = items.map(it => `
    <div class="glossItem">
      <div class="glossWord">${escapeHtml(it.word)}</div>
      <div class="glossDef">${escapeHtml(it.meaning_en || "")}</div>
      <div class="glossJp">${escapeHtml(it.meaning_jp || "")}</div>
    </div>
  `).join("");
}

/* NEW: Support modal logic */
supportBtn.addEventListener("click", () => {
  if (!currentEpisode || currentLineIndex < 0) return;
  openSupportForLine(currentLineIndex);
});

closeSupportBtn.addEventListener("click", () => supportDialog.close());

function openSupportForLine(idx) {
  const ln = currentEpisode.lines[idx];
  if (!ln) return;

  supportSpeaker.textContent = `${ln.speaker}`;
  supportText.textContent = ln.text;

  supportEasyEn.textContent = ln.easy_en ? ln.easy_en : "—";
  supportJp.textContent = ln.jp ? ln.jp : "—";
  supportNote.textContent = ln.note ? ln.note : "—";

  supportDialog.showModal();
}

glossaryBtn.addEventListener("click", () => glossaryDialog.showModal());
closeGlossaryBtn.addEventListener("click", () => glossaryDialog.close());

helpBtn.addEventListener("click", () => helpDialog.showModal());
closeHelpBtn.addEventListener("click", () => helpDialog.close());

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

(async function init() {
  await loadData();
  showList();
})().catch(err => {
  listView.innerHTML = `<p class="muted">Error: ${escapeHtml(err.message)}</p>`;
});