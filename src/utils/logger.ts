import morgan from "morgan";
import { Request } from "express";

export const httpLogger = morgan(":method :url :status :res[content-length] - :response-time ms", {
  skip: (_req: Request) => process.env.NODE_ENV === "test",
});
