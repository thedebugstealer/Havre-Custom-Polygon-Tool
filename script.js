let zoom = 1;

let lastValidRaw = localStorage.getItem("lastRaw") || "";
let lastValidConverted = localStorage.getItem("lastConverted") || "";

// Load cached mode
let drawMode = localStorage.getItem("drawMode") || "polygon";

// Switch elements
const modeToggle = document.getElementById("modeToggle");
const modeLabel = document.getElementById("modeLabel");

// Apply saved mode to switch
modeToggle.checked = (drawMode === "line");
modeLabel.textContent = drawMode === "line" ? "Line" : "Polygon";

// Switch behavior
modeToggle.addEventListener("change", () => {
  drawMode = modeToggle.checked ? "line" : "polygon";
  modeLabel.textContent = drawMode === "line" ? "Line" : "Polygon";

  localStorage.setItem("drawMode", drawMode);

  const raw = document.getElementById("in").value.trim();
  if (raw !== "") {
    drawPreview(parseCoordinates(raw), drawMode);
  }
});

function convert() {
  const raw = document.getElementById("in").value.trim();

  // Strip spaces before validating
  const cleaned = raw.replace(/\s+/g, "");

  if (!/^[0-9().,\-]+$/.test(cleaned)) {
    document.getElementById("out").value =
      "yo we can't use what you put in the input";

    if (lastValidRaw !== "") {
      drawPreview(parseCoordinates(lastValidRaw), drawMode);
    }
    return;
  }

  if (!raw) {
    document.getElementById("out").value = "";
    return;
  }

  let result = "";

  // --- NEW FORMAT: 1,2,3,4 ---
  if (!raw.includes("(")) {
    const nums = cleaned.split(",");
    const out = [];
    for (let i = 0; i < nums.length; i += 2) {
      out.push(`${nums[i + 1]},${nums[i]}`);
    }
    result = out.join(";");
  }

  // --- OLD FORMAT: (1,2),(3,4),(5,6) ---
  else {
    const pairs = raw.split("),").map(p => p.replace(/[()]/g, "").trim());
    result = pairs.map(pair => {
      const [x, y] = pair.split(",");
      return `${y},${x}`;
    }).join(";");
  }

  // ⭐ SPECIAL LINE-MODE MIRROR BEHAVIOR
  if (drawMode === "line") {
    const parts = result.split(";");
    const reversed = parts.slice(0, -1).reverse(); // skip last to avoid duplicate peak
    result = parts.concat(reversed).join(";");
  }

  // Cache AFTER result exists
  localStorage.setItem("lastRaw", raw);
  localStorage.setItem("lastConverted", result);

  document.getElementById("out").value = result;
  drawPreview(parseCoordinates(raw), drawMode);
}

function restoreLast() {
  if (!lastValidRaw) {
    document.getElementById("out").value = "no cached input to restore";
    return;
  }

  document.getElementById("in").value = lastValidRaw;
  document.getElementById("out").value = lastValidConverted;

  drawPreview(parseCoordinates(lastValidRaw), drawMode);
}

function parseCoordinates(raw) {
  // Remove invisible Unicode garbage
  raw = raw.replace(/[\u200B-\u200D\uFEFF]/g, "");

  const cleaned = raw.replace(/\s+/g, "");

  // Tokenize first (works for both formats)
  const tokens = cleaned
    .split(",")
    .map(t => t.trim().replace(/[()]/g, ""))
    .filter(t => t.length > 0);

  // --- NEW FORMAT: 1,2,3,4 ---
  if (!cleaned.includes("(") && tokens.length % 2 === 0) {
    const nums = tokens.map(Number);

    const coords = [];
    for (let i = 0; i < nums.length; i += 2) {
      coords.push({ x: nums[i], y: nums[i + 1] });
    }
    return coords;
  }

  // --- OLD FORMAT ---
  const pairs = cleaned
    .split("),")
    .map(p => p.replace(/[()]/g, "").trim());

  return pairs
    .map(pair => {
      const parts = pair.split(",").map(n => n.trim());
      if (parts.length !== 2) return null;

      const nx = Number(parts[0]);
      const ny = Number(parts[1]);

      if (Number.isNaN(nx) || Number.isNaN(ny)) return null;
      return { x: nx, y: ny };
    })
    .filter(p => p !== null);
}

function drawPreview(coords, mode) {
  const canvas = document.getElementById("preview");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#0f0";
  ctx.lineWidth = 2;

  if (coords.length < 2) return;

  const offsetX = canvas.width / 2;
  const offsetY = canvas.height / 2;

  const avgX = coords.reduce((a, p) => a + p.x, 0) / coords.length;
  const avgY = coords.reduce((a, p) => a + p.y, 0) / coords.length;

  // ⭐ AUTO-SCALE TINY SHAPES
  const xs = coords.map(p => p.x);
  const ys = coords.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;

  let autoScale = 1;
  const smallest = Math.max(width, height);

  if (smallest < 1) {
    autoScale = 1 / smallest;
  }

  ctx.beginPath();

  ctx.moveTo(
    ((coords[0].x - avgX) * zoom * autoScale) + offsetX,
    ((coords[0].y - avgY) * zoom * autoScale) + offsetY
  );

  for (let i = 1; i < coords.length; i++) {
    ctx.lineTo(
      ((coords[i].x - avgX) * zoom * autoScale) + offsetX,
      ((coords[i].y - avgY) * zoom * autoScale) + offsetY
    );
  }

  if (mode === "polygon") {
    ctx.lineTo(
      ((coords[0].x - avgX) * zoom * autoScale) + offsetX,
      ((coords[0].y - avgY) * zoom * autoScale) + offsetY
    );
  }

  ctx.stroke();
}

// Zoom slider
document.getElementById("zoomSlider").oninput = (e) => {
  zoom = Number(e.target.value);
  drawPreview(parseCoordinates(document.getElementById("in").value), drawMode);
};
