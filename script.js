/* =====================================================
   PIXELCODER - SCRIPT PRINCIPAL
   Organização completa
   ===================================================== */

/* =====================================================
   VARIÁVEIS GLOBAIS
   ===================================================== */
let editor,
  currentDecorations = [];
let linguagemAtual = "html";
let temaAtual = "dark";
let janelaAlvo = null;
let windowCount = 0;

/* =====================================================
   ELEMENTOS DOM PRINCIPAIS
   ===================================================== */
const elementos = {
  searchInput: document.getElementById("searchInput"),
  resetBtn: document.getElementById("reset-btn"),
  toast: document.getElementById("confirm-toast"),
  yesBtn: document.getElementById("confirm-yes"),
  noBtn: document.getElementById("confirm-no"),
  newWindowBtn: document.getElementById("newWindowBtn"),
  container: document.getElementById("windowsContainer"),
  taskbar: document.getElementById("taskbar"),
  taskbarTab: document.getElementById("taskbar-tab"),
  taskbarClose: document.getElementById("taskbar-close"),
  mainContent: document.getElementById("main-content"),
  modal: document.getElementById("modal"),
  openBtn: document.getElementById("openModalBtn"),
  closeBtn: document.getElementById("closeModalBtn"),
  modalRenomear: document.getElementById("modalRenomear"),
  inputNovoNome: document.getElementById("inputNovoNome"),
};

/* =====================================================
   INICIALIZAÇÃO DO MONACO EDITOR
   ===================================================== */
function inicializarEditor() {
  require.config({
    paths: {
      vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs",
    },
  });

  require(["vs/editor/editor.main"], () => {
    editor = monaco.editor.create(document.getElementById("monaco-editor"), {
      value: "",
      language: linguagemAtual,
      theme: temaAtual === "dark" ? "vs-dark" : "vs",
      automaticLayout: true,
      minimap: { enabled: true },
      wordWrap: "on",
    });

    // Atualiza preview ao digitar
    const iframe = document.getElementById("live-preview");
    iframe.srcdoc = editor.getValue();
    editor
      .getModel()
      .onDidChangeContent(() => (iframe.srcdoc = editor.getValue()));
  });
}

/* =====================================================
   SISTEMA DE BUSCA NO EDITOR
   ===================================================== */
function buscarTexto() {
  const termo = elementos.searchInput.value.trim();
  limparDecoracoes();
  if (!termo) return;

  const matches = editor
    .getModel()
    .findMatches(termo, true, false, true, null, true);
  if (!matches.length) return;

  const decorations = matches.map((match) => ({
    range: match.range,
    options: { inlineClassName: "mySearchHighlight" },
  }));

  currentDecorations = editor.deltaDecorations([], decorations);
  editor.revealRangeInCenter(matches[0].range);
  editor.setSelection(matches[0].range);
  editor.focus();
}

function limparBusca() {
  limparDecoracoes();
  elementos.searchInput.value = "";
  editor.focus();
}

function limparDecoracoes() {
  currentDecorations = editor.deltaDecorations(currentDecorations, []);
}

/* =====================================================
   SISTEMA DE JANELAS FLUTUANTES
   ===================================================== */
function criarJanelaFlutuante() {
  windowCount++;

  // Estrutura da nova janela
  const win = document.createElement("div");
  win.classList.add("floating-window");
  win.style.top = `${60 * windowCount}px`;
  win.style.left = `${60 * windowCount}px`;

  win.innerHTML = `
    <div class="window-header">
        <span class="window-title">Editor ${windowCount}</span>
        <div class="window-controls">
            <button class="renameBtn" title="Renomear janela">✎</button>
            <button class="minimizeBtn" title="Minimizar janela">_</button>
            <button class="closeBtn" title="Fechar janela">X</button>
        </div>
    </div>
    <div class="window-body">
        <input type="text" class="searchInput" placeholder="Pesquisar e marcar..." />
        <div class="editor" id="editor${windowCount}"></div>
        <div class="resize-handle"></div>
    </div>
  `;

  elementos.container.appendChild(win);
  configurarJanela(win, windowCount);
}

/* --- Configuração completa da janela --- */
function configurarJanela(win, id) {
  const header = win.querySelector(".window-header");
  const minimizeBtn = win.querySelector(".minimizeBtn");
  const closeBtn = win.querySelector(".closeBtn");
  const renameBtn = win.querySelector(".renameBtn");
  const titleSpan = win.querySelector(".window-title");
  const searchInput = win.querySelector(".searchInput");
  const editorDiv = win.querySelector(`#editor${id}`);
  const resizeHandle = win.querySelector(".resize-handle");

  minimizeBtn.onclick = () => minimizarJanela(win, titleSpan);
  closeBtn.onclick = () => elementos.container.removeChild(win);
  renameBtn.onclick = () => abrirModalRenomear(titleSpan);

  configurarArrastar(win, header);
  inicializarEditorInterno(win, editorDiv, searchInput, resizeHandle);
}

/* --- Minimizar janela e criar ícone na taskbar --- */
function minimizarJanela(win, titleSpan) {
  win.style.display = "none";
  const icon = document.createElement("div");
  icon.classList.add("taskbar-icon");
  icon.textContent = titleSpan.textContent;
  icon.associatedWindow = win;

  icon.onclick = () => restaurarJanela(win, icon);
  elementos.taskbar.appendChild(icon);
}

/* --- Restaurar janela ao clicar no ícone --- */
function restaurarJanela(win, icon) {
  if (icon.associatedWindow) icon.associatedWindow.style.display = "flex";
  elementos.taskbar.removeChild(icon);
}

/* --- Sistema de arrastar janelas --- */
function configurarArrastar(win, header) {
  let isDragging = false,
    offsetX,
    offsetY;
  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
  });
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      win.style.left = `${e.clientX - offsetX}px`;
      win.style.top = `${e.clientY - offsetY}px`;
    }
  });
  document.addEventListener("mouseup", () => (isDragging = false));
}

/* --- Editor interno de cada janela --- */
function inicializarEditorInterno(win, editorDiv, searchInput, resizeHandle) {
  require(["vs/editor/editor.main"], () => {
    const fEditor = monaco.editor.create(editorDiv, {
      value: "",
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      wordWrap: "on",
    });

    // Busca interna na janela
    searchInput.addEventListener("input", () => {
      fEditor.deltaDecorations([], []);
      const value = searchInput.value;
      if (!value) return;

      const matches = fEditor
        .getModel()
        .findMatches(value, true, false, false, null, true);
      if (!matches.length) return;

      const decorations = matches.map((m) => ({
        range: m.range,
        options: { inlineClassName: "highlightMatch" },
      }));

      const decorationIds = fEditor.deltaDecorations([], decorations);
      fEditor.revealRangeInCenter(matches[0].range);
      setTimeout(() => fEditor.deltaDecorations(decorationIds, []), 3000);
    });

    configurarRedimensionamento(win, editorDiv, fEditor, resizeHandle);
    new ResizeObserver(() => fEditor.layout()).observe(win);
  });
}

/* =====================================================
   RENOMEAR JANELAS
   ===================================================== */
function abrirModalRenomear(titleSpan) {
  janelaAlvo = titleSpan;
  elementos.modalRenomear.style.display = "flex";
  elementos.inputNovoNome.focus();
}

function fecharJanelaRenomear() {
  elementos.modalRenomear.style.display = "none";
  janelaAlvo = null;
  elementos.inputNovoNome.value = "";
}

function confirmarRenomear() {
  const novoNome = elementos.inputNovoNome.value.trim();
  if (novoNome && janelaAlvo) janelaAlvo.textContent = novoNome;
  fecharJanelaRenomear();
}

/* =====================================================
   LIMPEZA COMPLETA DO CHAT / EDITOR
   ===================================================== */
function solicitarLimpezaChat() {
  elementos.toast.classList.add("show");
}

function limparChatCompleto() {
  elementos.toast.classList.remove("show");

  if (editor) {
    editor.setValue("");
    limparDecoracoes();
  }

  const iframe = document.getElementById("live-preview");
  if (iframe) iframe.srcdoc = "";

  // Remove janelas abertas
  elementos.container.querySelectorAll(".floating-window").forEach((win) => {
    if (win.style.display !== "none") elementos.container.removeChild(win);
  });

  elementos.searchInput.value = "";
  mostrarAviso("Chat e janelas limpas ✅");
}

/* --- Card de aviso flutuante --- */
function mostrarAviso(mensagem) {
  const aviso = document.createElement("div");
  aviso.textContent = mensagem;
  Object.assign(aviso.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "linear-gradient(-334deg, #515152c7, #ffffffb2)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "12px 30px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
    zIndex: "10001",
    opacity: "0",
    transition: "all 0.4s ease",
    fontWeight: "600",
  });

  document.body.appendChild(aviso);
  setTimeout(() => (aviso.style.opacity = "1"), 10);
  setTimeout(() => (aviso.style.opacity = "0"), 2300);
  setTimeout(() => aviso.remove(), 2600);
}

/* =====================================================
   SISTEMA DE TASKBAR (BARRA LATERAL)
   ===================================================== */
function abrirTaskbar() {
  elementos.taskbar.classList.add("open");
  elementos.mainContent.classList.add("blur");
  elementos.taskbarTab.classList.add("hidden");
}

function fecharTaskbar() {
  elementos.taskbar.classList.remove("open");
  elementos.mainContent.classList.remove("blur");
  elementos.taskbarTab.classList.remove("hidden");
}

/* =====================================================
   MODAL PRINCIPAL (DETALHES)
   ===================================================== */
function abrirModal() {
  elementos.modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  elementos.modal.style.display = "none";
  document.body.style.overflow = "auto";
}

/* =====================================================
   CONFIGURAÇÃO DE EVENTOS GLOBAIS
   ===================================================== */
function configurarEventListeners() {
  // Busca principal
  elementos.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarTexto();
    }
  });

  // Confirmação de limpeza
  elementos.resetBtn.addEventListener("click", solicitarLimpezaChat);
  elementos.noBtn.addEventListener("click", () =>
    elementos.toast.classList.remove("show")
  );
  elementos.yesBtn.addEventListener("click", limparChatCompleto);

  // Janelas flutuantes
  elementos.newWindowBtn.addEventListener("click", criarJanelaFlutuante);

  // Taskbar
  elementos.taskbarTab.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirTaskbar();
  });
  elementos.taskbarClose.addEventListener("click", fecharTaskbar);

  // Fechar taskbar ao clicar fora
  document.addEventListener("click", (e) => {
    if (
      elementos.taskbar.classList.contains("open") &&
      !elementos.taskbar.contains(e.target) &&
      e.target !== elementos.taskbarTab
    ) {
      fecharTaskbar();
    }
  });
}

/* =====================================================
   INICIALIZAÇÃO GERAL DO SISTEMA
   ===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  inicializarEditor();
  configurarEventListeners();
});

/* =====================================================
   CARD DE AVISO ESTILO iOS
   ===================================================== */
const overlay = document.getElementById("iosOverlay");
const iosCard = document.getElementById("iosCard");
const closeCardBtn = document.getElementById("closeCard");

// Mostra o card ao carregar
window.addEventListener("load", showCard);
function showCard() {
  iosCard.classList.add("show");
  iosCard.focus();
}

// Fecha o card
function closeCard() {
  iosCard.classList.remove("show");
  setTimeout(() => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 500);
}

// Eventos de fechamento
closeCardBtn.addEventListener("click", closeCard);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeCard();
});

// Mantém o foco dentro do card (acessibilidade)
overlay.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    const focusable = iosCard.querySelectorAll("button, [tabindex]");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

/* =====================================================
   TELA DE BOAS-VINDAS ANIMADA
   ===================================================== */
const welcomeScreen = document.getElementById("welcomeScreen");
const welcomeCard = document.querySelector(".welcome-card");
const enterBtn = document.getElementById("enterBtn");

function closeWelcome() {
  welcomeCard.classList.add("hide");
  setTimeout(() => {
    welcomeScreen.style.display = "none";
    const editorHeader = document.getElementById("editorHeader");
    if (editorHeader) editorHeader.style.display = "none";
  }, 500);
}

enterBtn.addEventListener("click", closeWelcome);

// Fecha automaticamente após 20 segundos
setTimeout(() => {
  if (welcomeScreen.style.display !== "none") closeWelcome();
}, 90000000);
