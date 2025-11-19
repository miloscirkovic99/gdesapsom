/**
 * Security Configuration Types
 * Defines interfaces and types for security settings
 */

export interface SecurityConfig {
  csp: Record<string, string[]>;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  endpointRateLimits: Record<string, RateLimitConfig>;
  ddosProtection: DDoSConfig;
  headers: Record<string, string>;
  https: HttpsConfig;
  monitoring: MonitoringConfig;
  production?: {
    rateLimit?: Partial<RateLimitConfig>;
    botDetection?: Partial<BotDetectionConfig>;
    monitoring?: Partial<MonitoringConfig>;
  };
}

export interface CorsConfig {
  allowedOrigins: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: any) => boolean;
  keyGenerator?: (req: any) => string;
  handler?: (req: any, res: any) => void;
  message?: string;
}

export interface DDoSConfig {
  enabled: boolean;
  method: 'cloudflare' | 'aws-shield' | 'custom';
  cloudflare: CloudflareConfig;
  botDetection: BotDetectionConfig;
  connectionLimits: ConnectionLimitsConfig;
  bandwidthLimits: BandwidthLimitsConfig;
  requestLimits: RequestLimitsConfig;
  timeouts: TimeoutConfig;
}

export interface CloudflareConfig {
  enabled: boolean;
  zoneId?: string;
  apiToken?: string;
  rules: CloudflareRule[];
}

export interface CloudflareRule {
  name: string;
  enabled: boolean;
  threshold?: number;
  period?: number;
}

export interface BotDetectionConfig {
  enabled: boolean;
  captchaThreshold: number;
  blockVPN: boolean;
  blockTor: boolean;
  blockDatacenters: boolean;
  trustCloudflare: boolean;
}

export interface ConnectionLimitsConfig {
  maxConcurrentConnections: number;
  maxConnectionsPerIP: number;
  connectionTimeout: number;
}

export interface BandwidthLimitsConfig {
  enabled: boolean;
  bytesPerSecond: number;
  maxPayloadSize: string;
}

export interface RequestLimitsConfig {
  json: string;
  urlencoded: string;
  text: string;
  raw: string;
}

export interface TimeoutConfig {
  keepaliveTimeout: number;
  headerTimeout: number;
  requestTimeout: number;
}

export interface HttpsConfig {
  enabled: boolean;
  enforceHttps: boolean;
  hstsMaxAge: number;
  hstsIncludeSubDomains: boolean;
  hstsPreload: boolean;
  tlsVersion: string;
  cipherSuites: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logSecurityEvents: boolean;
  alertOnRateLimitExceeded: boolean;
  alertOnDDoSDetected: boolean;
  alertEmail: string;
  metrics: string[];
}

// API Response types
export interface SecurityAlert {
  type: 'rate-limit' | 'ddos' | 'bot' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  ip?: string;
  message: string;
  details?: Record<string, any>;
}

export interface RateLimitError {
  error: string;
  retryAfter: number;
  remaining: number;
  limit: number;
  reset: Date;
}

export interface DDoSMetrics {
  requestsPerSecond: number;
  errorRate: number;
  responseTime: number;
  activeConnections: number;
  bandwidthUsage: number;
  failedLogins: number;
  rateLimitHits: number;
  ddosAttempts: number;
  timestamp: Date;
}
