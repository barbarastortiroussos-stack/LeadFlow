(() => {
  "use strict";

  const STORAGE_KEY = "leadflow_demo_leads_v1";
  const MAX_RECORDS = 250;

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    form: $("#leadForm"),
    runButton: $("#runButton"),
    execution: $("#execution"),
    resultCard: $("#resultCard"),
    toast: $("#toast"),
    tableBody: $("#leadsTableBody"),
    search: $("#searchInput"),
    clearDialog: $("#clearDialog"),
    sampleButton: $("#sampleButton"),
    exportButton: $("#exportButton"),
    clearButton: $("#clearButton"),
    cancelClear: $("#cancelClear"),
    confirmClear: $("#confirmClear"),
    mobileMenu: $("#mobileMenu"),
    sidebar: $("#sidebar")
  };

  let leads = loadLeads();
  let automationRuns = 0;
  let toastTimeout;

  function loadLeads() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.warn("Não foi possível carregar o histórico.", error);
      return [];
    }
  }

  function saveLeads() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(leads.slice(0, MAX_RECORDS))
      );
    } catch (error) {
      console.warn("Não foi possível salvar o histórico.", error);
      showToast("Não foi possível salvar os dados neste navegador.");
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function initials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
      return "Não informado";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "Não informado";
    }

    return number.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    });
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Data indisponível";
    }

    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function showToast(message) {
    if (!elements.toast) {
      console.log(message);
      return;
    }

    elements.toast.textContent = message;
    elements.toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 3200);
  }

  function getField(id) {
    return document.getElementById(id);
  }

  function getFieldValue(id) {
    const field = getField(id);
    return field ? field.value.trim() : "";
  }

  function clearErrors() {
    document.querySelectorAll(".field-error").forEach((element) => {
      element.textContent = "";
    });

    document.querySelectorAll(".field.invalid").forEach((element) => {
      element.classList.remove("invalid");
    });
  }

  function setError(fieldId, message) {
    const field = getField(fieldId);
    const errorElement = getField(fieldId + "Error");

    if (field) {
      const wrapper = field.closest(".field");
      if (wrapper) wrapper.classList.add("invalid");
    }

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function validateLead(data) {
    clearErrors();

    let valid = true;

    if (data.name.length < 2) {
      setError("name", "Informe um nome com pelo menos 2 caracteres.");
      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(data.email)) {
      setError("email", "Informe um e-mail válido.");
      valid = false;
    }

    if (!data.service) {
      setError("service", "Selecione um serviço.");
      valid = false;
    }

    if (data.budget !== "" && (
      !Number.isFinite(Number(data.budget)) ||
      Number(data.budget) < 0
    )) {
      setError("budget", "Informe um orçamento válido.");
      valid = false;
    }

    return valid;
  }

  function classifyLead(budgetValue) {
    const budget = budgetValue === "" ? null : Number(budgetValue);

    if (budget === null) {
      return {
        category: "unknown",
        label: "Sem orçamento",
        priority: "Baixa",
        score: 10,
        action: "Solicitar informações sobre o orçamento"
      };
    }

    if (budget >= 10000) {
      return {
        category: "premium",
        label: "Premium",
        priority: "Alta",
        score: 95,
        action: "Agendar uma conversa personalizada"
      };
    }

    if (budget >= 5000) {
      return {
        category: "high",
        label: "Alto potencial",
        priority: "Alta",
        score: 80,
        action: "Entrar em contato prioritariamente"
      };
    }

    if (budget >= 1500) {
      return {
        category: "mid",
        label: "Potencial médio",
        priority: "Média",
        score: 55,
        action: "Enviar proposta comercial"
      };
    }

    return {
      category: "low",
      label: "Em nutrição",
      priority: "Baixa",
      score: 20,
      action: "Enviar apresentação dos serviços"
    };
  }

  function getLeadData() {
    return {
      id: createId(),
      name: getFieldValue("name"),
      email: getFieldValue("email"),
      company: getFieldValue("company") || "Não informada",
      service: getFieldValue("service"),
      budget: getFieldValue("budget"),
      createdAt: new Date().toISOString()
    };
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
      Math.random().toString(36).slice(2, 10);
  }

  function serviceLabel(service) {
    const labels = {
      website: "Criação de sites",
      automation: "Automação",
      ai: "Soluções com IA",
      marketing: "Marketing digital",
      design: "Design",
      other: "Outro serviço"
    };

    return labels[service] || service || "Não informado";
  }

  function updateStep(stepId, status) {
    const step = getField(stepId);
    if (!step) return;

    step.classList.remove("active", "completed", "error");

    if (status) {
      step.classList.add(status);
    }
  }

  function setExecutionStatus(title, badge) {
    const titleElement = getField("executionTitle");
    const badgeElement = getField("executionBadge");
    const flowStatus = getField("flowStatus");

    if (titleElement) titleElement.textContent = title;
    if (badgeElement) badgeElement.textContent = badge;
    if (flowStatus) flowStatus.textContent = badge;
  }

  function runAutomation(lead) {
    const classification = classifyLead(lead.budget);

    const processedLead = {
      ...lead,
      ...classification,
      serviceLabel: serviceLabel(lead.service),
      processedAt: new Date().toISOString()
    };

    automationRuns++;

    updateStep("stepValidate", "completed");
    updateStep("stepClassify", "completed");
    updateStep("stepAction", "completed");

    setExecutionStatus("Automação concluída", "Concluído");

    leads.unshift(processedLead);
    leads = leads.slice(0, MAX_RECORDS);

    saveLeads();
    renderAll();
    showResult(processedLead);

    return processedLead;
  }

  function showResult(lead) {
    if (!elements.resultCard) return;

    elements.resultCard.innerHTML = `
      <div class="result-header">
        <div>
          <span class="result-eyebrow">PROCESSAMENTO CONCLUÍDO</span>
          <h3>${escapeHTML(lead.name)}</h3>
          <p>${escapeHTML(lead.email)}</p>
        </div>
        <span class="priority-badge ${escapeHTML(lead.category)}">
          ${escapeHTML(lead.priority)}
        </span>
      </div>

      <div class="result-score">
        <span>Lead score</span>
        <strong>${Number(lead.score)}<small>/100</small></strong>
      </div>

      <div class="score-track">
        <div class="score-fill" style="width:${Number(lead.score)}%"></div>
      </div>

      <div class="result-details">
        <div>
          <span>Classificação</span>
          <strong>${escapeHTML(lead.label)}</strong>
        </div>
        <div>
          <span>Serviço</span>
          <strong>${escapeHTML(lead.serviceLabel)}</strong>
        </div>
        <div>
          <span>Orçamento</span>
          <strong>${escapeHTML(formatCurrency(lead.budget))}</strong>
        </div>
      </div>

      <div class="recommended-action">
        <span>AÇÃO RECOMENDADA</span>
        <p>${escapeHTML(lead.action)}</p>
      </div>

      <p class="demo-note">
        Demonstração: esta ação foi recomendada pelo sistema,
        mas nenhuma mensagem real foi enviada ao lead.
      </p>
    `;

    elements.resultCard.classList.add("visible");
  }

  function renderMetrics() {
    const total = leads.length;
    const highPriority = leads.filter(
      (lead) => lead.priority === "Alta"
    ).length;

    const followUp = leads.filter(
      (lead) => lead.category === "low" ||
        lead.category === "unknown"
    ).length;

    setText("metricTotal", total);
    setText("metricHigh", highPriority);
    setText("metricFollow", followUp);
    setText("metricRuns", automationRuns);
    setText("navLeadCount", total);
    setText("tableCount", total);
  }

  function setText(id, value) {
    const element = getField(id);
    if (element) element.textContent = String(value);
  }

  function renderTable() {
    if (!elements.tableBody) return;

    const query = elements.search
      ? elements.search.value.trim().toLowerCase()
      : "";

    const filtered = leads.filter((lead) => {
      const searchable = [
        lead.name,
        lead.email,
        lead.company,
        lead.serviceLabel,
        lead.label
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });

    setText("tableSummary", `${filtered.length} lead(s) encontrado(s)`);

    if (filtered.length === 0) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            ${leads.length === 0
              ? "Nenhum lead processado ainda."
              : "Nenhum resultado para esta busca."}
          </td>
        </tr>
      `;
      return;
    }

    elements.tableBody.innerHTML = filtered.map((lead) => `
      <tr>
        <td>
          <div class="lead-person">
            <span class="avatar">${escapeHTML(initials(lead.name))}</span>
            <div>
              <strong>${escapeHTML(lead.name)}</strong>
              <small>${escapeHTML(lead.email)}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="lead-service">
            ${escapeHTML(lead.serviceLabel || serviceLabel(lead.service))}
          </span>
        </td>
        <td>${escapeHTML(formatCurrency(lead.budget))}</td>
        <td>
          <span class="priority-badge ${escapeHTML(lead.category)}">
            ${escapeHTML(lead.priority || "Baixa")}
          </span>
        </td>
        <td>${escapeHTML(formatDate(lead.processedAt || lead.createdAt))}</td>
      </tr>
    `).join("");
  }

  function renderAll() {
    renderMetrics();
    renderTable();
  }

  function exportCSV() {
    if (leads.length === 0) {
      showToast("Não há leads para exportar.");
      return;
    }

    const columns = [
      ["Nome", "name"],
      ["Email", "email"],
      ["Empresa", "company"],
      ["Serviço", "serviceLabel"],
      ["Orçamento", "budget"],
      ["Classificação", "label"],
      ["Prioridade", "priority"],
      ["Lead Score", "score"],
      ["Ação recomendada", "action"],
      ["Data", "processedAt"]
    ];

    const escapeCSV = (value) => {
      let text = String(value ?? "");

      // Evita que planilhas interpretem conteúdo como fórmulas.
      if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = [
      columns.map(([label]) => escapeCSV(label)).join(";"),
      ...leads.map((lead) =>
        columns.map(([, key]) => {
          let value = lead[key];

          if (key === "serviceLabel" && !value) {
            value = serviceLabel(lead.service);
          }

          if (key === "budget" && value !== "") {
            value = Number(value);
          }

          return escapeCSV(value);
        }).join(";")
      )
    ];

    const blob = new Blob(
      ["\uFEFF" + rows.join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "leadflow-leads.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showToast("Arquivo CSV exportado.");
  }

  function fillExample() {
    const examples = {
      name: "Marina Costa",
      email: "marina.exemplo@email.com",
      company: "Studio Aurora",
      service: "website",
      budget: "3500"
    };

    Object.entries(examples).forEach(([id, value]) => {
      const field = getField(id);
      if (field) field.value = value;
    });

    clearErrors();
    showToast("Exemplo preenchido. Execute a automação para testar.");
  }

  function clearHistory() {
    leads = [];
    saveLeads();

    if (elements.resultCard) {
      elements.resultCard.innerHTML = "";
      elements.resultCard.classList.remove("visible");
    }

    renderAll();
    showToast("Histórico apagado.");
  }

  function submitForm(event) {
    event.preventDefault();

    const lead = getLeadData();

    if (!validateLead(lead)) {
      showToast("Revise os campos destacados.");
      return;
    }

    updateStep("stepValidate", "completed");
    updateStep("stepClassify", "active");
    updateStep("stepAction", "");

    setExecutionStatus("Processando lead...", "Em execução");

    if (elements.runButton) {
      elements.runButton.disabled = true;
    }

    // A pequena pausa simula etapas de uma automação real.
    setTimeout(() => {
      try {
        runAutomation(lead);
        if (elements.form) elements.form.reset();
      } catch (error) {
        console.error("Erro na demonstração:", error);
        setExecutionStatus("Falha no processamento", "Erro");
        showToast("Ocorreu um erro. Confira o console do navegador.");
      } finally {
        if (elements.runButton) {
          elements.runButton.disabled = false;
        }
      }
    }, 450);
  }

  function setupEvents() {
    if (elements.form) {
      elements.form.addEventListener("submit", submitForm);
    }

    if (elements.sampleButton) {
      elements.sampleButton.addEventListener("click", fillExample);
    }

    if (elements.search) {
      elements.search.addEventListener("input", renderTable);
    }

    if (elements.exportButton) {
      elements.exportButton.addEventListener("click", exportCSV);
    }

    if (elements.clearButton) {
      elements.clearButton.addEventListener("click", () => {
        if (elements.clearDialog &&
            typeof elements.clearDialog.showModal === "function") {
          elements.clearDialog.showModal();
        } else if (window.confirm("Deseja apagar todo o histórico?")) {
          clearHistory();
        }
      });
    }

    if (elements.cancelClear) {
      elements.cancelClear.addEventListener("click", () => {
        if (elements.clearDialog) elements.clearDialog.close();
      });
    }

    if (elements.confirmClear) {
      elements.confirmClear.addEventListener("click", () => {
        clearHistory();

        if (elements.clearDialog) {
          elements.clearDialog.close();
        }
      });
    }

    if (elements.mobileMenu && elements.sidebar) {
      elements.mobileMenu.addEventListener("click", () => {
        elements.sidebar.classList.toggle("open");
      });
    }

    // Remove a mensagem de erro quando a pessoa volta a editar o campo.
    ["name", "email", "service", "budget"].forEach((id) => {
      const field = getField(id);

      if (field) {
        field.addEventListener("input", () => {
          const wrapper = field.closest(".field");
          const error = getField(id + "Error");

          if (wrapper) wrapper.classList.remove("invalid");
          if (error) error.textContent = "";
        });

        field.addEventListener("change", () => {
          const wrapper = field.closest(".field");
          const error = getField(id + "Error");

          if (wrapper) wrapper.classList.remove("invalid");
          if (error) error.textContent = "";
        });
      }
    });
  }

  function init() {
    setupEvents();
    renderAll();
    setExecutionStatus("Sistema pronto", "Aguardando lead");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
