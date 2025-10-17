// ================================
//        VARIÁVEIS GLOBAIS
// ================================
let editor,
  currentDecorations = [],
  linguagemAtual = "html",
  temaAtual = "dark",
  janelaAlvo = null,
  windowCount = 0;

// ================================
//          ELEMENTOS DOM
// ================================
const elementos = {
  searchInput: document.getElementById("searchInput"),
  languageSelector: document.getElementById("languageSelector"),
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

// ================================
//      INICIALIZAÇÃO MONACO EDITOR
// ================================
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

    const iframe = document.getElementById("live-preview");
    iframe.srcdoc = editor.getValue();

    editor.getModel().onDidChangeContent(() => {
      iframe.srcdoc = editor.getValue();
    });
  });
}

// ================================
//      GERENCIAMENTO DE LINGUAGEM
// ================================
function atualizarLinguagem() {
  const novaLingua = elementos.languageSelector.value;
  linguagemAtual = novaLingua;
  const valorAtual = editor.getValue();
  const model = monaco.editor.createModel(valorAtual, linguagemAtual);
  editor.setModel(model);
}

function alternarSeletorLinguagem() {
  const seletor = elementos.languageSelector;
  seletor.style.display =
    seletor.style.display === "none" || seletor.style.display === ""
      ? "inline-block"
      : "none";
}

// ================================
//           BUSCA
// ================================
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

// ================================
//       JANELAS FLOUTANTES
// ================================
function criarJanelaFlutuante() {
  windowCount++;
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

function minimizarJanela(win, titleSpan) {
  win.style.display = "none";
  const icon = document.createElement("div");
  icon.classList.add("taskbar-icon");
  icon.textContent = titleSpan.textContent;
  icon.associatedWindow = win;

  icon.onclick = () => restaurarJanela(win, icon);
  elementos.taskbar.appendChild(icon);
}

function restaurarJanela(win, icon) {
  if (icon.associatedWindow) icon.associatedWindow.style.display = "flex";
  elementos.taskbar.removeChild(icon);
}

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

function inicializarEditorInterno(win, editorDiv, searchInput, resizeHandle) {
  require(["vs/editor/editor.main"], () => {
    const fEditor = monaco.editor.create(editorDiv, {
      value: "",
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      wordWrap: "on",
    });

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

function configurarRedimensionamento(win, editorDiv, fEditor, resizeHandle) {
  let isResizing = false,
    startY,
    startHeight;
  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = editorDiv.offsetHeight;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (isResizing) {
      const dy = e.clientY - startY;
      editorDiv.style.height = `${startHeight + dy}px`;
      fEditor.layout();
    }
  });
  document.addEventListener("mouseup", () => (isResizing = false));
}

// ================================
//        RENOMEAR JANELA
// ================================
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

// ================================
//         LIMPEZA DO CHAT
// ================================
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

  elementos.container.querySelectorAll(".floating-window").forEach((win) => {
    if (win.style.display !== "none") elementos.container.removeChild(win);
  });

  elementos.searchInput.value = "";
  mostrarAviso("Chat e janelas limpas ✅");
}

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

// ================================
//           TASKBAR
// ================================
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

function ajustarBotaoTaskbar() {
  const contentRect = elementos.mainContent.getBoundingClientRect();
  const buttonRect = elementos.taskbarTab.getBoundingClientRect();

  if (
    buttonRect.bottom > contentRect.bottom ||
    buttonRect.right > contentRect.right
  ) {
    elementos.taskbarTab.style.bottom = "20px";
    elementos.taskbarTab.style.right = "20px";
  }
}

// ================================
//         MODAL PRINCIPAL
// ================================
function abrirModal() {
  elementos.modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function fecharModal() {
  elementos.modal.style.display = "none";
  document.body.style.overflow = "auto";
}

// ================================
//       CONFIGURAÇÃO DE EVENTOS
// ================================
function configurarEventListeners() {
  // Busca
  elementos.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarTexto();
    }
  });

  // Limpeza
  elementos.resetBtn.addEventListener("click", solicitarLimpezaChat);
  elementos.noBtn.addEventListener("click", () =>
    elementos.toast.classList.remove("show")
  );
  elementos.yesBtn.addEventListener("click", limparChatCompleto);

  // Janelas
  elementos.newWindowBtn.addEventListener("click", criarJanelaFlutuante);

  // Taskbar
  elementos.taskbarTab.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirTaskbar();
  });
  elementos.taskbarClose.addEventListener("click", fecharTaskbar);

  document.addEventListener("click", (e) => {
    if (
      elementos.taskbar.classList.contains("open") &&
      !elementos.taskbar.contains(e.target) &&
      e.target !== elementos.taskbarTab
    ) {
      fecharTaskbar();
    }
  });
   // Remove janela e qualquer ícone associado
    elementos.container.removeChild(win);

    // Procura ícone correspondente na taskbar e remove
    const icons = elementos.taskbar.querySelectorAll(".taskbar-icon");
    icons.forEach(icon => {
        if (icon.firstChild.textContent === win.querySelector(".window-title").textContent) {
            elementos.taskbar.removeChild(icon);
        }
    });
}


  // Modal
  elementos.openBtn.addEventListener("click", abrirModal);
  elementos.closeBtn.addEventListener("click", fecharModal);
  window.addEventListener("click", (e) => {
    if (e.target === elementos.modal) fecharModal();
  });

  // Ajustes de layout
  window.addEventListener("resize", ajustarBotaoTaskbar);
  window.addEventListener("load", ajustarBotaoTaskbar);


// ================================
//        INICIALIZAÇÃO GERAL
// ================================
document.addEventListener("DOMContentLoaded", () => {
  inicializarEditor();
  configurarEventListeners();
});

//================================
//        sistema de tags
//================================
