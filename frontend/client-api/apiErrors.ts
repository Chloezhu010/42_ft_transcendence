type ApiRequestError = Error & { status: number };

function formatErrorDetail(detail: unknown): string | null {
    if (typeof detail === 'string' && detail.trim()) {
        return detail;
    }

    if (Array.isArray(detail)) {
        const messages = detail
            .map((item) => formatErrorDetail(item))
            .filter((message): message is string => Boolean(message));

        if (messages.length > 0) {
            return messages.join('; ');
        }
    }

    if (detail && typeof detail === 'object') {
        const errorDetail = detail as { loc?: unknown; msg?: unknown };

        if (typeof errorDetail.msg === 'string' && errorDetail.msg.trim()) {
            if (Array.isArray(errorDetail.loc)) {
                const location = errorDetail.loc
                    .filter(
                        (part): part is string | number =>
                            typeof part === 'string' || typeof part === 'number'
                    )
                    .join('.');

                if (location) {
                    return `${location}: ${errorDetail.msg}`;
                }
            }

            return errorDetail.msg;
        }

        try {
            return JSON.stringify(detail);
        } catch {
            return null;
        }
    }

    return null;
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const data = (await response.json()) as { detail?: unknown };
        const detailMessage = formatErrorDetail(data.detail);
        if (detailMessage) {
            return detailMessage;
        }
    } catch {
        // Ignore JSON parsing errors and use fallback message
    }
    return fallback;
}

export async function buildApiError(response: Response, fallback: string): Promise<ApiRequestError> {
    const error = new Error(await getErrorMessage(response, fallback)) as ApiRequestError;
    error.status = response.status;
    return error;
}
