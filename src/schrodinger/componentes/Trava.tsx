// Formulário de chave (login e caixas trancadas por chave). O código guarda
// só o PBKDF2 da chave do login (chave.ts) ou o SHA-256 da chave de uma caixa
// (cifra.ts). Durante o cálculo: "Verificando…". Erro: atraso VISUAL de 3 s
// entre tentativas (site estático, não há bloqueio real); a partir do 3º
// erro, aparece a linha do gato. Sem crypto.subtle: aviso, e nada é aceito.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { confereChave } from "../../app/cifra";
import { conferePbkdf2, temCryptoSeguro, type HashPbkdf2 } from "../chave";
import { ERROS_PARA_AVISO, ESPERA_ERRO_MS, VERIFICANDO_MIN_MS } from "../config";
import { agoraSch } from "../relogio";
import { horaSPTexto } from "../secoes";
import { Ic } from "./comum";

type Props = {
  /** PBKDF2 (login) ou SHA-256 em hex (caixas). null: nada confere. */
  hash: HashPbkdf2 | string | null;
  rotulo: string;
  numero?: string;
  botao: string;
  ajuda?: ReactNode;
  autoFocus?: boolean;
  /** chamado dentro do gesto, antes da conferência (destravar o áudio) */
  onGesto?: () => void;
  onAceita: (chave: string) => void;
  /** some com o formulário depois de aceitar (o login segue animando) */
  bloqueado?: boolean;
};

export function Trava({ hash, rotulo, numero, botao, ajuda, autoFocus, onGesto, onAceita, bloqueado }: Props) {
  const id = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState("");
  const [erros, setErros] = useState(0);
  const [espera, setEspera] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [registro, setRegistro] = useState<string | null>(null);
  const [semCrypto] = useState(() => !temCryptoSeguro());

  useEffect(() => {
    if (!espera) return;
    const t = window.setTimeout(() => {
      setEspera(false);
      campo.current?.focus();
      campo.current?.select();
    }, ESPERA_ERRO_MS);
    return () => window.clearTimeout(t);
  }, [espera]);

  async function envia(ev: React.FormEvent) {
    ev.preventDefault();
    if (espera || conferindo || bloqueado || semCrypto) return;
    onGesto?.();
    const v = valor.trim();
    setConferindo(true);
    // deixa o "Verificando…" aparecer antes do cálculo começar
    await new Promise<void>((r) => requestAnimationFrame(() => window.setTimeout(r, 0)));
    const t0 = performance.now();
    const ok = !!hash && v.length > 0 && (await confere(v, hash));
    const resta = VERIFICANDO_MIN_MS - (performance.now() - t0);
    if (resta > 0) await new Promise((r) => window.setTimeout(r, resta));
    setConferindo(false);
    if (ok) {
      setErros(0);
      setRegistro(null);
      return onAceita(v);
    }
    setErros((n) => n + 1);
    setRegistro(horaSPTexto(agoraSch(), true));
    setEspera(true);
  }

  const erroAtivo = erros > 0;
  return (
    <form className="bloco" onSubmit={envia} noValidate aria-busy={conferindo || undefined}>
      <label className="t-rotulo" htmlFor={id}>{numero && <span className="num">{numero}</span>}{rotulo}</label>
      <div className="linha chave-inline" style={{ display: "flex", gap: 12 }}>
        <input
          ref={campo}
          id={id}
          className={`entrada${erroAtivo && espera ? " erro" : ""}`}
          type="password"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-invalid={erroAtivo && espera ? true : undefined}
          aria-describedby={`${id}-msg`}
          readOnly={conferindo}
          disabled={bloqueado || semCrypto}
          style={{ flex: 1 }}
        />
        <button className="botao" type="submit" disabled={espera || conferindo || bloqueado || semCrypto}>
          {conferindo ? "Verificando…" : espera ? `Aguarde ${Math.round(ESPERA_ERRO_MS / 1000)} s` : <>{botao} <Ic id="i-seta" /></>}
        </button>
      </div>
      {espera && (
        <div className="espera" aria-hidden="true"><i style={{ animationDuration: `${ESPERA_ERRO_MS}ms` }} /></div>
      )}
      {conferindo && <div className="verificando" aria-hidden="true"><i /></div>}
      <div id={`${id}-msg`} aria-live="polite">
        {semCrypto ? (
          <p className="erro-txt"><Ic id="i-alerta" mini />Este navegador não consegue conferir a chave com segurança. Abra o site pelo endereço https:// num navegador atualizado; até lá, nenhuma chave é aceita.</p>
        ) : conferindo ? (
          <p className="verificando-txt">Verificando a chave…</p>
        ) : erroAtivo ? (
          <>
            <p className="erro-txt"><Ic id="i-alerta" mini />Acesso negado. A chave não confere; a tentativa foi registrada.</p>
            <div className="reg" style={{ marginTop: 8 }}>
              <span>Tentativa <b>{erros}</b></span>
              {registro && <span>Registrada às <b>{registro}</b></span>}
            </div>
            {erros >= ERROS_PARA_AVISO && <p className="clima">O gato não responde a quem insiste.</p>}
          </>
        ) : (
          ajuda && <span className="ajuda-campo">{ajuda}</span>
        )}
      </div>
    </form>
  );
}

function confere(valor: string, hash: HashPbkdf2 | string): Promise<boolean> {
  return typeof hash === "string" ? confereChave(valor, hash) : conferePbkdf2(valor, hash);
}
