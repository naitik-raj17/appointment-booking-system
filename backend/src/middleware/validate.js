/**
 * Validates and normalises req[source] against a zod schema. Parsed values
 * replace the raw input, so controllers only ever see clean data.
 */
const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    req[source] = result.data;
    return next();
  };

module.exports = validate;
