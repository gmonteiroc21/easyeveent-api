import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../auth/useAuth";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setApiError(null);
    try {
      await login(data.email, data.password);
      const to = location.state?.from ?? "/dashboard";
      navigate(to, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setApiError("Credenciais inválidas.");
        else setApiError(`Erro ao autenticar (HTTP ${err.status}).`);
      } else {
        setApiError("Erro inesperado ao autenticar.");
      }
    }
  }

  return (
    <div className="center">
      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <h1>Login</h1>

        <label>
          E-mail
          <input type="email" {...register("email")} placeholder="voce@exemplo.com" />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </label>

        <label>
          Senha
          <input type="password" {...register("password")} placeholder="••••••••" />
          {errors.password && <span className="error">{errors.password.message}</span>}
        </label>

        {apiError && <div className="alert">{apiError}</div>}

        <button className="btn primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
