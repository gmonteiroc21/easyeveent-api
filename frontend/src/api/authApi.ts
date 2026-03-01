import { request } from "./httpClient";
import { env } from "./env";

export type LoginInput = { identifier: string; password: string };
export type LoginResponse = { token: string };

export const authApi = {
  async login(input: LoginInput): Promise<LoginResponse> {
    // desafio sugere POST /auth/login -> { token } :contentReference[oaicite:11]{index=11}
    return request<LoginResponse>(env.authLoginPath, { method: "POST", body: input });
  },
};