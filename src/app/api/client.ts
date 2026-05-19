 type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
 
 export class ApiError extends Error {
   status: number;
   body: unknown;
 
   constructor(status: number, body: unknown) {
     super(`API Error ${status}`);
     this.status = status;
     this.body = body;
   }
 }
 
 const TOKEN_KEY = "admin_access_token";

function parseResponseBody(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
 
 export function getAdminToken(): string | null {
   return localStorage.getItem(TOKEN_KEY);
 }
 
 export function setAdminToken(token: string | null) {
   if (!token) {
     localStorage.removeItem(TOKEN_KEY);
     return;
   }
   localStorage.setItem(TOKEN_KEY, token);
 }
 
 async function request<T>(method: HttpMethod, path: string, body?: unknown, auth?: boolean): Promise<T> {
   const headers: Record<string, string> = {};
   let payload: BodyInit | undefined;
 
   if (body instanceof FormData) {
     payload = body;
   } else if (body !== undefined) {
     headers["content-type"] = "application/json";
     payload = JSON.stringify(body);
   }
 
   if (auth) {
     const token = getAdminToken();
     if (token) {
       headers.authorization = `Bearer ${token}`;
     }
   }
 
   const res = await fetch(path, { method, headers, body: payload });
  const text = await res.text();
  const data = parseResponseBody(text);
 
   if (!res.ok) {
     throw new ApiError(res.status, data);
   }
 
   return data as T;
 }
 
 export const api = {
   get: <T>(path: string, auth = false) => request<T>("GET", path, undefined, auth),
   post: <T>(path: string, body?: unknown, auth = false) => request<T>("POST", path, body, auth),
   put: <T>(path: string, body?: unknown, auth = false) => request<T>("PUT", path, body, auth),
   patch: <T>(path: string, body?: unknown, auth = false) => request<T>("PATCH", path, body, auth),
   delete: <T>(path: string, auth = false) => request<T>("DELETE", path, undefined, auth),
 };

export function extractApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body;
    if (typeof body === "string" && body.trim()) {
      return body;
    }

    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.detail === "string" && record.detail.trim()) {
        return record.detail;
      }
      if (typeof record.error === "string" && record.error.trim()) {
        return record.error;
      }
      if (Array.isArray(record.detail) && record.detail.length > 0) {
        const first = record.detail[0];
        if (typeof first === "string") {
          return first;
        }
        if (first && typeof first === "object") {
          const firstRecord = first as Record<string, unknown>;
          if (typeof firstRecord.msg === "string") {
            return firstRecord.msg;
          }
        }
      }
    }

    return `请求失败 (${error.status})`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请求失败";
}
 
