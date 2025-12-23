import { serverErrorHandler } from "../utils/serverErrorHandling.js";

export const zodValidate = (schema) => (req, res, next) => {
    try {
        const result = schema.parse({
            body: req.body,
            params: req.params,
            query: req.query,
        });

        req.validated = result;
        next();
    } catch (error) {
        serverErrorHandler(error, res);
    }
};
