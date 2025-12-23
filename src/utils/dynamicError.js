export const dynamicError = (res, status, customMessage = null) => {
    let message = customMessage;

    switch (status) {
        case 400:
            message = message || "Bad request";
            break;

        case 401:
            message = message || "Unauthorized";
            break;

        case 403:
            message = message || "Forbidden";
            break;

        case 404:
            message = message || "Not found";
            break;

        case 500:
            message = message || "Internal server error";
            break;

        default:
            message = message || "Something went wrong";
    }

    return res.status(status).json({
        success: false,
        message,
    });
};
