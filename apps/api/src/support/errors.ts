export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details: unknown[] = []
  ) {
    super(message);
  }
}

export function notFound(message = "Registro nao encontrado.") {
  return new AppError("NOT_FOUND", message, 404);
}

