const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');

menuToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
  menuToggle.classList.toggle('open');
});

document.querySelectorAll('.nav-menu a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
    menuToggle.classList.remove('open');
  });
});

function normalizarNome(nome) {
  return nome.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mostrarAlerta(msg) {
  const alerta = document.getElementById("alerta");
  alerta.innerText = msg;
  alerta.style.display = "block";
  setTimeout(() => alerta.style.display = "none", 4000);
}

function salvarTurma(e) {
  e.preventDefault();
  const turma = document.getElementById("turma").value.trim();
  localStorage.setItem("turmaSelecionada", turma);
  document.getElementById("linkSala").textContent = turma;
  document.getElementById("inicioTurma").style.display = "none";
  document.getElementById("formFila").style.display = "flex";
  document.getElementById("painel").style.display = "block";
}

let fila = [];
let atual = null;
let timer = null;
let segundos = 0;
let inicio = null;
let historico = JSON.parse(localStorage.getItem("historicoBanheiro") || "[]");
let ultimasEntradas = JSON.parse(localStorage.getItem("ultimasEntradasBanheiro") || "{}");

function entrarFila(e) {
  e.preventDefault();
  const nomeInput = document.getElementById("nome");
  const nomeOriginal = nomeInput.value.trim();
  if (!nomeOriginal) return;

  const nomeNormalizado = normalizarNome(nomeOriginal);
  const regexNome = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\s'-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

  if (!regexNome.test(nomeOriginal)) {
    mostrarAlerta("🚫 Nome inválido! Use apenas letras, espaços e acentos.");
    nomeInput.value = "";
    nomeInput.focus();
    return;
  }

  const agora = Date.now();
  const ultima = ultimasEntradas[nomeNormalizado] || 0;
  const duasHoras = 2 * 60 * 60 * 1000;

  if (agora - ultima < duasHoras) {
    const proximoHorario = new Date(ultima + duasHoras);
    const horas = proximoHorario.getHours().toString().padStart(2, "0");
    const minutos = proximoHorario.getMinutes().toString().padStart(2, "0");
    mostrarAlerta(`🚫 Você só pode entrar novamente às ${horas}:${minutos}.`);
    nomeInput.value = "";
    return;
  }

  ultimasEntradas[nomeNormalizado] = agora;
  localStorage.setItem("ultimasEntradasBanheiro", JSON.stringify(ultimasEntradas));

  fila.push({ nome: nomeOriginal });
  nomeInput.value = "";
  atualizar();

  if (!atual) iniciarProximo();
}

function iniciarProximo() {
  if (atual || fila.length === 0) return;
  atual = fila.shift();
  segundos = 0;
  inicio = new Date();
  atualizar();
  iniciarTimer();
  tocarSom();
}

function iniciarTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    segundos++;
    atualizar();
  }, 1000);
}

function tocarSom() {
  const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
  beep.play();
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
  atual = null;
  segundos = 0;
  inicio = null;
  if (fila.length > 0) iniciarProximo();
  else atualizar();
}

function atualizar() {
  document.getElementById("listaFila").innerHTML =
    fila.map((p, i) => `<li>${i + 1}. ${p.nome}</li>`).join("");

  document.getElementById("usuarioAtual").innerText = atual ? atual.nome : "—";
  document.getElementById("visor").innerText = atual ? formatar(segundos) : "00:00";

  const tbody = document.querySelector("#tabelaHistorico tbody");
  tbody.innerHTML = historico.map(h => {
    const classe = h.duracaoSegundos > 300 ? "demorado" : "";
    return `<tr class="${classe}">
      <td>${h.nome}</td>
      <td>${h.inicio}</td>
      <td>${h.fim}</td>
      <td>${h.duracao}</td>
    </tr>`;
  }).join("");
}

function formatar(s) {
  const m = Math.floor(s / 60);
  const seg = s % 60;
  return String(m).padStart(2, "0") + ":" + String(seg).padStart(2, "0");
}

async function baixarExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Histórico");
  sheet.columns = [
    { header: "Nome", key: "nome", width: 20 },
    { header: "Início", key: "inicio", width: 25 },
    { header: "Término", key: "fim", width: 25 },
    { header: "Duração", key: "duracao", width: 12 }
  ];
  historico.forEach(h => {
    const row = sheet.addRow(h);
    if (h.duracaoSegundos > 300) {
      row.font = { color: { argb: "FFFF0000" }, bold: true };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE6E6" } };
    }
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "historico_fila.xlsx";
  link.click();
}

window.onload = () => {
  localStorage.removeItem("turmaSelecionada");
  document.getElementById("inicioTurma").style.display = "block";
  document.getElementById("formFila").style.display = "none";
  document.getElementById("painel").style.display = "none";
  document.getElementById("linkSala").textContent = "—";
  atualizar();
};
