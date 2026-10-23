const API = "/api";
let devices = [];
let states = {};

async function loadDevices() {
  try {
    const res = await fetch(`${API}/devices`);
    if (!res.ok) throw new Error("Server error");
    devices = await res.json();
    render();
  } catch (e) {
    showMessage("Cannot connect to server. Start Node.js with: npm start", "crimson");
  }
}

function render() {
  const table = document.getElementById("deviceTable");
  table.innerHTML = "";

  let online = 0, offline = 0;

  devices.forEach((d) => {
    const state = states[d.ip] || { status: "Not checked", latency: "-" };
    if (state.status === "Online") online++;
    if (state.status === "Offline") offline++;

    const tr = document.createElement("tr");
    const cls = state.status === "Online" ? "online" :
                state.status === "Offline" ? "offline" : "unknown";

    tr.innerHTML = `
      <td>${escapeHtml(d.name)}</td>
      <td>${escapeHtml(d.ip)}</td>
      <td><span class="status ${cls}">${escapeHtml(state.status)}</span></td>
      <td>${state.latency === "-" ? "-" : escapeHtml(String(state.latency)) + " ms"}</td>
      <td>
        <button class="small-btn" onclick="checkDevice('${escapeAttr(d.ip)}')">Check</button>
        <button class="small-btn delete" onclick="deleteDevice('${escapeAttr(d.ip)}')">Delete</button>
      </td>
    `;
    table.appendChild(tr);
  });

  document.getElementById("total").textContent = devices.length;
  document.getElementById("online").textContent = online;
  document.getElementById("offline").textContent = offline;
}

async function checkDevice(ip) {
  try {
    const res = await fetch(`${API}/ping?ip=${encodeURIComponent(ip)}`, { method: "POST" });
    const data = await res.json();
    states[ip] = { status: data.status, latency: data.latency };
    render();
  } catch (e) {
    states[ip] = { status: "Offline", latency: "-" };
    render();
  }
}

async function monitorAll() {
  const btn = document.getElementById("monitorAllBtn");
  btn.disabled = true;
  btn.textContent = "Checking...";

  for (const d of devices) {
    await checkDevice(d.ip);
  }

  btn.disabled = false;
  btn.textContent = "Monitor All";
}

async function deleteDevice(ip) {
  if (!confirm("Remove this device?")) return;

  try {
    const res = await fetch(`${API}/devices?ip=${encodeURIComponent(ip)}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || "Could not delete device", "crimson");
      return;
    }

    delete states[ip];
    showMessage("Device deleted successfully.", "green");
    await loadDevices();
  } catch (e) {
    showMessage("Server connection failed.", "crimson");
  }
}

document.getElementById("deviceForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const ip = document.getElementById("ip").value.trim();

  try {
    const res = await fetch(`${API}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ip })
    });

    const data = await res.json();
    showMessage(data.message || data.error || "", res.ok ? "green" : "crimson");

    if (res.ok) {
      e.target.reset();
      await loadDevices();
    }
  } catch (e) {
    showMessage("Cannot connect to server. Make sure it is running.", "crimson");
  }
});

document.getElementById("refreshBtn").addEventListener("click", loadDevices);
document.getElementById("monitorAllBtn").addEventListener("click", monitorAll);

function showMessage(text, color) {
  const msg = document.getElementById("message");
  msg.textContent = text;
  msg.style.color = color;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function escapeAttr(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

loadDevices();
