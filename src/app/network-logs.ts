
export type LogTone = "normal" | "warn" | "critical";

export interface LogLine {
  text: string;
  tone: LogTone;
}

// ----------------------------------------------------------------------------
// Helpers de aleatoriedade
// ----------------------------------------------------------------------------

function randIp(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join(".");
}

function randPort(): number {
  return Math.floor(Math.random() * (65535 - 1024) + 1024);
}

function randHex(bytes: number): string {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join("");
}

// Sempre gera endereços com o mesmo número de dígitos (6 bytes = 12 hex chars)
function randMemAddr(bytes = 6): string {
  return "0x" + randHex(bytes).toUpperCase();
}

function randMac(): string {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join(":");
}

function randAsn(): number {
  return Math.floor(Math.random() * 64000 + 1000);
}

function randPid(): number {
  return Math.floor(Math.random() * 30000 + 1000);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Timestamp estilo syslog: "Aug 07 03:14:52"
function timestamp(): string {
  const now = new Date();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${months[now.getMonth()]} ${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

// ----------------------------------------------------------------------------
// Dados fixos
// ----------------------------------------------------------------------------

const TOR_EXIT_NODES = [
  "185.220.101.4",
  "51.15.43.205",
  "45.154.255.67",
  "192.42.116.16",
  "23.129.64.131",
] as const;

const TLS_SUITES = [
  "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
  "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256",
  "TLS_DHE_RSA_WITH_AES_128_GCM_SHA256",
] as const;

const PROTOCOLS = ["TCP", "UDP"] as const;

const INTERFACES = ["eth0", "eth1", "wlan0", "tun0", "br-lan"] as const;

// ----------------------------------------------------------------------------
// Geradores individuais — cada um recebe um peso pra controlar a raridade
// (pesos maiores = aparece com mais frequência). "critical" costuma ter peso
// baixo pra manter o impacto dramático quando surge.
// ----------------------------------------------------------------------------

interface WeightedGenerator {
  weight: number;
  make: () => LogLine;
}

const GENERATORS: WeightedGenerator[] = [
  {
    weight: 3,
    make: () => ({
      text: `[NET_TRACE] Rerouting socket via SOCKS5 proxy chain (${pick(TOR_EXIT_NODES)}:9050 -> ${randIp()})...`,
      tone: "normal",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[BGP] Route withdrawal: AS${randAsn()} unreachable via peer ${randIp()}`,
      tone: "warn",
    }),
  },
  {
    weight: 3,
    make: () => ({
      text: `[IPTABLES] DROP src=${randIp()} dst=${randIp()} proto=${pick(PROTOCOLS)} spt=${randPort()} dpt=${randPort()}`,
      tone: "normal",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[SSL_ERR] ${pick(TLS_SUITES)} handshake failed. Flushing memory buffer at ${randMemAddr()}...`,
      tone: "warn",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[KERNEL] ${pick(INTERFACES)}: link down, forcing route flush via ip route flush table main`,
      tone: "warn",
    }),
  },
  {
    weight: 3,
    make: () => ({
      text: `[SSHD] Failed password for invalid user root from ${randIp()} port ${randPort()} ssh2`,
      tone: "normal",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[NODE] Terminating bridge relay obfs4 on 0.0.0.0:${randPort()} — SIGTERM sent to pid ${randPid()}`,
      tone: "critical",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[DNS] SERVFAIL resolving upstream resolver 1.1.1.1 — falling back to cached zone`,
      tone: "normal",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[FIREWALL] iptables -A INPUT -s ${randIp()}/32 -j DROP`,
      tone: "normal",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[CRYPTO] Wiping ephemeral key material from /dev/shm/.k_${randHex(4)}`,
      tone: "critical",
    }),
  },
  {
    weight: 3,
    make: () => ({
      text: `[NET_TRACE] ICMP unreachable from ${randIp()}: Destination Host Unreachable`,
      tone: "normal",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[SYSTEM] Memory purge triggered — zeroing heap segment ${randMemAddr()}-${randMemAddr()}`,
      tone: "critical",
    }),
  },
  // --- Novos geradores ---
  {
    weight: 2,
    make: () => ({
      text: `[ARP] Possible spoofing detected: ${randIp()} announced with new MAC ${randMac()}`,
      tone: "warn",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[DHCP] Lease expired for ${randIp()} (mac ${randMac()}) — renewal request timed out`,
      tone: "normal",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[IDS] Signature match: possible port scan from ${randIp()} (${Math.floor(Math.random() * 40 + 10)} ports in 3s)`,
      tone: "warn",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[RATE_LIMIT] Throttling connections from ${randIp()} — threshold exceeded (${Math.floor(Math.random() * 900 + 100)} req/s)`,
      tone: "normal",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[CERT] Pin mismatch for upstream host — expected fingerprint does not match ${randHex(20)}`,
      tone: "warn",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[HONEYPOT] Interaction logged from ${randIp()} — session mirrored to sandbox vlan`,
      tone: "normal",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[WATCHDOG] Process pid ${randPid()} unresponsive for 30s — sending SIGKILL`,
      tone: "critical",
    }),
  },
  {
    weight: 2,
    make: () => ({
      text: `[ROUTE] Static route to ${randIp()}/24 replaced via ${pick(INTERFACES)} (metric ${Math.floor(Math.random() * 50)})`,
      tone: "normal",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[AUDIT] Unauthorized config write attempt blocked — origin ${randIp()}, target /etc/net/relay.conf`,
      tone: "warn",
    }),
  },
  {
    weight: 1,
    make: () => ({
      text: `[TUNNEL] Keepalive timeout on wg0 peer ${randIp()}:${randPort()} — marking as dead`,
      tone: "warn",
    }),
  },
];

const TOTAL_WEIGHT = GENERATORS.reduce((sum, g) => sum + g.weight, 0);

function pickWeighted(): WeightedGenerator {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const gen of GENERATORS) {
    roll -= gen.weight;
    if (roll <= 0) return gen;
  }
  return GENERATORS[GENERATORS.length - 1];
}

// ----------------------------------------------------------------------------
// API pública
// ----------------------------------------------------------------------------

/**
 * Gera uma única linha de log. Se `withTimestamp` for true, prefixa a linha
 * com um timestamp estilo syslog (ex.: "Aug 07 03:14:52").
 */
export function generateLogLine(withTimestamp = false): LogLine {
  const line = pickWeighted().make();
  if (!withTimestamp) return line;
  return { ...line, text: `${timestamp()} ${line.text}` };
}

/**
 * Gera várias linhas de uma vez — útil pra popular o terminal rapidamente
 * (ex.: no boot da tela ou num "scroll" acelerado de log).
 */
export function generateLogBurst(count: number, withTimestamp = false): LogLine[] {
  return Array.from({ length: count }, () => generateLogLine(withTimestamp));
}

// Sequência fixa exibida no encerramento, antes da queda total de conexão
export const FINAL_LOG_SEQUENCE: LogLine[] = [
  { text: "[CRITICAL] All active tunnels terminated.", tone: "critical" },
  { text: "[CRITICAL] Node isolation complete. Uplink severed.", tone: "critical" },
  { text: "[SYSTEM] Falha de conexão irreversível detectada.", tone: "critical" },
  { text: "CONEXÃO PERDIDA — SISTEMA COMPROMETIDO", tone: "critical" },
];