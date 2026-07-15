// ============================================================
// shared.js — GitHub AI 组合技验证器 共享函数库
// 被 index.html / editor.html / daily.html 三个页面共同引用
// ============================================================

// ---- 基础工具 ----

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---- 公开页面用语 ----
// 后台保留 L0-L3、runner、handoff 等精确协议；公开页只呈现用户需要的结论。

function publicText(value) {
  return String(value || "")
    .replace(/本地\s*AI\s*(?:full[- ]|declarative[- ])?runtime\s*/gi, "本地 AI 助手")
    .replace(/L3-caveat/gi, "实测通过，但有使用限制")
    .replace(/L2-caveat/gi, "基础测试通过，但有使用限制")
    .replace(/\bL3\b/gi, "完整流程已跑通")
    .replace(/\bL2\b/gi, "基础能力已确认")
    .replace(/\bL1\b/gi, "可以安装运行")
    .replace(/\bL0\b/gi, "尚未实测")
    .replace(/deep[- ]rerun|\brerun\b/gi, "重新完整测试")
    .replace(/worker[- ]smoke|\bsmoke(?:[- ]test)?\b/gi, "小样本测试")
    .replace(/full[- ]runtime|declarative[- ]runtime|\bruntime\b/gi, "实际运行环境")
    .replace(/production[- ]upgrade|生产化补齐/gi, "长期使用完善")
    .replace(/生产化组合|生产级组合/g, "可长期使用的方案")
    .replace(/生产化/g, "长期使用")
    .replace(/可跑通样例/g, "已经跑通的样例")
    .replace(/可复测、可解释、可维护/g, "能够稳定重跑、说明结果并持续维护")
    .replace(/运行\s*(?:deep[- ]rerun|重新完整测试)|重新完整测试/gi, "用同样样本重新跑一遍完整流程")
    .replace(/固定输入输出/g, "固定测试样本和最终产物")
    .replace(/进入证据中心|进入实测档案/g, "保存完整实测记录")
    .replace(/定期复测/g, "定期重新确认是否仍然可用")
    .replace(/\bproduction\b/gi, "长期使用")
    .replace(/\bhandoff\b|交接断言/gi, "结果交接")
    .replace(/\boutcome\b/gi, "最终结果")
    .replace(/\bassertions?\b/gi, "检查项")
    .replace(/\brunners?\b/gi, "自动测试程序")
    .replace(/\bpipelines?\b/gi, "流程")
    .replace(/\bcaveats?\b/gi, "使用限制")
    .replace(/证据中心/g, "实测档案")
    .replace(/在公开发布流程\/实测档案问题中/g, "在整理和发布实测资料时")
    .replace(/LLM\s*可读上下文/gi, "AI 能读取的内容")
    .replace(/\bASR\b\s*字幕/gi, "语音识别生成字幕")
    .replace(/\bASR\b/gi, "语音识别")
    .replace(new RegExp(["发布", "闸门"].join(""), "g"), "公开发布流程")
    .replace(/published\.json|combo-records\.json/gi, "公开实测记录")
    .replace(/\bfirecrawl\b/gi, "Firecrawl")
    .replace(/\bheadroom\b/gi, "Headroom")
    .replace(/\bnocodb\b/gi, "NocoDB")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function publicTestStatusLabel(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("l3") && raw.includes("caveat")) return "实测通过 · 有使用限制";
  if (raw === "l3" || raw.includes("passed")) return "实测通过";
  if (raw.includes("l2") && raw.includes("caveat")) return "基础测试通过 · 有使用限制";
  if (raw.includes("l2")) return "基础测试通过";
  if (raw.includes("l1")) return "可以安装运行";
  return "尚未实测";
}

function publicSetupDifficultyLabel(item) {
  const friction = item?.installFrictionIndex || {};
  const score = Number(friction.score ?? 100);
  if (score <= 35) return "容易上手";
  if (score <= 59) return "需要一些配置";
  return "配置和维护较多";
}

function publicTaskLabel(value) {
  const labels = {
    "测试": "质量检查",
    "交付": "结果交付",
    "采集": "资料获取",
    "存储": "资料保存",
    "编排": "流程自动化",
    "部署": "安装部署",
  };
  return labels[String(value || "")] || String(value || "");
}

function normalize(text) {
  return String(text || "").toLowerCase();
}

function includesAny(text, words) {
  return words.some(word => text.includes(word));
}

function inferNameFromUrl(url) {
  const match = String(url || "").match(/github\.com\/[^/]+\/([^/#?]+)/i);
  return match ? decodeURIComponent(match[1]).replace(/\.git$/, "") : "";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function downloadJson(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ============================================================
// 评分规则加载（从 JSON 加载，与 Python 共用同一数据源）
// ============================================================

let _SCORING_RULES = null;

async function loadScoringRules() {
  if (_SCORING_RULES) return _SCORING_RULES;
  try {
    const resp = await fetch("scoring-rules.json");
    if (resp.ok) {
      _SCORING_RULES = await resp.json();
      // 同时加载证据等级到独立缓存，避免重复请求
      await loadEvidenceLevels();
      return _SCORING_RULES;
    }
  } catch (e) {
    console.warn("加载 scoring-rules.json 失败，使用内联默认值", e);
  }
  return null;
}

function getScoringRules() {
  return _SCORING_RULES;
}

function getFiveDimWeights() {
  const rules = _SCORING_RULES;
  if (rules && rules.fiveDimWeights) return rules.fiveDimWeights;
  return {
    "代码活跃度": 0.25,
    "项目健康度": 0.20,
    "社区真实性": 0.20,
    "可安装性": 0.20,
    "功能声称": 0.15,
  };
}

function getCandidateScoreRules() {
  const rules = _SCORING_RULES;
  if (rules && rules.candidateScoreRules) return rules.candidateScoreRules;
  return [
    { name: "输入输出清晰", strong: ["input", "output", "markdown", "json", "api", "输入", "输出"], weak: ["pdf", "url", "text", "csv", "html", "diff"] },
    { name: "可接入性", strong: ["cli", "api", "sdk", "docker", "mcp", "webhook"], weak: ["pip install", "npm install", "uvx", "github action"] },
    { name: "文档证据", strong: ["quickstart", "installation", "usage", "example", "demo"], weak: ["readme", "docs", "sample", "getting started"] },
    { name: "组合潜力", strong: ["markdown", "json", "api", "webhook", "openapi", "mcp"], weak: ["rag", "workflow", "agent", "pipeline", "knowledge"] },
    { name: "重复任务价值", strong: ["monitor", "batch", "automation", "workflow", "pipeline", "daily"], weak: ["report", "review", "support", "research", "knowledge", "客服", "日报", "监控"] },
  ];
}

function getFormatCompatibility() {
  const rules = _SCORING_RULES;
  if (rules && rules.formatCompatibility) return rules.formatCompatibility;
  return {
    softGroups: [
      ["markdown", "text", "html", "pdf"],
      ["json", "api", "webhook", "openapi"],
      ["cli", "docker", "mcp"],
      ["csv", "sqlite", "postgres"],
    ],
    formatSpecificity: {
      pdf: 3, image: 3, audio: 3, video: 3, docx: 3, odt: 3,
      markdown: 2, html: 2, csv: 2, sqlite: 2, diff: 2, code: 2,
      url: 2, browser: 2, notion: 2, obsidian: 2,
      json: 1, text: 1, api: 1, webhook: 1, cli: 1, openapi: 1,
      mcp: 1, docker: 1, github: 1,
      postgres: 3,
    },
    tooGenericFormats: ["json", "text", "api", "webhook", "openapi"],
  };
}

// ---- 候选工具评分核心 ----

function scoreFromSignals(text, strongSignals, weakSignals) {
  const strong = strongSignals.filter(signal => text.includes(signal)).length;
  const weak = weakSignals.filter(signal => text.includes(signal)).length;
  return Math.min(100, 38 + strong * 16 + weak * 8);
}

function inferRole(text) {
  // 采集/输入：从外部拿数据。不放 pdf/extract/parse，这些是格式转换，不是采集。
  if (includesAny(text, ["crawl", "scrape", "scraper", "spider", "browser", "fetch", "ingest", "monitor", "watcher", "ocr", "github api", "采集", "抓取"])) return "采集/输入";
  // 存储/检索：向量索引、RAG、语义检索。不放 search/knowledge/query，太泛。
  if (includesAny(text, ["rag", "retrieval", "retriever", "vector store", "vector db", "faiss", "chroma", "embedding", "milvus", "pinecone", "weaviate", "qdrant"])) return "存储/检索";
  // 自动执行：agent、自动化管线
  if (includesAny(text, ["agent", "automation", "workflow", "github action", "ci/cd", "bot", "自动"])) return "自动执行";
  // 输出/交付：界面、通知、发布。webhook 留在这是对的（通知型工具），但采集型工具也可能有 webhook，
  // 靠排在采集/输入之后来保证采集优先。
  if (includesAny(text, ["ui", "dashboard", "chatbot", "web app", "publish", "notification", "notify", "alert", "notifier", "slack", "telegram", "webhook", "发布", "界面"])) return "输出/交付";
  return "处理/理解";
}

function candidateRecommendation(score) {
  if (score >= 85) return "优先进入组合验证";
  if (score >= 70) return "进入候选池";
  if (score >= 55) return "保留观察";
  return "暂不收录";
}

function inferSignals(text) {
  const signalMap = [
    ["markdown", "Markdown 输出"],
    ["json", "JSON 输出"],
    ["api", "API 可接入"],
    ["cli", "CLI 可接入"],
    ["docker", "Docker 部署"],
    ["mcp", "MCP 接入"],
    ["webhook", "Webhook"],
    ["pdf", "PDF 处理"],
    ["rag", "RAG"],
    ["github action", "GitHub Action"],
    ["demo", "Demo"],
    ["example", "示例"]
  ];
  return signalMap.filter(([needle]) => text.includes(needle)).map(([, label]) => label).slice(0, 6);
}

function inferBestWith(role, text) {
  if (role === "采集/输入") return includesAny(text, ["pdf", "ocr"]) ? ["LlamaIndex", "Dify"] : ["LlamaIndex", "Open WebUI"];
  if (role === "处理/理解") return ["Firecrawl", "Open WebUI"];
  if (role === "自动执行") return ["GitHub Actions", "Dify"];
  return ["LlamaIndex", "OpenAI-compatible API"];
}

// ============================================================
// 多维评估引擎（与 discover.py 对齐）
// ============================================================
// 权重和规则从 scoring-rules.json 加载。
// JS 端无法调用 GitHub API，因此对无 health
// 数据的手动录入候选，降级为 README-only 并标记。

function scoreCandidateBreakdown(text, health, installable) {
  const rules = getCandidateScoreRules();
  // 维度5: 功能声称（README 关键词）
  const claimsBreakdown = {};
  rules.forEach(rule => {
    claimsBreakdown[rule.name] = scoreFromSignals(text, rule.strong, rule.weak);
  });
  const claims = Math.round(
    claimsBreakdown["输入输出清晰"] * 0.35 +
    claimsBreakdown["可接入性"] * 0.20 +
    claimsBreakdown["文档证据"] * 0.20 +
    claimsBreakdown["组合潜力"] * 0.15 +
    claimsBreakdown["重复任务价值"] * 0.10
  );

  // 如果有客观数据，计算完整五维
  if (health && installable) {
    return _fullFiveDimBreakdown(claims, claimsBreakdown, health, installable);
  }

  // 手动录入：只有功能声称，其他维度填充默认值并标记
  const result = {
    "功能声称": claims,
    "代码活跃度": 0,
    "项目健康度": 30,
    "社区真实性": 0,
    "可安装性": 20,
  };
  Object.assign(result, claimsBreakdown);
  result._source = "readme-only";
  return result;
}

function _fullFiveDimBreakdown(claims, claimsBreakdown, health, installable) {
  // 维度1: 代码活跃度 — 最近推送天数
  const days = health.days_since_push ?? 999;
  let activity;
  if (days <= 3) activity = 95;
  else if (days <= 14) activity = 85;
  else if (days <= 60) activity = 65;
  else if (days <= 180) activity = 45;
  else activity = 20;

  // 维度2: 项目健康度 — LICENSE + 归档 + 最近推送
  let maintenance = 40;
  if (health.license) maintenance += 20;
  if (health.archived) maintenance -= 30;
  if (days <= 7) maintenance += 25;
  else if (days <= 30) maintenance += 20;
  else if (days <= 90) maintenance += 10;
  else if (days > 365) maintenance -= 20;
  maintenance = Math.min(100, Math.max(0, maintenance));

  // 维度3: 社区真实性 — Star/Fork比 + Star/Issue比（反虚荣）
  let community = 50;
  const sf = health.star_fork_ratio ?? 0;
  const si = health.star_issue_ratio ?? 0;
  if (sf >= 5 && sf <= 15) community += 25;
  else if (sf < 5) community += 15;
  else community -= 10;
  if (si >= 50 && si <= 200) community += 25;
  else if (si < 50) community += 10;
  else community -= 15;
  community = Math.min(100, Math.max(0, community));

  // 维度4: 可安装性 — pip/npm + 重量
  let install = 20;
  const onPM = installable.pypi || installable.npm;
  const weight = installable.weight || "未知";
  if (!onPM) install = 25;
  else if (weight === "轻量") install = installable.has_wheel ? 95 : 85;
  else if (weight === "中量") install = installable.has_wheel ? 75 : 65;
  else install = 55;

  return {
    "代码活跃度": activity,
    "项目健康度": maintenance,
    "社区真实性": community,
    "可安装性": install,
    "功能声称": claims,
    "输入输出清晰": claimsBreakdown["输入输出清晰"],
    "可接入性_detail": claimsBreakdown["可接入性"],
    "文档证据": claimsBreakdown["文档证据"],
    "组合潜力": claimsBreakdown["组合潜力"],
    "重复任务价值": claimsBreakdown["重复任务价值"],
    _source: "full-five-dim",
  };
}

function practicalScoreFromBreakdown(breakdown) {
  const weights = getFiveDimWeights();
  // 兼容旧格式（只有五个关键词维度，没有五维）
  if ("代码活跃度" in breakdown) {
    return Math.round(
      (breakdown["代码活跃度"] || 0) * weights["代码活跃度"] +
      (breakdown["项目健康度"] || 0) * weights["项目健康度"] +
      (breakdown["社区真实性"] || 0) * weights["社区真实性"] +
      (breakdown["可安装性"] || 0) * weights["可安装性"] +
      (breakdown["功能声称"] || 0) * weights["功能声称"]
    );
  }
  // 旧格式降级
  return Math.round(
    (breakdown["输入输出清晰"] || 0) * 0.25 +
    (breakdown["可接入性"] || 0) * 0.20 +
    (breakdown["文档证据"] || 0) * 0.20 +
    (breakdown["组合潜力"] || 0) * 0.20 +
    (breakdown["重复任务价值"] || 0) * 0.15
  );
}

// ---- 证据等级（从 scoring-rules.json 加载，失败则回退到内联默认值） ----

let _EVIDENCE_LEVELS_DATA = null;

async function loadEvidenceLevels() {
  if (_EVIDENCE_LEVELS_DATA) return _EVIDENCE_LEVELS_DATA;
  try {
    const resp = await fetch("scoring-rules.json");
    if (resp.ok) {
      const rules = await resp.json();
      const levels = rules.evidenceLevels?.levels || {};
      const COLORS = {
        L0: "#999",
        L1: "#4a90d9",
        L2: "#2ecc71",
        "L2-caveat": "#d89a21",
        L3: "#e74c3c",
        "L3-caveat": "#b45309",
        L4: "#7c3aed",
      };
      _EVIDENCE_LEVELS_DATA = {};
      for (const [lev, info] of Object.entries(levels)) {
        _EVIDENCE_LEVELS_DATA[lev] = {
          name: info.name || lev,
          weight: info.weight || 1.0,
          color: COLORS[lev] || "#999",
          desc: info.desc || "",
        };
      }
      return _EVIDENCE_LEVELS_DATA;
    }
  } catch (e) {
    console.warn("加载 scoring-rules.json 证据等级失败，使用内联默认值", e);
  }
  // 内联默认值
  _EVIDENCE_LEVELS_DATA = {
    L0: { name: "仅文档 · 待验证", weight: 1.0, color: "#999", desc: "仅有 README/文档推断，还没有真实运行证据" },
    L1: { name: "可安装", weight: 1.1, color: "#4a90d9", desc: "能 pip/npm install 成功" },
    L2: { name: "Smoke 通过 · 待闭环", weight: 1.25, color: "#2ecc71", desc: "安装或最小运行通过，等待组合闭环" },
    "L2-caveat": { name: "Smoke 通过 · 有限制", weight: 1.2, color: "#d89a21", desc: "单点样本跑通，但有明确限制" },
    L3: { name: "已实测可用", weight: 1.4, color: "#e74c3c", desc: "真实闭环跑通，有输入、执行和输出证据" },
    "L3-caveat": { name: "实测通过 · 有限制", weight: 1.32, color: "#b45309", desc: "组合闭环跑通，但存在明确限制" },
    L4: { name: "稳定复测", weight: 1.55, color: "#7c3aed", desc: "多样本、多环境、多次复测稳定" },
  };
  return _EVIDENCE_LEVELS_DATA;
}

async function loadPublishedData() {
  const sources = location.protocol === "file:"
    ? ["published.json"]
    : ["/api/published", "published.json"];
  let lastError = null;
  for (const source of sources) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`${source} ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("公开组合数据暂不可用");
}

function getEvidenceLevel(level) {
  if (_EVIDENCE_LEVELS_DATA && _EVIDENCE_LEVELS_DATA[level]) {
    return _EVIDENCE_LEVELS_DATA[level];
  }
  // 回退到硬编码默认值（兼容旧数据）
  return {
    L0: { name: "仅文档 · 待验证", weight: 1.0, color: "#999", desc: "仅有 README/文档推断，还没有真实运行证据" },
    L1: { name: "可安装", weight: 1.1, color: "#4a90d9", desc: "能 pip/npm install 成功" },
    L2: { name: "Smoke 通过 · 待闭环", weight: 1.25, color: "#2ecc71", desc: "安装或最小运行通过，等待组合闭环" },
    "L2-caveat": { name: "Smoke 通过 · 有限制", weight: 1.2, color: "#d89a21", desc: "单点样本跑通，但有明确限制" },
    L3: { name: "已实测可用", weight: 1.4, color: "#e74c3c", desc: "真实闭环跑通，有输入、执行和输出证据" },
    "L3-caveat": { name: "实测通过 · 有限制", weight: 1.32, color: "#b45309", desc: "组合闭环跑通，但存在明确限制" },
    L4: { name: "稳定复测", weight: 1.55, color: "#7c3aed", desc: "多样本、多环境、多次复测稳定" },
  }[level] || { name: "未知", weight: 1.0, color: "#999", desc: "" };
}

function evidenceBadgeHTML(level) {
  const ev = getEvidenceLevel(level);
  return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:600;color:#fff;background:${ev.color}" title="${ev.desc}">${ev.name}</span>`;
}

function buildCandidateRecord(name, url, text, extraWhy) {
  const role = inferRole(text);
  const scoreBreakdown = scoreCandidateBreakdown(text);
  const practicalScore = practicalScoreFromBreakdown(scoreBreakdown);
  const signalsResult = inferSignals(text);
  return {
    id: slugify(name),
    name,
    url,
    discoveredAt: new Date().toISOString().slice(0, 10),
    role,
    practicalScore,
    scoreBreakdown,
    freshness: "待确认",
    status: candidateRecommendation(practicalScore),
    why: extraWhy || text.slice(0, 140) || "由评分器根据 URL 和描述生成，建议补充 README 证据。",
    bestWith: inferBestWith(role, text),
    signals: signalsResult.length ? signalsResult : ["待补充证据"]
  };
}

// ---- localStorage 数据共享 ----

const LS_KEY_CANDIDATES = 'combo-validator.candidates';
const LS_KEY_RECORDS = 'combo-validator.records';
const LS_KEY_CATALOG = 'combo-validator.catalog';

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* 存储满或隐私模式下静默失败 */ }
}

function mergeById(existing, incoming) {
  const map = new Map();
  (existing || []).forEach(item => map.set(item.id, item));
  (incoming || []).forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

// ---- 候选工具渲染 ----

function renderCandidateScoreBars(candidate) {
  const breakdown = candidate.scoreBreakdown || {};
  const entries = Object.entries(breakdown);
  if (!entries.length) return "";
  return `
    <div class="mini-score">
      ${entries.map(([name, value]) => `
        <div class="mini-line">
          <span>${escapeHtml(name)}</span>
          <div class="bar"><span style="--value:${Number(value)}%"></span></div>
          <b>${Number(value)}</b>
        </div>
      `).join("")}
    </div>
  `;
}
