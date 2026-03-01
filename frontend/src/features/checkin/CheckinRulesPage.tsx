import React from "react";
import { useParams } from "react-router-dom";

export function CheckinRulesPage() {
  const { eventId } = useParams();
  return (
    <section>
      <h2>Regras de Check-in</h2>
      <p>Evento: {eventId}</p>
      <p>Estado complexo (draft + validações + salvar) entra na próxima etapa.</p>
    </section>
  );
}