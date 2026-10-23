const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "devices.json");
const execFileAsync = promisify(execFile);

app.use(express.json());
app.use(express.static(__dirname));

function readDevices() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveDevices(devices) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(devices, null, 2));
}

function validIPv4(ip) {
  const parts = String(ip).trim().split(".");
  return parts.length === 4 && parts.every(p => {
    if (!/^\d+$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

app.get("/api/devices", (req, res) => {
  res.json(readDevices());
});

app.post("/api/devices", (req, res) => {
  const name = String(req.body.name || "").trim();
  const ip = String(req.body.ip || "").trim();

  if (!name || !ip) {
    return res.status(400).json({ error: "Device name and IP address are required." });
  }

  if (!validIPv4(ip)) {
    return res.status(400).json({ error: "Please enter a valid IPv4 address." });
  }

  const devices = readDevices();

  if (devices.some(d => d.ip === ip)) {
    return res.status(409).json({ error: "A device with this IP already exists." });
  }

  devices.push({ name, ip });
  saveDevices(devices);

  res.status(201).json({ message: "Device added successfully." });
});

app.delete("/api/devices", (req, res) => {
  const ip = String(req.query.ip || "").trim();
  const devices = readDevices();
  const filtered = devices.filter(d => d.ip !== ip);

  if (filtered.length === devices.length) {
    return res.status(404).json({ error: "Device not found." });
  }

  saveDevices(filtered);
  res.json({ message: "Device deleted successfully." });
});

app.post("/api/ping", async (req, res) => {
  const ip = String(req.query.ip || "").trim();

  if (!validIPv4(ip)) {
    return res.status(400).json({ status: "Offline", latency: "-" });
  }

  const isWindows = process.platform === "win32";
  const args = isWindows ? ["-n", "1", "-w", "1000", ip] : ["-c", "1", "-W", "1", ip];

  const start = Date.now();

  try {
    await execFileAsync(isWindows ? "ping.exe" : "ping", args, { timeout: 3000 });
    const latency = Date.now() - start;
    res.json({ status: "Online", latency });
  } catch {
    res.json({ status: "Offline", latency: "-" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Network Monitoring System running at http://localhost:${PORT}`);
});
