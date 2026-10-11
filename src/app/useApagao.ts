import { useEffect, useState } from "react";
import { APAGAO_ATIVO, apagaoNoAr, ouveApagao } from "./apagao";
import { agora, horaSincronizada, sincronizaHora } from "./hora-confiavel";

/**
 * "sim" = mostrar a tela de apagão; "nao" = site normal; "conferindo" = tela
 * preta enquanto a hora do servidor não chega.
 *
 * Pelo relógio local já dentro do apagão: entra direto (sem espera para quem
 * está com o relógio certo). Pelo relógio local FORA dele, mas com o apagão
 * configurado: espera a hora do servidor antes de abrir o site — senão um
 * relógio adiantado mostraria o site por um instante. Sem rede, a sincronização
 * desiste sozinha (hora-confiavel.ts) e vale o relógio local.
 * Reavalia a cada 15 s: o apagão termina sozinho com a página aberta.
 */
export function useApagao(): "sim" | "nao" | "conferindo" {
  const [estado, setEstado] = useState<"sim" | "nao" | "conferindo">(() => {
    if (apagaoNoAr(agora())) return "sim";
    if (!import.meta.env.DEV && APAGAO_ATIVO && !horaSincronizada()) return "conferindo";
    return "nao";
  });

  useEffect(() => {
    let vivo = true;
    const reavalia = () => {
      if (vivo) setEstado(apagaoNoAr(agora()) ? "sim" : "nao");
    };
    void sincronizaHora().then(reavalia);
    const iv = setInterval(reavalia, 15000);
    const solta = ouveApagao(reavalia);
    return () => {
      vivo = false;
      clearInterval(iv);
      solta();
    };
  }, []);

  return estado;
}
