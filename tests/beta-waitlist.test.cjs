const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "assets/beta-waitlist.js"), "utf8");

test("landing replaces broken contact CTA with a private beta request form", () => {
  assert.match(home, /id="beta-waitlist-form"/);
  assert.match(home, /type="email"[^>]+required/);
  assert.match(home, /type="checkbox"[^>]+required/);
  assert.match(home, /assets\/beta-waitlist\.js/);
  assert.doesNotMatch(home, /href="https:\/\/filmso\.me\/contact\/"[^>]*>Ask for beta access/);
  assert.doesNotMatch(script, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_|service_role/);
});

function harness(reply) {
  let submitHandler;
  const feedback = {
    textContent: "", dataset: {},
    removeAttribute() { delete this.dataset.state; },
  };
  const button = {
    disabled: false, setAttribute() {}, removeAttribute() {},
  };
  const fields = {
    email: { value: "  HELLO@example.com " },
    consent: { checked: true },
    website: { value: "" },
  };
  const form = {
    hidden: false,
    elements: { namedItem: key => fields[key] },
    querySelector: () => button,
    reportValidity: () => true,
    addEventListener: (_type, fn) => { submitHandler = fn; },
  };
  const calls = [];
  const sandbox = {
    document: { getElementById: id => id === "beta-waitlist-form" ? form : feedback },
    fetch: async (url, options) => { calls.push({url, options}); return reply(); },
    Error, JSON,
  };
  vm.runInNewContext(script, sandbox);
  return { submit: () => submitHandler({ preventDefault() {} }), feedback, form, button, calls };
}

test("successful beta request posts email and consent, then confirms", async () => {
  const h = harness(() => ({ ok: true, json: async () => ({ok: true}) }));
  await h.submit();
  assert.equal(h.calls.length, 1);
  const call = h.calls[0];
  assert.match(call.url, /\/functions\/v1\/beta-waitlist$/);
  assert.equal(JSON.parse(call.options.body).email, "HELLO@example.com");
  assert.equal(JSON.parse(call.options.body).consent, true);
  assert.equal(h.form.hidden, true);
  assert.equal(h.feedback.dataset.state, "success");
});

test("failed beta request leaves form visible and allows retry", async () => {
  const h = harness(() => ({ ok: false, json: async () => ({ok: false, error: "Too many requests"}) }));
  await h.submit();
  assert.equal(h.form.hidden, false);
  assert.equal(h.feedback.dataset.state, "error");
  assert.match(h.feedback.textContent, /Too many requests/);
  assert.equal(h.button.disabled, false);
});
