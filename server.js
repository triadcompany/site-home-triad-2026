"use strict";

const express = require("express");
const compression = require("compression");
const path = require("path");

const app = express();
const PUBLIC_DIR = path.join(__dirname, "public");

const EVOLUTION_BASE_URL =
  process.env.EVOLUTION_BASE_URL || "https://triadcompany-evolution-api.upw28y.easypanel.host";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "drive";
const LEAD_WHATSAPP_NUMBER = process.env.LEAD_WHATSAPP_NUMBER || "5547996550132";

const VOLUME_LABELS = {
  "ate-10": "Até 10 vendas/mês",
  "11-30": "11 a 30 vendas/mês",
  "31-60": "31 a 60 vendas/mês",
  "mais-60": "Mais de 60 vendas/mês",
};
const ORCAMENTO_LABELS = {
  nenhum: "Ainda não investe",
  "ate-3k": "Até R$ 3 mil/mês",
  "3k-10k": "R$ 3 mil a R$ 10 mil/mês",
  "mais-10k": "Mais de R$ 10 mil/mês",
};

// Evolution API/WhatsApp: alguns números BR falham silenciosamente com o
// 9º dígito presente. Normaliza pra 55 + DDD + 8 dígitos antes de enviar.
function toEvolutionNumber(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = "55" + digits;
  const ddd = digits.slice(2, 4);
  let rest = digits.slice(4);
  if (rest.length === 9 && rest[0] === "9") rest = rest.slice(1);
  return "55" + ddd + rest;
}

app.use(compression());
app.use(express.json());

app.use(
  express.static(PUBLIC_DIR, {
    index: "index.html",
    setHeaders(res, filePath) {
      if (/\.(?:jpg|jpeg|png|svg|webp)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=604800");
      } else if (/\.(?:html|css|js)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.post("/api/lead", async (req, res) => {
  const body = req.body || {};
  const { nome, empresa, cidade, volume, orcamento, whatsapp } = body;

  if (!nome || !empresa || !cidade || !volume || !orcamento || !whatsapp) {
    return res.status(400).json({ ok: false, error: "missing_fields" });
  }
  if (!EVOLUTION_API_KEY) {
    console.error("EVOLUTION_API_KEY não configurada no ambiente.");
    return res.status(500).json({ ok: false, error: "server_not_configured" });
  }

  const text = [
    "📩 *Novo lead do site institucional*",
    "",
    `*Nome:* ${nome}`,
    `*Empresa:* ${empresa}`,
    `*Cidade:* ${cidade}`,
    `*Volume de vendas:* ${VOLUME_LABELS[volume] || volume}`,
    `*Orçamento de mídia:* ${ORCAMENTO_LABELS[orcamento] || orcamento}`,
    `*WhatsApp do lead:* ${whatsapp}`,
  ].join("\n");

  try {
    const resp = await fetch(
      `${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: toEvolutionNumber(LEAD_WHATSAPP_NUMBER), text }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Evolution API respondeu com erro:", resp.status, errText);
      return res.status(502).json({ ok: false, error: "whatsapp_send_failed" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Falha ao enviar lead pro WhatsApp:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
