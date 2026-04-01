const SHEETMONKEY_URL = "https://api.sheetmonkey.io/form/axErGpUycFbk49zD3z1Sg3";
const WHATSAPP_NUMBER = "3898788927";

const form       = document.getElementById("eventForm");
const steps      = Array.from(document.querySelectorAll(".step"));
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const progressWrap  = document.getElementById("progressWrap");
const reviewBox  = document.getElementById("reviewBox");
const successState = document.getElementById("successState");
const restartBtn = document.getElementById("restartBtn");

let currentStep = 0;
let warningEl   = null;

const TOTAL_STEPS = steps.length; // includes review step

const fieldLabels = {
  nomeCompleto:        "Nome completo",
  whatsapp:            "WhatsApp",
  email:               "E-mail",
  empresa:             "Empresa",
  idade:               "Idade",
  areaAtuacao:         "Área de atuação",
  origemEvento:        "Como conheceu",
  principalDesafio:    "Principal desafio",
  confirmacaoPresenca: "Confirmação",
};

const sheetBlockOrder = [
  { key: "nomeCompleto",        question: "Qual é o seu nome completo?" },
  { key: "whatsapp",            question: "Qual é o seu WhatsApp?" },
  { key: "email",               question: "Qual é o seu e-mail?" },
  { key: "empresa",             question: "Qual é o nome da sua empresa?" },
  { key: "idade",               question: "Qual é a sua idade?" },
  { key: "areaAtuacao",         question: "Qual é a área de atuação da sua empresa?" },
  { key: "origemEvento",        question: "Como você ficou sabendo do evento?" },
  { key: "principalDesafio",    question: "Qual é o principal desafio que você enfrenta hoje para crescer e organizar sua empresa?" },
  { key: "confirmacaoPresenca", question: "Você confirma sua presença no evento?" },
];

if (
  !form ||
  !steps.length ||
  !progressBar ||
  !progressLabel ||
  !progressWrap ||
  !reviewBox ||
  !successState ||
  !restartBtn
) {
  // Page without wizard markup (e.g. index landing).
  // Exit safely and keep script reusable.
} else {

/* ─── NAVIGATION ─────────────────────────────────── */
function showStep(idx) {
  currentStep = Math.max(0, Math.min(idx, TOTAL_STEPS - 1));

  steps.forEach((step, i) => {
    step.classList.toggle("active", i === currentStep);
  });

  const pct = ((currentStep + 1) / TOTAL_STEPS) * 100;
  progressBar.style.width = `${pct}%`;
  progressWrap.setAttribute("aria-valuenow", String(Math.round(pct)));
  progressLabel.textContent = `Etapa ${currentStep + 1} de ${TOTAL_STEPS}`;

  if (currentStep === TOTAL_STEPS - 1) buildReview();

  // Focus first field
  const input = steps[currentStep].querySelector("input:not([type='hidden'])");
  if (input) setTimeout(() => input.focus(), 80);

  // Smooth scroll on mobile
  if (window.innerWidth <= 900) {
    const card = document.querySelector(".form-card");
    if (card) {
      setTimeout(() => {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }
}

/* ─── VALIDATION ─────────────────────────────────── */
function validate() {
  const activeStep = steps[currentStep];
  const input      = activeStep.querySelector("input:not([type='hidden'])");
  const hidden     = activeStep.querySelector("input[type='hidden'][required]");

  let ok = true;

  if (input) {
    input.classList.remove("invalid");

    if (input.required && !input.value.trim()) ok = false;

    if (input.type === "email" && input.value.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) ok = false;
    }

    if (input.id === "idade" && input.value.trim()) {
      const age = Number(input.value);
      if (Number.isNaN(age) || age < 14 || age > 110) ok = false;
    }

    if (!ok) {
      input.classList.add("invalid");
      input.focus();
      input.addEventListener("input", () => input.classList.remove("invalid"), { once: true });
    }
  }

  if (hidden && !hidden.value) ok = false;

  return ok;
}

function nextStep() {
  if (!validate()) return;
  showStep(currentStep + 1);
}

function prevStep() {
  showStep(currentStep - 1);
}

/* ─── DATA HELPERS ───────────────────────────────── */
function getFormData() {
  const fd = new FormData(form);
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = String(v).trim();
  return obj;
}

function buildReview() {
  const data  = getFormData();
  const order = Object.keys(fieldLabels);

  reviewBox.innerHTML = "";
  order.forEach((key) => {
    if (key === "empresa" && !data[key]) return;
    const value = data[key] || "–";
    const row = document.createElement("div");
    row.className = "review-row";
    row.innerHTML = `<span class="review-label">${fieldLabels[key]}</span><span class="review-value">${value}</span>`;
    reviewBox.appendChild(row);
  });
}

function buildWhatsApp(data) {
  return [
    "Confirmação de presença — Café com Negócios",
    "",
    buildSheetBlock(data),
  ].join("\n");
}

function buildSheetBlock(data) {
  const formatQuestionNumber = (index) => String(index + 1).padStart(2, "0");

  return sheetBlockOrder
    .map(({ key, question }, index) => {
      const value = data[key] || "Nao informado";
      return `Pergunta ${formatQuestionNumber(index)}\n${question}\nResposta\n${value}\n========`;
    })
    .join("\n\n");
}

async function sendToSheet(data) {
  const payload = {
    ...data,
    bloco_respostas: buildSheetBlock(data),
    submittedAt: new Date().toISOString(),
  };

  const res = await fetch(SHEETMONKEY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Erro no envio para SheetMonkey.");
}

function openWhatsApp(msg) {
  let targetNumber = WHATSAPP_NUMBER.replace(/\D/g, "");
  if (targetNumber.length <= 11) {
    targetNumber = `55${targetNumber}`;
  }
  const url = `https://wa.me/${targetNumber}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ─── CHOICE GROUPS ──────────────────────────────── */
function setupChoices() {
  document.querySelectorAll("[data-choice-group]").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;

      const fieldId = group.dataset.choiceGroup;
      const hidden  = document.getElementById(fieldId);
      if (!hidden) return;

      group.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
      btn.classList.add("selected");
      hidden.value = btn.dataset.value || "";

      // Auto-advance
      setTimeout(() => nextStep(), 140);
    });
  });
}

/* ─── NAV BUTTONS ────────────────────────────────── */
function setupNav() {
  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-next]")) nextStep();
    if (e.target.closest("[data-prev]")) prevStep();
  });
}

/* ─── ENTER TO ADVANCE ───────────────────────────── */
function setupEnter() {
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.target.tagName !== "INPUT") return;
    if (e.target.type === "hidden") return;
    if (currentStep < TOTAL_STEPS - 1) {
      e.preventDefault();
      nextStep();
    }
  });
}

/* ─── PHONE MASK ─────────────────────────────────── */
function setupPhoneMask() {
  const tel = document.getElementById("whatsapp");
  if (!tel) return;

  tel.addEventListener("input", () => {
    let v = tel.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6) {
      v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }
    tel.value = v;
  });
}

/* ─── SUBMIT ─────────────────────────────────────── */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const btn = form.querySelector("button[type='submit']");
  if (btn.disabled) return;

  btn.disabled = true;
  const textEl = btn.querySelector(".btn-submit-text");
  if (textEl) textEl.textContent = "Enviando…";

  const data    = getFormData();
  const waMsg   = buildWhatsApp(data);
  let warning   = "";

  try {
    await sendToSheet(data);
  } catch {
    warning = "Não foi possível registrar no banco agora, mas sua confirmação pode ser finalizada pelo WhatsApp.";
  }

  form.hidden = true;
  successState.hidden = false;

  if (warningEl) { warningEl.remove(); warningEl = null; }

  if (warning) {
    warningEl = document.createElement("p");
    warningEl.className = "field-hint";
    warningEl.style.color = "#C05020";
    warningEl.textContent = warning;
    successState.appendChild(warningEl);
  }

  openWhatsApp(waMsg);

  btn.disabled = false;
  if (textEl) textEl.textContent = "Confirmar presença";
});

/* ─── RESTART ────────────────────────────────────── */
restartBtn.addEventListener("click", () => {
  form.reset();
  form.hidden      = false;
  successState.hidden = true;
  if (warningEl) { warningEl.remove(); warningEl = null; }
  document.querySelectorAll(".choice.selected").forEach((c) => c.classList.remove("selected"));
  currentStep = 0;
  showStep(0);
});

/* ─── INIT ───────────────────────────────────────── */
setupChoices();
setupNav();
setupEnter();
setupPhoneMask();
showStep(0);
}
