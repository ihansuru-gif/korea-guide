const fileInput = document.querySelector("#fileInput");
const openFileButton = document.querySelector("#openFileButton");
const saveButton = document.querySelector("#saveButton");
const themeToggle = document.querySelector("#themeToggle");
const openMessage = document.querySelector("#openMessage");
const emptyState = document.querySelector("#emptyState");
const readerPanel = document.querySelector("#readerPanel");
const dropZone = document.querySelector("#dropZone");
const fileName = document.querySelector("#fileName");
const saveStatus = document.querySelector("#saveStatus");
const fileList = document.querySelector("#fileList");
const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const allPreview = document.querySelector("#allPreview");
const contentArea = document.querySelector("#contentArea");
const searchInput = document.querySelector("#searchInput");
const fontSize = document.querySelector("#fontSize");
const previewTab = document.querySelector("#previewTab");
const editTab = document.querySelector("#editTab");
const splitTab = document.querySelector("#splitTab");
const allTab = document.querySelector("#allTab");

const state = {
  files: [],
  currentIndex: -1,
  mode: localStorage.getItem("md-reader-mode") || "preview",
  search: "",
  dirty: false,
};

const draftKey = "md-pocket-reader-draft";
const themeKey = "md-pocket-reader-theme";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}

function renderMarkdown(source, term = "") {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  let inCode = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  flushParagraph();
  flushList();

  let html = blocks.join("\n") || "<p>This document is empty.</p>";
  if (term.trim()) {
    const safe = escapeHtml(term.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
  }
  return html;
}

function currentFile() {
  return state.files[state.currentIndex];
}

function setStatus(text) {
  saveStatus.textContent = text;
}

function setOpenMessage(text) {
  if (openMessage) openMessage.textContent = text;
}

function updatePreview() {
  preview.innerHTML = renderMarkdown(editor.value, state.search);
  updateAllPreview();
  localStorage.setItem(draftKey, JSON.stringify({
    name: currentFile()?.name || "draft.md",
    content: editor.value,
    savedAt: new Date().toISOString(),
  }));
}

function updateAllPreview() {
  if (!state.files.length) {
    allPreview.innerHTML = "<p>No files opened.</p>";
    return;
  }

  allPreview.innerHTML = state.files.map((item, index) => `
    <section class="all-file" id="file-${index}">
      <h1 class="all-file-title">${escapeHtml(item.name)}</h1>
      ${renderMarkdown(item.content, state.search)}
    </section>
  `).join("");
}

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem("md-reader-mode", mode);
  contentArea.className = `content-area ${mode}-mode`;
  previewTab.classList.toggle("active", mode === "preview");
  editTab.classList.toggle("active", mode === "edit");
  splitTab.classList.toggle("active", mode === "split");
  allTab.classList.toggle("active", mode === "all");
  if (mode !== "edit") updatePreview();
}

function showReader() {
  emptyState.hidden = true;
  readerPanel.hidden = false;
}

function renderFileList() {
  fileList.innerHTML = "";
  fileList.hidden = state.files.length < 2;

  state.files.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `file-chip-wrap${index === state.currentIndex ? " active" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "file-chip";
    button.textContent = item.name;
    button.addEventListener("click", () => {
      if (state.mode === "all") {
        document.querySelector(`#file-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        selectFile(index);
      }
    });

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "order-button";
    upButton.textContent = "Up";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveFile(index, -1));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "order-button";
    downButton.textContent = "Down";
    downButton.disabled = index === state.files.length - 1;
    downButton.addEventListener("click", () => moveFile(index, 1));

    wrapper.append(button, upButton, downButton);
    fileList.appendChild(wrapper);
  });
}

function moveFile(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.files.length) return;

  const [item] = state.files.splice(index, 1);
  state.files.splice(nextIndex, 0, item);

  if (state.currentIndex === index) {
    state.currentIndex = nextIndex;
  } else if (state.currentIndex === nextIndex) {
    state.currentIndex = index;
  }

  renderFileList();
  updateAllPreview();
  setStatus("Order changed");
}

function selectFile(index) {
  state.currentIndex = index;
  const item = currentFile();
  editor.value = item.content;
  fileName.textContent = item.name;
  state.dirty = false;
  setStatus("Opened");
  renderFileList();
  updatePreview();
  showReader();
}

function isReadableTextFile(file) {
  return /\.(md|markdown|mdown|mkd|txt)$/i.test(file.name) || file.type.startsWith("text/");
}

async function loadFiles(fileLikeList) {
  const pickedFiles = Array.from(fileLikeList || []);
  const files = pickedFiles.filter(isReadableTextFile);
  if (!pickedFiles.length) {
    setOpenMessage("No file selected.");
    return;
  }
  if (!files.length) {
    setOpenMessage("No readable .md / .txt file found.");
    return;
  }

  const loaded = [];
  for (const file of files) {
    try {
      loaded.push({
        name: file.name,
        content: await readFileAsText(file),
        handle: file.handle || null,
        type: file.type || "text/plain",
      });
    } catch {
      setOpenMessage(`Could not read ${file.name}.`);
    }
  }

  if (!loaded.length) {
    setOpenMessage("Files were selected, but none could be read.");
    return;
  }

  state.files = loaded;
  setOpenMessage(`Opened ${loaded.length} file${loaded.length === 1 ? "" : "s"}.`);
  selectFile(0);
}

async function openFiles() {
  fileInput.value = "";
  fileInput.click();
}

function readFileAsText(file) {
  if (file.text) return file.text();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function downloadFile(name, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "document.md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveFile() {
  const item = currentFile();
  if (!item) return;

  item.content = editor.value;

  if (item.handle?.createWritable) {
    const writable = await item.handle.createWritable();
    await writable.write(editor.value);
    await writable.close();
    state.dirty = false;
    setStatus("Saved to original");
    return;
  }

  downloadFile(item.name, editor.value);
  state.dirty = false;
  setStatus("Downloaded copy");
}

function restoreDraft() {
  const raw = localStorage.getItem(draftKey);
  if (!raw || state.files.length) return;

  try {
    const draft = JSON.parse(raw);
    state.files = [{
      name: draft.name || "draft.md",
      content: draft.content || "",
      handle: null,
      type: "text/markdown",
    }];
    selectFile(0);
    setStatus("Restored draft");
  } catch {
    localStorage.removeItem(draftKey);
  }
}

function applyTheme() {
  const theme = localStorage.getItem(themeKey) || "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
}

fileInput.addEventListener("change", (event) => loadFiles(event.target.files));
openFileButton.addEventListener("click", openFiles);
saveButton.addEventListener("click", saveFile);

editor.addEventListener("input", () => {
  const item = currentFile();
  if (item) item.content = editor.value;
  state.dirty = true;
  setStatus("Editing");
  updatePreview();
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  updatePreview();
});

fontSize.addEventListener("input", (event) => {
  document.documentElement.style.setProperty("--font-size", `${event.target.value}px`);
});

  previewTab.addEventListener("click", () => setMode("preview"));
editTab.addEventListener("click", () => setMode("edit"));
splitTab.addEventListener("click", () => setMode("split"));
allTab.addEventListener("click", () => setMode("all"));

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(themeKey, next);
  applyTheme();
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  loadFiles(event.dataTransfer.files);
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

applyTheme();
setMode(state.mode);
restoreDraft();
