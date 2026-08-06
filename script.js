/* ============================================================
   SAMSUNG CALCULATOR - LOGICA PRINCIPAL
   ============================================================ */

(function () {
  "use strict";

  // ---------- ESTADO ----------
  let expr = "";           // expresion tal como se muestra (con simbolos × ÷ −)
  let justEvaluated = false;
  let memory = 0;

  // ---------- ELEMENTOS ----------
  const operationLine = document.getElementById("operationLine");
  const resultLine = document.getElementById("resultLine");
  const smartText = document.getElementById("smartText");
  const memIndicator = document.getElementById("memIndicator");

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const btnMenu = document.getElementById("btnMenu");
  const btnCloseSidebar = document.getElementById("btnCloseSidebar");

  const btnSci = document.getElementById("btnSci");
  const sciRow = document.getElementById("sciRow");

  const convPanel = document.getElementById("convPanel");
  const overlayConv = document.getElementById("overlayConv");
  const btnCloseConv = document.getElementById("btnCloseConv");
  const convBody = document.getElementById("convBody");

  const historyList = document.getElementById("historyList");
  const historialEmpty = document.getElementById("historialEmpty");
  const tapeList = document.getElementById("tapeList");
  const cintaEmpty = document.getElementById("cintaEmpty");

  const overlayModal = document.getElementById("overlayModal");
  const confirmModal = document.getElementById("confirmModal");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmCancelBtn = document.getElementById("confirmCancelBtn");
  const confirmAcceptBtn = document.getElementById("confirmAcceptBtn");

  // ---------- UTILIDADES ----------
  function vibrate(ms) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms || 12); } catch (e) {}
    }
  }

  function toEvalString(displayExpr) {
    return displayExpr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/\^/g, "**")
      .replace(/(\d+(\.\d+)?)%/g, "($1/100)");
  }

  function safeEval(str) {
    const cleaned = str.replace(/\s+/g, "");
    // Primero se convierten los simbolos × ÷ − ^ % a su forma ASCII,
    // y RECIEN despues se valida el charset. Antes se validaba el string
    // original (con × ÷ −), que nunca son ASCII, por eso cualquier cosa
    // que no fuera "+" fallaba la validacion y tiraba "Expresion invalida".
    const converted = toEvalString(cleaned);
    if (!/^[0-9+\-*/().]*$/.test(converted)) {
      throw new Error("Expresion invalida");
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function("return (" + converted + ")");
    const val = fn();
    if (typeof val !== "number" || !isFinite(val)) throw new Error("Resultado invalido");
    return val;
  }

  function formatNumber(n) {
    if (Number.isInteger(n)) return n.toString();
    return parseFloat(n.toFixed(10)).toString();
  }

  function lastNumberToken(str) {
    const m = str.match(/(\d+(\.\d+)?)$/);
    return m ? m[0] : null;
  }

  // ---------- RENDER ----------
  function render() {
    // Mientras se escribe: la linea pequeña de arriba queda en blanco
    // y la linea grande de abajo muestra tal cual lo que se va tecleando.
    // NO se calcula nada hasta que el usuario presiona "=".
    operationLine.textContent = "\u00A0";
    resultLine.textContent = expr ? expr : "0";
  }

  function updateMemoryIndicator() {
    if (memory !== 0) {
      memIndicator.classList.add("show");
    } else {
      memIndicator.classList.remove("show");
    }
    document.querySelectorAll(".key.mem").forEach((b) => {
      if (memory !== 0) b.classList.add("has-value");
      else b.classList.remove("has-value");
    });
  }

  // ---------- NUMERO A PALABRAS (ESPAÑOL) ----------
  const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const DECENAS_10_19 = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
  const DECENAS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function convertirDecenas(n) {
    if (n < 10) return UNIDADES[n];
    if (n < 20) return DECENAS_10_19[n - 10];
    if (n < 30) return n === 20 ? "veinte" : "veinti" + UNIDADES[n - 20];
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? DECENAS[d] : DECENAS[d] + " y " + UNIDADES[u];
  }

  function convertirCentenas(n) {
    if (n === 100) return "cien";
    if (n < 100) return convertirDecenas(n);
    const c = Math.floor(n / 100);
    const resto = n % 100;
    return resto === 0 ? CENTENAS[c] : CENTENAS[c] + " " + convertirDecenas(resto);
  }

  function convertirGrupo(n, singular, plural) {
    if (n === 1) return singular ? singular : "uno";
    return convertirCentenas(n) + (plural ? " " + plural : "");
  }

  function numeroAEntero(n) {
    if (n === 0) return "cero";
    if (n < 0) return "menos " + numeroAEntero(-n);

    let partes = [];
    const millones = Math.floor(n / 1000000);
    const miles = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;

    if (millones > 0) {
      partes.push(millones === 1 ? "un millón" : convertirCentenas(millones) + " millones");
    }
    if (miles > 0) {
      partes.push(miles === 1 ? "mil" : convertirCentenas(miles) + " mil");
    }
    if (resto > 0) {
      partes.push(convertirCentenas(resto));
    }
    return partes.join(" ").trim();
  }

  function numeroATexto(num) {
    const negativo = num < 0;
    num = Math.abs(num);
    const entero = Math.floor(num);
    const decimalStr = num.toFixed(6).split(".")[1].replace(/0+$/, "");

    let texto = numeroAEntero(entero);
    if (decimalStr.length > 0) {
      texto += " punto " + decimalStr.split("").map((d) => UNIDADES[+d] || "cero").join(" ");
    }
    return (negativo ? "menos " : "") + texto;
  }

  // ---------- TEXTO INTELIGENTE ----------
  function operatorSpanish(op) {
    switch (op) {
      case "+": return "Suma";
      case "-": return "Resta";
      case "×": return "Multiplicación";
      case "÷": return "División";
      case "%": return "Porcentaje";
      case "^": return "Potencia";
      default: return "Cálculo";
    }
  }

  function connectorSpanish(op) {
    switch (op) {
      case "+": return "más";
      case "-": return "menos";
      case "×": return "por";
      case "÷": return "entre";
      case "^": return "elevado a";
      default: return "";
    }
  }

  function buildSmartText(displayExpr) {
    const noParens = displayExpr;
    const opMatch = noParens.match(/[+×÷^]|(?!^)-/);
    if (!opMatch) return "";
    const opSymbols = ["+", "-", "×", "÷", "^"];
    let mainOp = null;
    for (const s of opSymbols) {
      if (noParens.indexOf(s, 1) !== -1) { mainOp = s; break; }
    }
    if (!mainOp) return "";

    const idx = noParens.indexOf(mainOp, 1);
    const left = noParens.slice(0, idx).trim();
    const right = noParens.slice(idx + 1).trim();
    if (!left || !right) return "";

    return `${operatorSpanish(mainOp)} de ${left} ${connectorSpanish(mainOp)} ${right}`;
  }

  // ---------- HISTORIAL / CINTA (localStorage) ----------
  const STORAGE_KEY = "samsungCalc_history";

  function makeId() {
    return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadHistory() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      // Migracion: las entradas guardadas antes de esta version no tienen "id".
      // Se les asigna uno para poder borrarlas individualmente.
      let needsMigration = false;
      list.forEach((item) => {
        if (!item.id) {
          item.id = makeId();
          needsMigration = true;
        }
      });
      if (needsMigration) saveHistory(list);
      return list;
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function pushHistory(exprStr, resultStr) {
    const list = loadHistory();
    const now = new Date();
    const fecha = now.toLocaleDateString("es-MX");
    const hora = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    list.unshift({ id: makeId(), expr: exprStr, result: resultStr, fecha, hora });
    if (list.length > 200) list.pop();
    saveHistory(list);
    renderHistory();
  }

  function deleteHistoryItem(id) {
    const list = loadHistory().filter((item) => item.id !== id);
    saveHistory(list);
    renderHistory();
    toast("Operación eliminada");
  }

  function renderHistory() {
    const list = loadHistory();
    historyList.innerHTML = "";
    tapeList.innerHTML = "";

    if (list.length === 0) {
      historialEmpty.style.display = "block";
      cintaEmpty.style.display = "block";
      return;
    }
    historialEmpty.style.display = "none";
    cintaEmpty.style.display = "none";

    list.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.innerHTML = `
        <div class="h-content">
          <div class="h-expr">${item.expr} =</div>
          <div class="h-result">${item.result}</div>
          <div class="h-time">${item.fecha} · ${item.hora}</div>
        </div>
        <button class="h-delete" aria-label="Eliminar operación">
          <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;
      li.querySelector(".h-content").addEventListener("click", () => {
        expr = item.result;
        justEvaluated = true;
        render();
        closeSidebar();
      });
      li.querySelector(".h-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        vibrate(12);
        deleteHistoryItem(item.id);
      });
      historyList.appendChild(li);

      const smart = buildSmartText(item.expr) || "Cálculo";
      const tapeDiv = document.createElement("div");
      tapeDiv.className = "tape-line";
      tapeDiv.innerHTML = `
        <div class="tape-content">${smart} = <b>${item.result}</b><br><span style="font-size:11px">${item.fecha} · ${item.hora}</span></div>
        <button class="tape-delete" aria-label="Eliminar operación">
          <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;
      tapeDiv.querySelector(".tape-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        vibrate(12);
        deleteHistoryItem(item.id);
      });
      tapeList.appendChild(tapeDiv);
    });
  }

  function exportHistoryTxt() {
    const list = loadHistory();
    if (list.length === 0) return;
    let content = "SAMSUNG CALCULATOR - HISTORIAL\n================================\n\n";
    list.forEach((item) => {
      content += `${item.fecha} ${item.hora}\n${item.expr} = ${item.result}\n\n`;
    });
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "historial_calculadora.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("No se pudo exportar el archivo en este dispositivo.");
    }
  }

  function copyHistory() {
    const list = loadHistory();
    if (list.length === 0) return;
    let content = list.map((i) => `${i.expr} = ${i.result}`).join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(() => {
        toast("Historial copiado");
      }).catch(() => fallbackCopy(content));
    } else {
      fallbackCopy(content);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("Historial copiado"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function toast(msg) {
    smartText.textContent = msg;
    setTimeout(() => { smartText.textContent = "\u00A0"; }, 1400);
  }

  // ---------- MODAL DE CONFIRMACION PROPIO (reemplaza confirm() nativo) ----------
  let confirmCallback = null;

  function showConfirm(message, onAccept, title) {
    confirmTitle.textContent = title || "Confirmar";
    confirmMessage.textContent = message;
    confirmCallback = onAccept;
    confirmModal.classList.add("open");
    overlayModal.classList.add("show");
  }

  function closeConfirm() {
    confirmModal.classList.remove("open");
    overlayModal.classList.remove("show");
    confirmCallback = null;
  }

  confirmAcceptBtn.addEventListener("click", () => {
    vibrate(15);
    const cb = confirmCallback;
    closeConfirm();
    if (cb) cb();
  });
  confirmCancelBtn.addEventListener("click", () => {
    vibrate(8);
    closeConfirm();
  });
  overlayModal.addEventListener("click", closeConfirm);

  // ---------- CONVERSOR ----------
  const USD_TO_MXN = 17.5;

  function openConverter(type) {
    const rawResult = resultLine.textContent.replace(/,/g, "");
    const num = parseFloat(rawResult);
    if (isNaN(num)) return;

    let html = "";
    if (type === "bin") {
      const entero = Math.trunc(Math.abs(num));
      const bin = entero.toString(2);
      html = `
        <div class="conv-result">
          <div class="conv-label">Binario</div>
          <div class="conv-value">${num < 0 ? "-" : ""}${bin}</div>
        </div>
        <div class="conv-note">Se convierte la parte entera del resultado (${entero}) a base 2.</div>
      `;
    } else if (type === "words") {
      const texto = numeroATexto(num);
      html = `
        <div class="conv-result">
          <div class="conv-label">En letras</div>
          <div class="conv-value">${texto}</div>
        </div>
      `;
    } else if (type === "currency") {
      const mxn = num * USD_TO_MXN;
      const usdFromMxn = num / USD_TO_MXN;
      html = `
        <div class="conv-result">
          <div class="conv-label">Si el resultado son USD → MXN</div>
          <div class="conv-value">$${mxn.toLocaleString("es-MX", { maximumFractionDigits: 2 })} MXN</div>
        </div>
        <div class="conv-result">
          <div class="conv-label">Si el resultado son MXN → USD</div>
          <div class="conv-value">$${usdFromMxn.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD</div>
        </div>
        <div class="conv-note">Tasa de referencia usada: 1 USD = ${USD_TO_MXN} MXN (tasa fija de ejemplo, no en tiempo real).</div>
      `;
    }
    convBody.innerHTML = html;
    convPanel.classList.add("open");
    overlayConv.classList.add("show");
  }

  function closeConverter() {
    convPanel.classList.remove("open");
    overlayConv.classList.remove("show");
  }

  // ---------- SIDEBAR ----------
  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    renderHistory();
  }
  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  // ---------- ACCIONES DEL TECLADO ----------
  function pressNumber(n) {
    if (justEvaluated) {
      expr = "";
      justEvaluated = false;
    }
    if (expr === "0") expr = "";
    expr += n;
    render();
  }

  function pressDot() {
    if (justEvaluated) { expr = ""; justEvaluated = false; }
    const last = lastNumberToken(expr) || "";
    if (last.includes(".")) return;
    if (last === "") expr += "0.";
    else expr += ".";
    render();
  }

  function pressOperator(sym) {
    if (justEvaluated) { justEvaluated = false; }
    if (expr === "" && sym !== "-") return;
    const lastChar = expr.slice(-1);
    if (["+", "-", "×", "÷"].includes(lastChar)) {
      expr = expr.slice(0, -1) + sym;
    } else {
      expr += sym;
    }
    render();
  }

  function pressParen(side) {
    if (justEvaluated) { expr = ""; justEvaluated = false; }
    expr += side === "l" ? "(" : ")";
    render();
  }

  function pressPercent() {
    if (!expr) return;
    const last = lastNumberToken(expr);
    if (!last) return;
    expr += "%";
    render();
  }

  function pressSign() {
    const last = lastNumberToken(expr);
    if (!last) return;
    const idx = expr.lastIndexOf(last);
    const before = expr.slice(0, idx);
    if (before.endsWith("(-") ) {
      expr = expr.slice(0, idx - 2) + last + expr.slice(idx + last.length);
    } else if (before.slice(-1) === "-" && (before.length === 1 || "+-×÷(".includes(before.slice(-2, -1)))) {
      expr = before.slice(0, -1) + last + expr.slice(idx + last.length);
    } else {
      expr = before + "(-" + last + ")" + expr.slice(idx + last.length);
    }
    render();
  }

  function pressDelete() {
    if (justEvaluated) { expr = ""; justEvaluated = false; render(); return; }
    expr = expr.slice(0, -1);
    render();
  }

  function pressAC() {
    expr = "";
    justEvaluated = false;
    smartText.textContent = "\u00A0";
    render();
  }

  function pressEquals() {
    if (!expr) return;
    try {
      const displayBefore = expr;
      const value = safeEval(expr.replace(/\s+/g, ""));
      const resultStr = formatNumber(value);

      const smart = buildSmartText(displayBefore);
      smartText.textContent = smart || "Resultado del cálculo";

      operationLine.textContent = displayBefore + " =";
      resultLine.textContent = resultStr;

      pushHistory(displayBefore, resultStr);

      expr = resultStr;
      justEvaluated = true;
      vibrate(20);
    } catch (e) {
      resultLine.textContent = "Error";
      smartText.textContent = "Expresión no válida";
    }
  }

  // ---------- FUNCIONES CIENTIFICAS ----------
  function toRad(deg) { return (deg * Math.PI) / 180; }

  function applySci(fn) {
    let base;
    try {
      base = expr ? safeEval(expr.replace(/\s+/g, "")) : parseFloat(resultLine.textContent);
    } catch (e) {
      base = parseFloat(resultLine.textContent) || 0;
    }
    if (isNaN(base)) return;

    if (fn === "pow") {
      expr = (expr || formatNumber(base)) + "^";
      render();
      return;
    }

    let value, label;
    switch (fn) {
      case "sin": value = Math.sin(toRad(base)); label = `sin(${base})`; break;
      case "cos": value = Math.cos(toRad(base)); label = `cos(${base})`; break;
      case "tan": value = Math.tan(toRad(base)); label = `tan(${base})`; break;
      case "sqrt":
        if (base < 0) { resultLine.textContent = "Error"; smartText.textContent = "Raíz de número negativo"; return; }
        value = Math.sqrt(base); label = `√(${base})`; break;
      case "log":
        if (base <= 0) { resultLine.textContent = "Error"; smartText.textContent = "Logaritmo no definido"; return; }
        value = Math.log10(base); label = `log(${base})`; break;
      default: return;
    }

    const resultStr = formatNumber(value);
    operationLine.textContent = label + " =";
    resultLine.textContent = resultStr;
    smartText.textContent = `Función ${fn} aplicada a ${base}`;
    pushHistory(label, resultStr);
    expr = resultStr;
    justEvaluated = true;
  }

  // ---------- MEMORIA ----------
  function currentDisplayedValue() {
    const v = parseFloat(resultLine.textContent.replace(/,/g, ""));
    return isNaN(v) ? 0 : v;
  }

  function memAction(action) {
    switch (action) {
      case "mc":
        memory = 0;
        toast("Memoria borrada");
        break;
      case "mr":
        expr = formatNumber(memory);
        justEvaluated = true;
        render();
        break;
      case "mplus":
        memory += currentDisplayedValue();
        toast("Sumado a memoria");
        break;
      case "mminus":
        memory -= currentDisplayedValue();
        toast("Restado de memoria");
        break;
    }
    updateMemoryIndicator();
  }

  // ---------- EVENTOS: TECLADO NUMERICO/OPERADORES ----------
  document.querySelectorAll(".key[data-key]").forEach((btn) => {
    btn.addEventListener("click", () => {
      vibrate(10);
      const k = btn.getAttribute("data-key");

      document.querySelectorAll(".key.op").forEach((o) => o.classList.remove("active-op"));

      if (/^[0-9]$/.test(k)) return pressNumber(k);

      switch (k) {
        case "dot": return pressDot();
        case "add": btn.classList.add("active-op"); return pressOperator("+");
        case "subtract": btn.classList.add("active-op"); return pressOperator("-");
        case "multiply": btn.classList.add("active-op"); return pressOperator("×");
        case "divide": btn.classList.add("active-op"); return pressOperator("÷");
        case "percent": return pressPercent();
        case "paren-l": return pressParen("l");
        case "paren-r": return pressParen("r");
        case "sign": return pressSign();
        case "del": return pressDelete();
        case "ac": return pressAC();
        case "equals": return pressEquals();
      }
    });
  });

  // ---------- EVENTOS: CIENTIFICO ----------
  document.querySelectorAll("[data-sci]").forEach((btn) => {
    btn.addEventListener("click", () => {
      vibrate(10);
      applySci(btn.getAttribute("data-sci"));
    });
  });

  btnSci.addEventListener("click", () => {
    vibrate(10);
    sciRow.classList.toggle("open");
  });

  // ---------- EVENTOS: MEMORIA ----------
  document.querySelectorAll("[data-mem]").forEach((btn) => {
    btn.addEventListener("click", () => {
      vibrate(10);
      memAction(btn.getAttribute("data-mem"));
    });
  });

  // ---------- EVENTOS: SIDEBAR ----------
  btnMenu.addEventListener("click", () => { vibrate(10); openSidebar(); });
  btnCloseSidebar.addEventListener("click", () => { vibrate(10); closeSidebar(); });
  overlay.addEventListener("click", closeSidebar);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      vibrate(8);
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      document.getElementById("panelHistorial").classList.toggle("active", target === "historial");
      document.getElementById("panelCinta").classList.toggle("active", target === "cinta");
    });
  });

  document.getElementById("btnCopy").addEventListener("click", () => { vibrate(10); copyHistory(); });
  document.getElementById("btnExport").addEventListener("click", () => { vibrate(10); exportHistoryTxt(); });
  document.getElementById("btnClearHistory").addEventListener("click", () => {
    vibrate(15);
    showConfirm(
      "Se eliminarán todas las operaciones guardadas del historial y de la cinta de papel. Esta acción no se puede deshacer.",
      () => {
        saveHistory([]);
        renderHistory();
        toast("Historial borrado");
      },
      "Borrar todo el historial"
    );
  });

  // ---------- EVENTOS: CONVERSOR ----------
  document.querySelectorAll(".chip[data-conv]").forEach((btn) => {
    btn.addEventListener("click", () => {
      vibrate(10);
      openConverter(btn.getAttribute("data-conv"));
    });
  });
  btnCloseConv.addEventListener("click", () => { vibrate(10); closeConverter(); });
  overlayConv.addEventListener("click", closeConverter);

  // ---------- INICIO ----------
  renderHistory();
  updateMemoryIndicator();
  render();

})();
        
