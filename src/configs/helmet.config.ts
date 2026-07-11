import { HelmetOptions } from "helmet";

export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },

  frameguard: {
    action: "deny",
  },

  noSniff: true,

  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  dnsPrefetchControl: {
    allow: false,
  },

  ieNoOpen: true,

  permittedCrossDomainPolicies: {
    permittedPolicies: "none",
  },

  hidePoweredBy: true,

  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  crossOriginEmbedderPolicy: false,
};