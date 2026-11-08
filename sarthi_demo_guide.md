# Sarthi: End-to-End Compliance & Demo Guide

This guide provides a comprehensive domain overview of Corporate Social Responsibility (CSR), Sarthi's multi-agent system architecture, the purpose of the cryptographic ledger, and a step-by-step walkthrough script for product demonstrations.

---

## 🏢 Section 1: The Business Domain & Compliance (The "Why")

### 1. What is Corporate Social Responsibility (CSR)?
In India, under **Section 135 of the Companies Act, 2013**, corporations exceeding specific thresholds of net worth, turnover, or net profit must spend **at least 2% of their average net profits** on social development programs.

* **Schedule VII Directives**: The government strictly limits this expenditure to areas defined under Schedule VII (e.g., skill development, education, environmental sustainability, healthcare, sanitation).
* **Business Challenge**: Field workers executing these programs in remote villages log details via physical registers or messaging apps. This introduces data entry lag, errors, lack of verification, and budget leakage.
* **Audit Pressures**: Under **BRSR (Business Responsibility and Sustainability Reporting)** mandates, corporate boards must submit verifiable, audit-proof data linking their expenditures to social impact metrics.

### 2. The Role of Project Budgets
Corporates register **Projects** mapped to Schedule VII clauses with allocated locations (e.g., *"Bicholi Village"*) and total budgets. Expenditures logged by field agents must map to these projects to decrement unspent balances and track program burn rates.

### 3. Why Cryptographic Hashing is Necessary
To guarantee that data is tamper-proof for government auditors:
* Each approved entry is converted into structured JSON.
* A SHA-256 **immutable block hash** is calculated, incorporating the current entry details and linking to the previous block's hash.
* If database records are retroactively modified (e.g., inflating beneficiary counts or altering costs), the hashes break, indicating a compliance compromise.

---

## 🤖 Section 2: Technical Architecture (The "How")

Sarthi uses a **multi-agent orchestration pipeline** that triggers upon voice upload:

```
[Hindi Voice Ingest] 
      │
      ▼
 1. Riva STT (Converts spoken audio to Hindi text fallback)
      │
      ▼
 2. Voice Intake Agent (NIM LLM extracts JSON: counts, activities, locations, blockers)
      │
      ▼
 3. Insight Agent (RAG: checks geo-tag boundaries, budget overruns, attendance stats)
      │
      ▼
 4. Report Agent (Drafts Weekly NGO Reports and Board Annexures + runs Guardrail correction)
      │
      ▼
 5. Human Approval Gate (NGO Manager reviews, edits, and approves)
      │
      ▼
 6. Compliance Agent (Maps to UN SDGs, logs to BRSR indicators, seals block hash)
```

---

## 🎬 Section 3: Step-by-Step Demo Script (The Pitch)

Follow this lifecycle flow to show a complete, end-to-end product loop:

### Step 1: Corporate Registers a Program
1. Open the **Menu** in the top-right navbar drawer and click **Corporate Head Ledger**.
2. Scroll to the *"Register CSR Program"* form:
   * **Project Title**: `Rural Coding Academy`
   * **MCA Clause**: `Clause (ii) Education and Livelihoods`
   * **Total Budget (INR)**: `300000`
   * **Target Location**: `Jaipur`
3. Click **Register Program**. Confirm the project is tracked under the *"Program Budget Trackers"* panel at $0\%$ spent.

### Step 2: Field Worker Ingests Progress
1. Open the **Menu** drawer and select **Field Worker Ingest Gate**.
2. Set the *"Target CSR Project"* selector to `Rural Coding Academy (Jaipur)`.
3. Click the large **Record Voice Ingest** button in the center of the hero. The 3D perspective modal workspace will pop up.
4. Click **Simulate Hindi Voice Note**. Sarthi will transcribe the simulated recording and trigger the pipeline.
5. Watch the **Horizontal connected pipeline** highlight card-by-card. 
6. Click the **Insight Agent** card to view the budget checks. Click **Close Workspace**.

### Step 3: NGO Manager Approves
1. Open the **Menu** drawer and select **NGO Manager Review**.
2. Select the latest pending log from the sidebar queue.
3. Review the extracted beneficiary counts, activities, and geo-tag boundaries.
4. Note that the **Report Agent** auto-drafted markdown reports and that the **Guardrails** automatically verified correctness against the voice transcript.
5. Click **Approve & Sign Ledger**. A success popup will confirm: `Ledger Sealed Successfully! Status: COMMITTED`.

### Step 4: Immutable Audit Verification
1. Open the **Menu** drawer and select **Corporate Head Ledger**.
2. Inspect the **Immutable Evidence Ledger** table. The signed block will show up with a unique block hash, mapped SDG goals, and BRSR principle compliance indicators.
3. Check the **Program Budget Trackers** bar. It will reflect the newly deducted spent expenditure (e.g. Spent INR 60,000 / Budget INR 300,000).
4. Click **Text** or **HTML** to download the completed, audit-ready compliance package.
