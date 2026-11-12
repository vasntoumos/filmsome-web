(() => {
  const form = document.getElementById("beta-waitlist-form");
  const feedback = document.getElementById("beta-feedback");
  if (!form || !feedback) return;
  const button = form.querySelector('button[type="submit"]');
  const endpoint = "https://aaxkcatrdchkjtcniyev.supabase.co/functions/v1/beta-waitlist";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || button.disabled) return;
    const email = form.elements.namedItem("email").value.trim();
    const consent = form.elements.namedItem("consent").checked;
    const website = form.elements.namedItem("website").value;
    feedback.textContent = "";
    feedback.removeAttribute("data-state");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, website }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(typeof result.error === "string" ? result.error : "Please try again shortly.");
      }
      form.hidden = true;
      feedback.dataset.state = "success";
      feedback.textContent = "you're on the list! If a beta spot opens up, we'll contact you by email.";
    } catch (error) {
      feedback.dataset.state = "error";
      feedback.textContent = error instanceof Error ? error.message : "Please try again shortly.";
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
})();
