require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors    = require("cors");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ── Plaid client setup ────────────────────────────────────────
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.REACT_APP_PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.REACT_APP_PLAID_CLIENT_ID,
      "PLAID-SECRET":    process.env.REACT_APP_PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

// Store access tokens in memory for now (use a DB in production)
const accessTokens = {};

// ── Step 1: Create a Link Token ───────────────────────────────
// Frontend calls this to open the Plaid Link UI
app.post("/api/plaid/create-link-token", async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "user-001" },
      client_name: "SpendTracker",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Link token error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

// ── Step 2: Exchange Public Token ─────────────────────────────
// Called after user connects their bank in the Plaid Link UI
app.post("/api/plaid/exchange-token", async (req, res) => {
  const { public_token } = req.body;
  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;
    // Store it (use a real DB in production)
    accessTokens["user-001"] = access_token;
    console.log("✅ Access token saved");
    res.json({ success: true });
  } catch (err) {
    console.error("Token exchange error:", err.response?.data || err.message);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// ── Step 3: Get Transactions ──────────────────────────────────
app.get("/api/plaid/transactions", async (req, res) => {
  const access_token = accessTokens["user-001"];
  if (!access_token) return res.status(400).json({ error: "No bank connected" });

  const endDate   = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 365*24*60*60*1000).toISOString().split("T")[0];

  try {
    const response = await plaidClient.transactionsGet({
      access_token,
      start_date: startDate,
      end_date:   endDate,
      options: { count: 500 },
    });
    res.json(response.data.transactions);
  } catch (err) {
    console.error("Transactions error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ── Step 4: Get Account Balances ──────────────────────────────
app.get("/api/plaid/accounts", async (req, res) => {
  const access_token = accessTokens["user-001"];
  if (!access_token) return res.status(400).json({ error: "No bank connected" });

  try {
    const response = await plaidClient.accountsGet({ access_token });
    res.json(response.data.accounts);
  } catch (err) {
    console.error("Accounts error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Plaid server running on port ${PORT}`));