/* ============================================
   FILA DO BANHEIRO — Lógica
   Renders separados para evitar reflow da lista
   ============================================ */

/* ---------- Menu mobile ---------- */
const menuToggle  = document.getElementById('menuToggle');
const navMenu     = document.getElementById('navMenu');
const navClose    = document.getElementById('navClose');
const navBackdrop = document.getElementById('navBackdrop');

function abrirMenu() {
  navMenu.classList.add('active');
  navBackdrop.classList.add('active');
  menuToggle.classList.add('open');
  menuToggle.setAttribute('aria-expanded', 'true');
  navMenu.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharMenu() {
  navMenu.classList.remove('active');
  navBackdrop.classList.remove('active');
  menuToggle.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  navMenu.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    if (navMenu.classList.contains('active')) fecharMenu();
    else abrirMenu();
  });
}

if (navClose)    navClose.addEventListener('click', fecharMenu);
if (navBackdrop) navBackdrop.addEventListener('click', fecharMenu);

document.querySelectorAll('.nav-menu a').forEach(link => {
  link.addEventListener('click', fecharMenu);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navMenu.classList.contains('active')) fecharMenu();
});

/* ---------- Utilidades ---------- */
function normalizarNome(nome) {
  return nome.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mostrarAlerta(msg) {
  const alerta = document.getElementById("alerta");
  if (!alerta) return;
  alerta.innerText = msg;
  alerta.style.display = "block";
  clearTimeout(mostrarAlerta._t);
  mostrarAlerta._t = setTimeout(() => alerta.style.display = "none", 4000);
}

function formatar(s) {
  const m   = Math.floor(s / 60);
  const seg = s % 60;
  return String(m).padStart(2, "0") + ":" + String(seg).padStart(2, "0");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Estado ---------- */
let fila            = [];
let atual           = null;
let timer           = null;
let segundos        = 0;
let inicio          = null;
let historico       = JSON.parse(localStorage.getItem("historicoBanheiro") || "[]");
let ultimasEntradas = JSON.parse(localStorage.getItem("ultimasEntradasBanheiro") || "{}");

/* ---------- Sala/Turma ---------- */
function salvarTurma(e) {
  e.preventDefault();
  const turma = document.getElementById("turma").value.trim();
  if (!turma) return;

  localStorage.setItem("turmaSelecionada", turma);

  const linkSala    = document.getElementById("linkSala");
  const footerRoom  = document.getElementById("footerRoom");
  const turmaMobile = document.getElementById("turmaMobile");

  if (linkSala)    linkSala.textContent    = turma;
  if (footerRoom)  footerRoom.textContent  = turma;
  if (turmaMobile) turmaMobile.textContent = turma;

  document.getElementById("inicioTurma").style.display  = "none";
  document.getElementById("formFilaWrap").style.display = "block";
  document.getElementById("painel").style.display       = "flex";

  renderTudo();
}

/* ---------- Entrada na fila ---------- */
function entrarFila(e) {
  e.preventDefault();
  const nomeInput     = document.getElementById("nome");
  const nomeOriginal  = nomeInput.value.trim();
  if (!nomeOriginal) return;

  const nomeNormalizado = normalizarNome(nomeOriginal);
  const regexNome = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\s'-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

  if (!regexNome.test(nomeOriginal)) {
    mostrarAlerta("Nome inválido. Use apenas letras, espaços e acentos.");
    nomeInput.value = "";
    nomeInput.focus();
    return;
  }

  const agora     = Date.now();
  const ultima    = ultimasEntradas[nomeNormalizado] || 0;
  const duasHoras = 2 * 60 * 60 * 1000;

  if (agora - ultima < duasHoras) {
    const proximoHorario = new Date(ultima + duasHoras);
    const horas   = proximoHorario.getHours().toString().padStart(2, "0");
    const minutos = proximoHorario.getMinutes().toString().padStart(2, "0");
    mostrarAlerta(`Você só pode entrar novamente às ${horas}:${minutos}.`);
    nomeInput.value = "";
    return;
  }

  ultimasEntradas[nomeNormalizado] = agora;
  localStorage.setItem("ultimasEntradasBanheiro", JSON.stringify(ultimasEntradas));

  fila.push({ nome: nomeOriginal });
  nomeInput.value = "";

  renderFila();      // só re-renderiza a fila quando há mudança
  renderTimerMeta(); // status pode mudar caso ninguém esteja usando

  if (!atual) iniciarProximo();
}

/* ---------- Timer ---------- */
function iniciarProximo() {
  if (atual || fila.length === 0) return;
  atual    = fila.shift();
  segundos = 0;
  inicio   = new Date();

  renderFila();        // fila mudou (alguém saiu dela)
  renderTimerMeta();   // usuário atual mudou
  renderTimerDisplay();// reseta visor para 00:00

  iniciarTimer();
  tocarSom();
}

function iniciarTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    segundos++;
    renderTimerDisplay(); // ÚNICA coisa que atualiza por segundo
  }, 1000);
}

function tocarSom() {
  try {
    const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
    beep.volume = 0.5;
    beep.play().catch(() => {});
  } catch (_) {}
}

function finalizar() {
  clearInterval(timer);
  if (atual) {
    const fim = new Date();
    const duracao = formatar(segundos);
    const registro = {
      nome: atual.nome,
      inicio: inicio.toLocaleString(),
      fim: fim.toLocaleString(),
      duracaoSegundos: segundos,
      duracao: duracao
    };
    historico.unshift(registro);
    localStorage.setItem("historicoBanheiro", JSON.stringify(historico));
  }
  atual    = null;
  segundos = 0;
  inicio   = null;

  if (fila.length > 0) {
    iniciarProximo();
  } else {
    renderTimerMeta();
    renderTimerDisplay();
    renderHistorico();
  }
  renderHistorico();
}

/* ============================================
   RENDERS SEPARADOS
   ============================================ */

/* Atualiza SÓ o visor de tempo + cor do timer (chamado por segundo) */
function renderTimerDisplay() {
  const visor = document.getElementById("visor");
  if (!visor) return;

  visor.innerText = atual ? formatar(segundos) : "00:00";

  visor.classList.remove("warning", "danger");
  if (atual) {
    if (segundos > 300)      visor.classList.add("danger");
    else if (segundos > 180) visor.classList.add("warning");
  }
}

/* Atualiza nome do usuário e status — chamado em eventos de mudança */
function renderTimerMeta() {
  const usuarioAtual = document.getElementById("usuarioAtual");
  const statusEl     = document.getElementById("timerStatus");

  if (usuarioAtual) usuarioAtual.innerText = atual ? atual.nome : "—";

  if (statusEl) {
    if (atual) {
      statusEl.innerText = "em uso";
      statusEl.classList.add("active");
    } else {
      statusEl.innerText = "aguardando";
      statusEl.classList.remove("active");
    }
  }
}

/* Renderiza a fila — chamado APENAS quando a fila muda */
function renderFila() {
  const listaFila = document.getElementById("listaFila");
  if (listaFila) {
    if (fila.length === 0) {
      listaFila.innerHTML = `<li class="queue-empty">Nenhuma pessoa aguardando</li>`;
    } else {
      listaFila.innerHTML = fila
        .map((p, i) => `<li class="enter" data-pos="${String(i + 1).padStart(2, "0")}">${escapeHtml(p.nome)}</li>`)
        .join("");
    }
  }

  const badgeFila = document.getElementById("badgeFila");
  if (badgeFila) badgeFila.textContent = String(fila.length).padStart(2, "0");
}

/* Renderiza histórico — chamado APENAS quando histórico muda */
function renderHistorico() {
  const tbody = document.querySelector("#tabelaHistorico tbody");
  if (!tbody) return;

  if (historico.length === 0) {
    tbody.innerHTML = `<tr class="table-empty"><td colspan="4">Sem registros ainda</td></tr>`;
    return;
  }

  tbody.innerHTML = historico.map(h => {
    const classe = h.duracaoSegundos > 300 ? "demorado" : "";
    return `<tr class="${classe}">
      <td data-label="Nome">${escapeHtml(h.nome)}</td>
      <td data-label="Início">${escapeHtml(h.inicio)}</td>
      <td data-label="Término">${escapeHtml(h.fim)}</td>
      <td data-label="Duração">${escapeHtml(h.duracao)}</td>
    </tr>`;
  }).join("");
}

/* Renderiza tudo de uma vez (boot, troca de tela, etc.) */
function renderTudo() {
  renderFila();
  renderTimerMeta();
  renderTimerDisplay();
  renderHistorico();
}

/* ---------- Exportar Excel ---------- */
async function baixarExcel() {
  if (typeof ExcelJS === "undefined") {
    mostrarAlerta("Biblioteca de exportação não carregada.");
    return;
  }
  if (historico.length === 0) {
    mostrarAlerta("Não há registros para exportar.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet("Histórico");
  sheet.columns = [
    { header: "Nome",    key: "nome",    width: 24 },
    { header: "Início",  key: "inicio",  width: 26 },
    { header: "Término", key: "fim",     width: 26 },
    { header: "Duração", key: "duracao", width: 14 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern", pattern: "solid",
    fgColor: { argb: "FF1C2029" }
  };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "left" };

  historico.forEach(h => {
    const row = sheet.addRow(h);
    if (h.duracaoSegundos > 300) {
      row.font = { color: { argb: "FFD97B6B" }, bold: true };
      row.fill = {
        type: "pattern", pattern: "solid",
        fgColor: { argb: "FFFDECE9" }
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link   = document.createElement("a");
  link.href     = URL.createObjectURL(blob);
  link.download = "historico_fila.xlsx";
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ---------- Boot ---------- */
window.onload = () => {
  localStorage.removeItem("turmaSelecionada");

  document.getElementById("inicioTurma").style.display  = "block";
  document.getElementById("formFilaWrap").style.display = "none";
  document.getElementById("painel").style.display       = "none";

  const linkSala   = document.getElementById("linkSala");
  const footerRoom = document.getElementById("footerRoom");
  if (linkSala)   linkSala.textContent   = "—";
  if (footerRoom) footerRoom.textContent = "—";

  renderTudo();
};