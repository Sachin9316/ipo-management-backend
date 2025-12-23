export const serverErrorHandler = (error, res) => {
  if (error.name === "ZodError") {
    const formatted = {};

    const issues = error.issues;
    issues?.forEach((issue) => {
      const field = issue.path.at(-1);
      formatted[field] = issue.message;
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formatted,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
