import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export function validate(schemas: { params?: ZodType; body?: ZodType }): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, string>;
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      next(err); // hand any failure to the error handler
    }
  };
}

