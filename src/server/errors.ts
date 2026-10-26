/** Error esperado de la API: se traduce a una respuesta HTTP sin filtrar detalles internos. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}
export const notFound = (what = 'not_found') => new ApiError(404, what);
export const forbidden = () => new ApiError(403, 'forbidden');
export const unauthorized = () => new ApiError(401, 'unauthenticated');
export const invalid = (code: string, message?: string) => new ApiError(400, code, message);
export const conflict = (code: string, message?: string) => new ApiError(409, code, message);
