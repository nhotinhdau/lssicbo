const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// 👉 Gắn link API gốc của bạn ở đây
const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1";

let latestResult = null;

// ===== Hàm tính kết quả =====
function getKetQua(d1, d2, d3) {
  // Nếu 3 xúc xắc bằng nhau → Bão
  if (d1 === d2 && d2 === d3) return "Bão";

  const tong = d1 + d2 + d3;
  if (tong >= 4 && tong <= 10) return "Xỉu";
  if (tong >= 11 && tong <= 17) return "Tài";

  return "Không xác định";
}

// ===== Hàm chuẩn hóa dữ liệu từ API gốc =====
function parseData(json) {
  // --- Format 1: SessionId + FirstDice ---
  if (json?.SessionId && json.FirstDice !== undefined) {
    const d1 = json.FirstDice;
    const d2 = json.SecondDice;
    const d3 = json.ThirdDice;
    return {
      Phien: json.SessionId,
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: d1 + d2 + d3,
      Ket_qua: getKetQua(d1, d2, d3)
    };
  }

  // --- Format 2: gameNum + facesList ---
  if (json?.gameNum && Array.isArray(json.facesList)) {
    const [d1, d2, d3] = json.facesList;
    return {
      Phien: json.gameNum.replace("#", ""),
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: d1 + d2 + d3,
      Ket_qua: getKetQua(d1, d2, d3)
    };
  }

  // --- Format 3: Result.OpenCode ---
  if (json?.Result?.OpenCode) {
    const [d1, d2, d3] = json.Result.OpenCode.split(",").map(Number);
    return {
      Phien: json.Result.Issue || "N/A",
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: d1 + d2 + d3,
      Ket_qua: getKetQua(d1, d2, d3)
    };
  }

  return null;
}

// ===== Hàm fetch API gốc =====
async function fetchAPI() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const parsed = parseData(json);
    if (parsed) {
      latestResult = parsed;
      console.log("✅ Phiên mới:", parsed);
    } else {
      console.log("⚠️ Không parse được:", json);
    }
  } catch (err) {
    console.error("❌ Lỗi fetch API:", err.message);
  }
}

// ===== REST API public =====
app.get("/api/taixiu/ws", (req, res) => {
  if (latestResult) {
    res.json(latestResult);
  } else {
    res.status(503).json({ error: "Chưa có dữ liệu" });
  }
});

// ===== Chạy định kỳ 3s fetch 1 lần =====
setInterval(fetchAPI, 3000);

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
