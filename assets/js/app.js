/* ==========================================================================
   Chronological Age Calculator — vanilla JS engine
   100% client-side. The user's date of birth is never transmitted or stored.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Date helpers ---------- */
  function parseDate(value) {
    if (!value) return null;
    var parts = value.split("-");
    if (parts.length !== 3) return null;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  /* Add a whole number of months to a date, clamping the day to the
     length of the resulting month (e.g. Jan 31 + 1 month = Feb 28/29). */
  function addMonths(date, n) {
    var y = date.getFullYear();
    var mi = date.getMonth() + n;
    y += Math.floor(mi / 12);
    mi = ((mi % 12) + 12) % 12;
    var day = Math.min(date.getDate(), daysInMonth(y, mi));
    return new Date(y, mi, day);
  }

  /* Precise year / month / day difference.
     Works by counting whole elapsed months (clamped) and then the
     remaining days, so leap years and uneven month lengths are handled
     correctly and the day component is never negative. */
  function diffYMD(birth, ref) {
    var months = (ref.getFullYear() - birth.getFullYear()) * 12 +
                 (ref.getMonth() - birth.getMonth());
    if (ref.getDate() < birth.getDate()) months -= 1;
    if (months < 0) months = 0;

    var anchor = addMonths(birth, months);
    var days = Math.round((ref - anchor) / 86400000);

    return { years: Math.floor(months / 12), months: months % 12, days: days };
  }

  function totals(birth, ref) {
    var totalDays = Math.round((ref - birth) / 86400000);
    var ymd = diffYMD(birth, ref);
    var totalMonths = ymd.years * 12 + ymd.months; // whole months, remainder = ymd.days
    return {
      totalDays: totalDays,
      totalWeeks: Math.floor(totalDays / 7),
      totalHours: totalDays * 24,
      totalMonths: totalMonths,
      remDaysAfterMonths: ymd.days
    };
  }

  function nextBirthdayDays(birth, ref) {
    var next = new Date(ref.getFullYear(), birth.getMonth(), birth.getDate());
    if (next < ref) next = new Date(ref.getFullYear() + 1, birth.getMonth(), birth.getDate());
    return Math.ceil((next - ref) / 86400000);
  }

  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  /* ---------- Calculator factory ----------
     A page can have a calculator with data-attributes selecting outputs. */
  function initCalculator(form) {
    var dob = form.querySelector("[data-role='dob']");
    var refInput = form.querySelector("[data-role='ref']");
    var gestInput = form.querySelector("[data-role='gestation']");
    var err = form.querySelector("[data-role='error']");
    var result = form.querySelector("[data-role='result']");
    var resetBtn = form.querySelector("[data-role='reset']");
    var copyBtn = form.querySelector("[data-role='copy']");
    var printBtn = form.querySelector("[data-role='print']");
    var shareBtn = form.querySelector("[data-role='share']");

    var elMain = form.querySelector("[data-out='main']");
    var elMonths = form.querySelector("[data-out='months']");
    var elWeeks = form.querySelector("[data-out='weeks']");
    var elDays = form.querySelector("[data-out='days']");
    var elNext = form.querySelector("[data-out='next']");
    var elCorrected = form.querySelector("[data-out='corrected']");

    var lastText = "";

    if (refInput && !refInput.value) refInput.value = todayISO();

    function showError(msg) {
      if (err) { err.textContent = msg; }
      if (result) result.classList.add("hidden");
    }
    function clearError() { if (err) err.textContent = ""; }

    function compute() {
      clearError();
      var birth = parseDate(dob ? dob.value : "");
      if (!birth) { if (result) result.classList.add("hidden"); return; }

      var ref = refInput ? parseDate(refInput.value) : new Date();
      if (!ref) ref = new Date();

      var stripped = new Date();
      stripped.setHours(0, 0, 0, 0);
      if (!refInput) ref = stripped;

      if (birth > ref) {
        showError("Date of birth must be on or before the test date.");
        return;
      }

      var ymd = diffYMD(birth, ref);
      var t = totals(birth, ref);

      var mainText = plural(ymd.years, "year") + ", " + plural(ymd.months, "month") +
                     ", " + plural(ymd.days, "day");
      if (elMain) elMain.textContent = mainText;

      if (elMonths) elMonths.innerHTML = "<b>" + t.totalMonths + "m " + t.remDaysAfterMonths +
                     "d</b><span>Years;Months</span>";
      if (elWeeks) elWeeks.innerHTML = "<b>" + t.totalWeeks.toLocaleString() + "</b><span>Total weeks</span>";
      if (elDays) elDays.innerHTML = "<b>" + t.totalDays.toLocaleString() + "</b><span>Total days</span>";
      if (elNext) {
        var nb = nextBirthdayDays(birth, ref);
        elNext.innerHTML = "<b>" + nb + "</b><span>Days to birthday</span>";
      }

      // Corrected age (premature) — corrected = chronological - (40 - gestWeeks)
      if (elCorrected && gestInput) {
        var gw = Number(gestInput.value);
        if (gw && gw > 0 && gw < 40) {
          var adjustDays = (40 - gw) * 7;
          var correctedRef = new Date(ref.getTime() - adjustDays * 86400000);
          if (correctedRef < birth) correctedRef = birth;
          var cy = diffYMD(birth, correctedRef);
          elCorrected.innerHTML = "<b>" + cy.years + "y " + cy.months + "m " + cy.days +
            "d</b><span>Corrected age</span>";
        } else {
          elCorrected.innerHTML = "<b>" + ymd.years + "y " + ymd.months + "m</b><span>Corrected (full term)</span>";
        }
      }

      lastText = "Chronological age: " + mainText + " (" + t.totalMonths + " months " +
                 t.remDaysAfterMonths + " days, " + t.totalDays + " total days).";

      if (result) result.classList.remove("hidden");
    }

    if (dob) dob.addEventListener("input", compute);
    if (refInput) refInput.addEventListener("input", compute);
    if (gestInput) gestInput.addEventListener("input", compute);
    form.addEventListener("submit", function (e) { e.preventDefault(); compute(); });

    if (resetBtn) resetBtn.addEventListener("click", function () {
      if (dob) dob.value = "";
      if (refInput) refInput.value = todayISO();
      if (gestInput) gestInput.value = "";
      clearError();
      if (result) result.classList.add("hidden");
      if (dob) dob.focus();
    });

    if (copyBtn) copyBtn.addEventListener("click", function () {
      if (!lastText) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastText).then(function () {
          flash(copyBtn, "Copied!");
        });
      }
    });

    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    if (shareBtn) shareBtn.addEventListener("click", function () {
      if (navigator.share) {
        navigator.share({ title: "Chronological Age Calculator", text: lastText, url: location.href })
          .catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(lastText + " " + location.href);
        flash(shareBtn, "Link copied!");
      }
    });

    // Compute on load if DOB prefilled
    compute();
  }

  function flash(btn, msg) {
    var original = btn.getAttribute("data-label") || btn.textContent;
    btn.setAttribute("data-label", original);
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = original; }, 1600);
  }

  /* ---------- Init all calculators on the page ---------- */
  document.querySelectorAll("[data-calc]").forEach(initCalculator);

  /* ---------- Footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
