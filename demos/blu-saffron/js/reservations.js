/* ============================================================
   Blu Saffron — reservation handling
   Opens WhatsApp to +27123460223 with a prefilled booking message,
   and simulates an email confirmation.
   ============================================================ */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "27123460223"; // international format, no + or spaces
  var form = document.getElementById("reservation-form");
  if (!form) return;

  var toast = document.getElementById("toast");

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 5000);
  }

  function val(name) {
    var el = form.elements[name];
    return el ? String(el.value || "").trim() : "";
  }

  function buildMessage() {
    var lines = [
      "Hi Blu Saffron, I would like to reserve a table.",
      "Name: " + val("name"),
      "Date: " + val("date"),
      "Time: " + val("time"),
      "Guests: " + val("guests"),
      "Phone: " + val("phone")
    ];

    var occasion = val("occasion");
    if (occasion) lines.push("Occasion: " + occasion);

    var email = val("email");
    if (email) lines.push("Email: " + email);

    var requests = val("requests");
    if (requests) lines.push("Special requests: " + requests);

    return lines.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var message = buildMessage();
    var url =
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);

    // Email simulation — in a live deployment this would POST to a mail service.
    try {
      console.info("[Blu Saffron] Reservation request (email simulation):\n" + message);
    } catch (err) { /* no-op */ }

    showToast("Opening WhatsApp to send your booking… We'll confirm by phone or WhatsApp.");

    // Open WhatsApp shortly after so the toast is visible.
    window.setTimeout(function () {
      window.open(url, "_blank", "noopener");
    }, 600);
  });

  /* Prevent picking a date in the past */
  var dateField = form.elements["date"];
  if (dateField) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, "0");
    var dd = String(today.getDate()).padStart(2, "0");
    dateField.min = yyyy + "-" + mm + "-" + dd;
  }
})();
