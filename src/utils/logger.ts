import morgan from "morgan";
import { Request } from "express";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

const colorStatus = (status: string) => {
  const code = Number(status);
  if (code >= 500) return `${colors.red}${status}${colors.reset}`;
  if (code >= 400) return `${colors.yellow}${status}${colors.reset}`;
  if (code >= 200 && code < 300) return `${colors.green}${status}${colors.reset}`;
  return status;
};

morgan.token("colored-status", (_req, res) => colorStatus(String(res.statusCode)));
morgan.token("colored-method", (req) => `${colors.cyan}${req.method}${colors.reset}`);

export const httpLogger = morgan(
  `${colors.dim}:date[iso]${colors.reset} :colored-method :url :colored-status :res[content-length] - :response-time ms`,
  {
    skip: (_req: Request) => process.env.NODE_ENV === "test",
  }
);
