(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header solid state on scroll (sentinel, no scroll listener) ---------- */
  var header = document.querySelector(".site-header");
  var sentinel = document.getElementById("scrollSentinel");
  if (header && sentinel && "IntersectionObserver" in window) {
    var headerIO = new IntersectionObserver(
      function (entries) {
        header.classList.toggle("is-scrolled", !entries[0].isIntersecting);
      },
      { threshold: 0 }
    );
    headerIO.observe(sentinel);
  }

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    revealEls.forEach(function (el) {
      var delay = el.getAttribute("data-reveal-delay");
      if (delay) el.style.setProperty("--reveal-delay", delay + "ms");
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- mobile menu ---------- */
  var menuToggle = document.getElementById("menuToggle");
  var mobileNav = document.getElementById("mobileNav");
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("is-open");
      menuToggle.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("is-open");
        menuToggle.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".accordion-trigger").forEach(function (trigger) {
    var panel = trigger.nextElementSibling;
    trigger.addEventListener("click", function () {
      var isOpen = trigger.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".accordion-trigger").forEach(function (t) {
        if (t !== trigger) {
          t.setAttribute("aria-expanded", "false");
          t.nextElementSibling.style.maxHeight = "0px";
        }
      });

      trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
      panel.style.maxHeight = isOpen ? "0px" : panel.scrollHeight + "px";
    });
  });

  /* ---------- lead form (envia pro backend, que manda WhatsApp) ---------- */
  var leadForm = document.getElementById("leadForm");
  var formFeedback = document.getElementById("formFeedback");
  var WHATSAPP_FALLBACK_LINK =
    '<a href="https://wa.me/5547996550132?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20tenho%20interesse%20em%20aumentar%20as%20minhas%20vendas%20atrav%C3%A9s%20do%20m%C3%A9todo%20TRIAD." target="_blank" rel="noopener">WhatsApp</a>';

  if (leadForm && formFeedback) {
    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var submitBtn = leadForm.querySelector(".form-submit");
      var originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Enviando...";
      }
      formFeedback.textContent = "";

      var data = Object.fromEntries(new FormData(leadForm).entries());

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("request_failed");
          return res.json();
        })
        .then(function () {
          leadForm.reset();
          formFeedback.innerHTML =
            "Recebemos seus dados! Já te chamamos no WhatsApp pra marcar a reunião.";
        })
        .catch(function () {
          formFeedback.innerHTML =
            "Não conseguimos enviar agora. Fala com a gente direto no " +
            WHATSAPP_FALLBACK_LINK +
            ".";
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          }
        });
    });
  }
})();
