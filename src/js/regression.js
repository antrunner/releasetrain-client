// regression.js: part of the app script; classic script, loaded in order by index.html (see the script list at the end of the page).

    /* ── Regression (public read, admin run) ──────────────────────
       The question-to-answer regression suite: a versioned golden
       dataset of real reported incidents (test/regression-cases.json on
       the server), each checked by deterministic, promptfoo-style
       assertions over the structured Ask result - never exact answer
       wording, never an LLM judge. GET /api/ask/regression serves the
       cases plus the last stored live run; POST /api/ask/regression/run
       (admin-only, it spends real model calls) re-runs every case
       through the live pipeline. Each case renders as its own
       <details>/<summary> so the list stays scannable and a reader
       expands only what they care about. */
    let RG_ACTIVE = false;
    let RG_LOADED = false;
    function activateRegression() {
      if (G_ACTIVE)   deactivateGraph();
      if (A_ACTIVE)   deactivateArch();
      if (CV_ACTIVE)  deactivateCve();
      if (DB_ACTIVE)  deactivateDashboard();
      if (D_ACTIVE)   deactivateDocs();
      if (ACK_ACTIVE) deactivateAck();
      if (CL_ACTIVE)  deactivateChangelog();
      if (UA_ACTIVE)  deactivateUsers();
      if (NET_ACTIVE) deactivateNetwork();
      if (ER_ACTIVE)  deactivateEvalRewriter();
      if (EE_ACTIVE)  deactivateEvalEvaluator();
      if (EO_ACTIVE)  deactivateEvalOrchestrator();
      RG_ACTIVE = true;
      setViewParam("regression");
      setDisplay(document.getElementById("regressionView"), "block");
      setDisplay(document.getElementById("feedPanel"), "none");
      setDisplay(document.getElementById("feedSidebarSections"), "none");
      EL.regressionLink.classList.add("nav-active");
      if (!RG_LOADED) rgLoad();
    }
    function deactivateRegression() {
      RG_ACTIVE = false;
      setViewParam("");
      setDisplay(document.getElementById("regressionView"), "none");
      setDisplay(document.getElementById("feedPanel"), "");
      setDisplay(document.getElementById("feedSidebarSections"), "");
      EL.regressionLink.classList.remove("nav-active");
    }
    EL.regressionLink.addEventListener("click", e => {
      e.preventDefault();
      if (RG_ACTIVE) { deactivateRegression(); return; }
      activateRegression();
    });

    function rgAssertLabel(a) {
      if (a.type === "equals") return `${a.value}`;
      if (Array.isArray(a.value)) return `${a.type}: ${a.value.join(", ")}`;
      return `${a.type}: ${a.value ?? ""}`;
    }

    // One case = one <details>: the summary row carries the pass/fail
    // chip, the case id, and the question; the body holds the incident
    // note, the offline unit-check names, the live asserts (each with
    // its own ✅/⛔ from the last run), and the last run's answer excerpt.
    let RG_CASE_FILE_URL = null; // served by GET /api/ask/regression
    function rgCaseLinks(c) {
      const gh = RG_CASE_FILE_URL
        ? `<a href="${uaEsc(RG_CASE_FILE_URL)}" target="_blank" rel="noopener">Case JSON (versioned file)</a>`
        : "";
      const api = `<a href="${uaEsc(API_BASE + "ask/regression")}" target="_blank" rel="noopener">API</a>`;
      return `<p class="rg-meta">${gh ? gh + " · " : ""}${api}</p>`;
    }
    function rgRenderCase(c, lastResult, runMeta) {
      const chip = !lastResult
        ? '<span class="rg-chip rg-chip-none">not run</span>'
        : lastResult.pass
          ? '<span class="rg-chip rg-chip-pass">PASS</span>'
          : '<span class="rg-chip rg-chip-fail">FAIL</span>';
      const unitNames = Object.keys(c.unit || {});
      const unitHtml = unitNames.length
        ? `<div class="rg-section-label">Unit checks (offline, gate every commit)</div>
           <ul class="rg-unit-list">${unitNames.map(n => `<li>✅ <code class="inline">${uaEsc(n)}</code></li>`).join("")}</ul>`
        : "";
      const assertById = new Map((lastResult && lastResult.asserts || []).map((a, i) => [i, a]));
      const asserts = ((c.e2e && c.e2e.assert) || []).map((a, i) => {
        const r = assertById.get(i);
        const icon = !r ? "▫️" : r.pass ? "✅" : "⛔";
        const actual = r && !r.pass && r.actual !== undefined
          ? ` <span class="rg-actual">(actual: ${uaEsc(typeof r.actual === "string" ? r.actual : JSON.stringify(r.actual))})</span>`
          : "";
        return `<li>${icon} <code class="inline">${uaEsc(rgAssertLabel(a))}</code>${actual}</li>`;
      }).join("");
      const lastHtml = lastResult
        ? `<div class="rg-section-label">Last live run${runMeta ? ` · ${uaEsc(runMeta)}` : ""}</div>
           <p class="rg-meta ask-muted">vendor: <strong>${uaEsc(String(lastResult.vendor ?? "none"))}</strong> · intent: ${uaEsc(String(lastResult.intent ?? "?"))}${lastResult.abstained ? " · abstained" : ""}${lastResult.fixArtifact && lastResult.fixArtifact.versions ? ` · fix: ${uaEsc(lastResult.fixArtifact.versions.join(", "))}` : ""}</p>
           <p class="rg-excerpt">${uaEsc(lastResult.answerExcerpt || "")}</p>`
        : `<p class="rg-meta ask-muted">This case has not been run against the live pipeline yet.</p>`;
      return `<details class="rg-case">
        <summary>
          ${chip}
          <span class="rg-id">${uaEsc(c.id)}</span>
          <span class="rg-q ask-muted">"${uaEsc(c.question)}"</span>
        </summary>
        <div class="rg-body">
          <p class="rg-meta ask-muted">Reported ${uaEsc(c.reported || "?")}${c.reportedBy ? ` · ${uaEsc(c.reportedBy)}` : ""}</p>
          ${rgCaseLinks(c)}
          ${unitHtml}
          <div class="rg-section-label">Live asserts (deterministic, promptfoo-style)</div>
          <ul class="rg-assert-list">${asserts}</ul>
          ${lastHtml}
        </div>
      </details>`;
    }

    function rgRender(data) {
      const results = document.getElementById("rgResults");
      const cases = data.cases || [];
      const lastRun = data.lastRun || null;
      const byId = new Map(((lastRun && lastRun.results) || []).map(r => [r.id, r]));
      const runMeta = lastRun
        ? `${new Date(lastRun.at).toLocaleString()}${lastRun.commit ? ` · commit ${lastRun.commit}` : ""}`
        : null;
      const summary = lastRun
        ? `${cases.length} case${cases.length === 1 ? "" : "s"} · last run ${runMeta}: ${lastRun.passed} passed, ${lastRun.failed} failed`
        : `${cases.length} case${cases.length === 1 ? "" : "s"} · no live run stored yet`;
      results.innerHTML = `<p class="rg-summary">${uaEsc(summary)}</p>`
        + cases.map(c => rgRenderCase(c, byId.get(c.id), runMeta)).join("");
    }

    async function rgLoad() {
      const status = document.getElementById("rgStatus");
      status.textContent = "Loading cases…";
      try {
        const res = await uaRequest("ask/regression");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed.");
        RG_LOADED = true;
        if (data.caseFileUrl) RG_CASE_FILE_URL = data.caseFileUrl;
        status.textContent = "";
        rgRender(data);
      } catch (e) {
        status.textContent = friendlyFetchError(e).headline;
      }
    }

    async function rgRun() {
      const btn = document.getElementById("rgRunBtn");
      const status = document.getElementById("rgStatus");
      btn.disabled = true;
      status.textContent = "Running every case through the live pipeline (this spends real model calls and can take a while)…";
      try {
        const res = await uaRequest("ask/regression/run", { method: "POST", body: JSON.stringify({}) });
        const data = await res.json();
        if (res.status === 401 || res.status === 403) {
          status.textContent = "Admin sign-in required to run the live suite; the stored results below stay readable for everyone.";
          return;
        }
        if (!res.ok) throw new Error(data.error || "Request failed.");
        status.textContent = `Run complete: ${data.passed} passed, ${data.failed} failed.`;
        rgRender({ cases: (await (await uaRequest("ask/regression")).json()).cases, lastRun: data });
      } catch (e) {
        status.textContent = friendlyFetchError(e).headline;
      } finally {
        btn.disabled = false;
      }
    }

    document.getElementById("rgRunBtn").addEventListener("click", rgRun);
    document.getElementById("rgRefreshBtn").addEventListener("click", rgLoad);
