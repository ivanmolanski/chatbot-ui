import { defineRailway, github, group, image, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 50000 });
  const Postgres = service("Postgres", {
    source: image("pgvector/pgvector:pg17", { autoUpdates: { schedule: [{ day: 0, endHour: 24, startHour: 0 }, { day: 1, endHour: 24, startHour: 0 }, { day: 2, endHour: 24, startHour: 0 }, { day: 3, endHour: 24, startHour: 0 }, { day: 4, endHour: 24, startHour: 0 }, { day: 5, endHour: 24, startHour: 0 }, { day: 6, endHour: 24, startHour: 0 }], type: "patch" } }),
    replicas: { "us-east4-eqdc4a": 1 },
    networking: { privateNetworkEndpoint: "postgres" },
    volumeMounts: {
      "/var/lib/postgresql/data": postgresVolume,
    },
    env: {
      DATABASE_PUBLIC_URL: preserve(),
      DATABASE_URL: preserve(),
      PGDATA: preserve(),
      PGDATABASE: preserve(),
      PGHOST: preserve(),
      PGPASSWORD: preserve(),
      PGPORT: preserve(),
      PGUSER: preserve(),
      POSTGRES_DB: preserve(),
      POSTGRES_PASSWORD: preserve(),
      POSTGRES_USER: preserve(),
      RAILWAY_DEPLOYMENT_DRAINING_SECONDS: preserve(),
      SSL_CERT_DAYS: preserve(),
    },
  });
  const deepResearchAgent = service("deep-research-agent", {
    source: github("ivanmolanski/af-deep-research", { checkSuites: false, commitSha: "dc38c0cfcc1dd1edf51a9583bdd174777c1f7cac", upstreamUrl: "https://github.com/ivanmolanski/af-deep-research" }),
    replicas: { "us-east4-eqdc4a": 1 },
    env: {
      AGENTFIELD_API_KEY: preserve(),
      AGENTFIELD_ASYNC_LLM_CALL_TIMEOUT: preserve(),
      AGENTFIELD_SERVER: preserve(),
      AGENT_CALLBACK_URL: preserve(),
      BRAVE_API_KEY: preserve(),
      DEFAULT_MODEL: preserve(),
      NO_CACHE: preserve(),
      OPENROUTER_API_BASE: preserve(),
      OPENROUTER_API_KEY: preserve(),
      PORT: preserve(),
      SEARCH_CONCURRENCY: preserve(),
      SEARCH_MAX_RESULTS: preserve(),
      SEARCH_PROVIDER: preserve(),
    },
  });
  const controlPlane = service("control-plane", {
    source: image("agentfield/control-plane:latest", { autoUpdates: { schedule: [{ day: 0, endHour: 24, startHour: 0 }, { day: 1, endHour: 24, startHour: 0 }, { day: 2, endHour: 24, startHour: 0 }, { day: 3, endHour: 24, startHour: 0 }, { day: 4, endHour: 24, startHour: 0 }, { day: 5, endHour: 24, startHour: 0 }, { day: 6, endHour: 24, startHour: 0 }], type: "patch" } }),
    replicas: { "us-east4-eqdc4a": 1 },
    env: {
      AGENTFIELD_API_KEY: preserve(),
      AGENTFIELD_PORT: preserve(),
      AGENTFIELD_STORAGE_MODE: preserve(),
      AGENTFIELD_STORAGE_POSTGRES_URL: preserve(),
      OBSERVABILITY_WEBHOOK_URL: preserve(),
    },
  });
  const chatbotUi = service("chatbot-ui", {
    source: github("ivanmolanski/chatbot-ui", { checkSuites: false, upstreamUrl: "https://github.com/ivanmolanski/chatbot-ui" }),
    start: "",
    replicas: { "us-east4-eqdc4a": 1 },
    env: {
      AF_API_KEY: preserve(),
      AF_CONTROL_PLANE_URL: preserve(),
      NODE_VERSION: preserve(),
      NO_CACHE: preserve(),
      OPENROUTER_API_KEY: preserve(),
      RAILPACK_NODE_VERSION: preserve(),
    },
  });
  const AgentfieldDeepResearch = group("Agentfield Deep Research", [Postgres, deepResearchAgent, controlPlane]);

  return project("SlayerAF", {
    resources: [chatbotUi, postgresVolume, AgentfieldDeepResearch],
  });
});
