const SHEETMONKEY_URL = "https://api.sheetmonkey.io/form/axErGpUycFbk49zD3z1Sg3";
const WHATSAPP_NUMBER = "553898788927";

const form = document.getElementById("eventForm");
const steps = Array.from(document.querySelectorAll(".step"));
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const reviewBox = document.getElementById("reviewBox");
const successState = document.getElementById("successState");
const restartBtn = document.getElementById("restartBtn");
let warningEl = null;

let currentStep = 0;

const fieldLabels = {
  nomeCompleto: "Nome completo",
  whatsapp: "WhatsApp",
  email: "E-mail",
  empresa: "Empresa",
  idade: "Idade",
  areaAtuacao: "Área de atuação",
  origemEvento: "Como conheceu o evento",
  principalDesafio: "Principal desafio",
  confirmacaoPresenca: "Presença no evento",
};

const sheetBlockOrder = [
  { key: "nomeCompleto", question: "Qual é o seu nome completo?" },
  { key: "whatsapp", question: "Qual é o seu WhatsApp?" },
  { key: "email", question: "Qual é o seu e-mail?" },
  { key: "empresa", question: "Qual é o nome da sua empresa?" },
  { key: "idade", question: "Qual é a sua idade?" },
  { key: "areaAtuacao", question: "Qual é a área de atuação da sua empresa?" },
  { key: "origemEvento", question: "Como você ficou sabendo do evento?" },
  {
    key: "principalDesafio",
    question:
      "Qual é o principal desafio que você enfrenta hoje para crescer e organizar sua empresa?",
  },
  { key: "confirmacaoPresenca", question: "Você confirma sua presença no evento?" },
];

function showStep(stepIndex) {
  currentStep = Math.max(0, Math.min(stepIndex, steps.length - 1));

  steps.forEach((step, idx) => {
    step.classList.toggle("active", idx === currentStep);
  });

  const activeStep = steps[currentStep];

  const progress = ((currentStep + 1) / steps.length) * 100;
  progressBar.style.width = `${progress}%`;
  progressLabel.textContent = `Etapa ${currentStep + 1} de ${steps.length}`;
  document.querySelector(".progress-wrap").setAttribute("aria-valuenow", String(Math.round(progress)));

  if (currentStep === steps.length - 1) {
    buildReview();
  }

  const input = activeStep.querySelector("input:not([type='hidden'])");
  if (input) {
    input.focus();
  }

  // Em telas menores, mantém a etapa ativa sempre em foco visual.
  if (window.matchMedia("(max-width: 768px)").matches) {
    requestAnimationFrame(() => {
      activeStep.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function getCurrentInput() {
  return steps[currentStep].querySelector("input:not([type='hidden'])");
}

function validateCurrentStep() {
  const activeStep = steps[currentStep];
  const input = getCurrentInput();
  const hiddenRequired = activeStep.querySelector("input[type='hidden'][required]");

  let valid = true;

  if (input) {
    input.classList.remove("invalid");

    if (input.required && !input.value.trim()) {
      valid = false;
    }

    if (input.type === "email" && input.value.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      if (!emailOk) valid = false;
    }

    if (input.id === "idade" && input.value.trim()) {
      const age = Number(input.value);
      if (Number.isNaN(age) || age < 14 || age > 110) valid = false;
    }

    if (!valid) input.classList.add("invalid");
  }

  if (hiddenRequired && !hiddenRequired.value) {
    valid = false;
  }

  return valid;
}

function nextStep() {
  if (!validateCurrentStep()) return;
  showStep(currentStep + 1);
}

function prevStep() {
  showStep(currentStep - 1);
}

function getFormDataObject() {
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = String(value).trim();
  }
  return data;
}

function buildReview() {
  const data = getFormDataObject();
  const order = [
    "nomeCompleto",
    "whatsapp",
    "email",
    "empresa",
    "idade",
    "areaAtuacao",
    "origemEvento",
    "principalDesafio",
    "confirmacaoPresenca",
  ];

  reviewBox.innerHTML = "";
  order.forEach((key) => {
    if (key === "empresa" && !data[key]) return;
    const value = data[key] || "-";
    const p = document.createElement("p");
    p.className = "review-item";
    p.innerHTML = `<strong>${fieldLabels[key]}:</strong> ${value}`;
    reviewBox.appendChild(p);
  });
}

function buildWhatsAppMessage(data) {
  const lines = [
    "Confirmacao de presenca - Evento",
    "",
    `Nome completo: ${data.nomeCompleto}`,
    `Idade: ${data.idade}`,
  ];

  if (data.empresa) {
    lines.push(`Empresa: ${data.empresa}`);
  }

  lines.push(
    `Presenca: ${data.confirmacaoPresenca}`,
    `WhatsApp: ${data.whatsapp}`,
    `E-mail: ${data.email}`
  );

  return lines.join("\n");
}

function buildSheetMonkeyBlock(data) {
  return sheetBlockOrder
    .map(({ key, question }) => {
      const value = data[key] ? data[key] : "Nao informado";
      return `Pergunta: ${question}\nResposta: ${value}\n=====`;
    })
    .join("\n\n");
}

async function sendToSheetMonkey(data) {
  const payload = {
    ...data,
    bloco_respostas: buildSheetMonkeyBlock(data),
    submittedAt: new Date().toISOString(),
  };

  const response = await fetch(SHEETMONKEY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Falha no envio para SheetMonkey.");
  }
}

function openWhatsApp(message) {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function setupChoiceGroups() {
  const groups = document.querySelectorAll("[data-choice-group]");
  groups.forEach((group) => {
    group.addEventListener("click", (event) => {
      const option = event.target.closest(".option");
      if (!option) return;

      const hiddenId = group.getAttribute("data-choice-group");
      const hiddenInput = document.getElementById(hiddenId);
      if (!hiddenInput) return;

      group.querySelectorAll(".option").forEach((item) => item.classList.remove("selected"));
      option.classList.add("selected");
      hiddenInput.value = option.dataset.value || "";

      setTimeout(() => {
        nextStep();
      }, 120);
    });
  });
}

function setupNavButtons() {
  form.addEventListener("click", (event) => {
    const nextBtn = event.target.closest("[data-next]");
    const prevBtn = event.target.closest("[data-prev]");

    if (nextBtn) nextStep();
    if (prevBtn) prevStep();
  });
}

function setupEnterAdvance() {
  form.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const target = event.target;
    if (target.tagName !== "INPUT") return;
    if (target.type === "hidden") return;

    if (currentStep < steps.length - 1) {
      event.preventDefault();
      nextStep();
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateCurrentStep()) return;

  const submitBtn = form.querySelector("button[type='submit']");
  if (submitBtn.disabled) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  const data = getFormDataObject();
  const waMessage = buildWhatsAppMessage(data);

  let warning = "";

  try {
    await sendToSheetMonkey(data);
  } catch (error) {
    warning = "Nao foi possivel enviar para o banco agora, mas voce pode confirmar pelo WhatsApp.";
  }

  form.hidden = true;
  successState.hidden = false;

  if (warningEl) {
    warningEl.remove();
    warningEl = null;
  }

  if (warning) {
    warningEl = document.createElement("p");
    warningEl.className = "hint";
    warningEl.textContent = warning;
    successState.appendChild(warningEl);
  }

  openWhatsApp(waMessage);

  submitBtn.disabled = false;
  submitBtn.textContent = "Enviar formulário";
});

restartBtn.addEventListener("click", () => {
  form.reset();
  form.hidden = false;
  successState.hidden = true;
  if (warningEl) {
    warningEl.remove();
    warningEl = null;
  }
  document.querySelectorAll(".option.selected").forEach((el) => el.classList.remove("selected"));
  currentStep = 0;
  showStep(0);
});

setupChoiceGroups();
setupNavButtons();
setupEnterAdvance();
showStep(0);
