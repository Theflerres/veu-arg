import * as THREE from "three";
import { GRUPOS_POSE, type GrupoPose, type MovimentoPose, type Pose, type RepousoAba, type Vec3 } from "./poses";

// Aplica poses nos grupos do modelo (usados como ossos): interpola entre a
// pose atual e a pedida, soma respiração e movimentos da aba, troca rosto e
// objeto na mão. O motor chama atualizar() a cada quadro.

export type ConfigPoses = {
  grupos: Record<GrupoPose, { nos: string[]; pivo?: Vec3; espelha?: boolean }>;
  gruposPes: GrupoPose[];
  respiracao: MovimentoPose[];
  grupoRosto: string;
  rostos: Record<string, { nos: readonly string[] }>;
  grupoObjetos: string;
  objetos: Record<string, { nos: readonly string[] }>;
};

export type AlvoPose = { pose: Pose; rosto: string; objeto: string; repouso?: RepousoAba };
export type OpcoesTransicao = {
  /** Segundos; 0 = instantâneo. */
  duracao: number;
  /** Força do overshoot do ease-out (0 = sem overshoot). */
  sobressalto: number;
  /** Apaga o rosto por um instante antes de trocar. */
  piscar: boolean;
};

/** Quanto tempo o visor fica apagado na troca de rosto. */
export const PISCAR_S = 0.09;

const GRAU = Math.PI / 180;

/** Nome do nó sem o sufixo _N que o GLTFLoader põe em nomes repetidos. */
export const nomeBase = (nome: string) => nome.replace(/_\d+$/, "");

/** Busca em largura: o nó mais raso com o nome ganha (o Blockbench repete nomes). */
export function buscaRasa(raiz: THREE.Object3D, nome: string): THREE.Object3D | null {
  const fila: THREE.Object3D[] = [raiz];
  while (fila.length) {
    const o = fila.shift()!;
    if (o !== raiz && nomeBase(o.name) === nome) return o;
    fila.push(...o.children);
  }
  return null;
}

/** Dentro do grupo, só os nós listados (e o caminho até eles) ficam visíveis. */
function aplicaVariante(grupo: THREE.Object3D, nomes: readonly string[]) {
  const lista = new Set(nomes);
  const contem = (o: THREE.Object3D): boolean => lista.has(nomeBase(o.name)) || o.children.some(contem);
  const percorre = (g: THREE.Object3D) => {
    for (const filho of g.children) {
      if (lista.has(nomeBase(filho.name))) {
        filho.traverse((d) => (d.visible = true));
      } else if (contem(filho)) {
        filho.visible = true;
        percorre(filho);
      } else {
        filho.visible = false;
      }
    }
  };
  percorre(grupo);
}

/** Ease-out com overshoot (s = 0 vira ease-out cúbico). */
export const easeOutBack = (p: number, s: number) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;

type No = { obj: THREE.Object3D; pos0: THREE.Vector3; quat0: THREE.Quaternion; pivo: THREE.Vector3; espelho: boolean };
type Valores = { rot: THREE.Vector3; pos: THREE.Vector3 };

const novosValores = (): Valores => ({ rot: new THREE.Vector3(), pos: new THREE.Vector3() });

export class Poser {
  private readonly cfg: ConfigPoses;
  private readonly nos = new Map<GrupoPose, No[]>();
  private readonly de = new Map<GrupoPose, Valores>();
  private readonly para = new Map<GrupoPose, Valores>();
  private readonly atual = new Map<GrupoPose, Valores>();
  private readonly repouso = new Map<GrupoPose, Valores>();
  private progresso = 1;
  private duracao = 0.6;
  private sobressalto = 0;

  private readonly grupoRosto: THREE.Object3D | null;
  private readonly grupoObjetos: THREE.Object3D | null;
  private rostoAtual = "";
  private objetoAtual = "";
  private trocaPendente: { rosto: string; objeto: string; em: number } | null = null;

  private readonly malhasPes: THREE.Mesh[] = [];
  private readonly caixa = new THREE.Box3();

  private faseRespiracao = 0;
  private ritmo = 1;
  private ritmoAlvo = 1;
  private intensidade = 1;
  private intensidadeAlvo = 1;
  private extras: MovimentoPose[] = [];
  private extrasAnteriores: MovimentoPose[] = [];
  private pesoExtras = 1;
  private pesoAnteriores = 0;
  /** No editor, os movimentos próprios da aba (aceno etc.) param para não brigar com os sliders. */
  editando = false;

  private readonly euler = new THREE.Euler();
  private readonly dq = new THREE.Quaternion();
  private readonly tmp = new THREE.Vector3();

  constructor(raiz: THREE.Object3D, cfg: ConfigPoses) {
    this.cfg = cfg;
    for (const grupo of GRUPOS_POSE) {
      const def = cfg.grupos[grupo];
      const lista: No[] = [];
      def.nos.forEach((nome, i) => {
        const obj = buscaRasa(raiz, nome);
        if (!obj) return;
        lista.push({
          obj,
          pos0: obj.position.clone(),
          quat0: obj.quaternion.clone(),
          pivo: def.pivo ? new THREE.Vector3(...def.pivo) : obj.position.clone(),
          espelho: !!def.espelha && i > 0,
        });
      });
      if (lista.length) this.nos.set(grupo, lista);
      this.de.set(grupo, novosValores());
      this.para.set(grupo, novosValores());
      this.atual.set(grupo, novosValores());
      this.repouso.set(grupo, novosValores());
    }
    this.grupoRosto = buscaRasa(raiz, cfg.grupoRosto);
    this.grupoObjetos = buscaRasa(raiz, cfg.grupoObjetos);

    raiz.updateMatrixWorld(true);
    for (const grupo of cfg.gruposPes) {
      for (const no of this.nos.get(grupo) ?? []) {
        no.obj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.geometry.computeBoundingBox();
          const b = m.geometry.boundingBox;
          // Ignora as malhas de tamanho zero que o Blockbench exporta nos grupos.
          if (b && !b.isEmpty() && b.max.y - b.min.y > 1e-6) this.malhasPes.push(m);
        });
      }
    }
  }

  /** Quantos grupos do modelo foram encontrados (para o relatório). */
  get gruposEncontrados() {
    return this.nos.size;
  }

  definir(alvo: AlvoPose, op: OpcoesTransicao) {
    for (const grupo of GRUPOS_POSE) {
      const de = this.de.get(grupo)!;
      const atual = this.atual.get(grupo)!;
      const para = this.para.get(grupo)!;
      de.rot.copy(atual.rot);
      de.pos.copy(atual.pos);
      const p = alvo.pose[grupo];
      para.rot.set(...(p?.rot ?? [0, 0, 0]));
      para.pos.set(...(p?.pos ?? [0, 0, 0]));
    }
    this.duracao = op.duracao;
    this.sobressalto = op.sobressalto;
    this.progresso = op.duracao > 0 ? 0 : 1;
    if (op.duracao <= 0) this.aplicaInterpolacao(1);

    const trocaRosto = alvo.rosto !== this.rostoAtual;
    const trocaObjeto = alvo.objeto !== this.objetoAtual;
    if (trocaRosto || trocaObjeto) {
      if (op.piscar && trocaRosto && this.grupoRosto && this.rostoAtual) {
        for (const filho of this.grupoRosto.children) filho.visible = false;
        this.trocaPendente = { rosto: alvo.rosto, objeto: alvo.objeto, em: PISCAR_S };
      } else {
        this.trocaPendente = null;
        this.aplicaRostoObjeto(alvo.rosto, alvo.objeto);
      }
    }

    if (alvo.repouso) {
      this.ritmoAlvo = alvo.repouso.ritmo;
      this.intensidadeAlvo = alvo.repouso.intensidade;
      const novos = alvo.repouso.extras ?? [];
      if (novos !== this.extras) {
        this.extrasAnteriores = this.extras;
        this.pesoAnteriores = this.pesoExtras;
        this.extras = novos;
        this.pesoExtras = 0;
      }
    }
  }

  /** Troca só o rosto (sobreposição por estado), com ou sem piscar. */
  trocaRosto(rosto: string, piscar: boolean) {
    const objeto = this.trocaPendente?.objeto ?? this.objetoAtual;
    if (rosto === (this.trocaPendente?.rosto ?? this.rostoAtual)) return;
    if (piscar && this.grupoRosto && this.rostoAtual) {
      for (const filho of this.grupoRosto.children) filho.visible = false;
      this.trocaPendente = { rosto, objeto, em: PISCAR_S };
    } else {
      this.trocaPendente = null;
      this.aplicaRostoObjeto(rosto, objeto);
    }
  }

  private aplicaRostoObjeto(rosto: string, objeto: string) {
    this.rostoAtual = rosto;
    this.objetoAtual = objeto;
    if (this.grupoRosto) aplicaVariante(this.grupoRosto, this.cfg.rostos[rosto]?.nos ?? []);
    if (this.grupoObjetos) aplicaVariante(this.grupoObjetos, this.cfg.objetos[objeto]?.nos ?? []);
  }

  private aplicaInterpolacao(e: number) {
    for (const grupo of GRUPOS_POSE) {
      const de = this.de.get(grupo)!;
      const para = this.para.get(grupo)!;
      const atual = this.atual.get(grupo)!;
      atual.rot.lerpVectors(de.rot, para.rot, e);
      atual.pos.lerpVectors(de.pos, para.pos, e);
    }
  }

  /** fatorMovimento < 1 reduz respiração e extras (movimento reduzido). */
  atualizar(dt: number, t: number, fatorMovimento: number) {
    if (this.progresso < 1) {
      this.progresso = Math.min(1, this.progresso + dt / this.duracao);
      this.aplicaInterpolacao(easeOutBack(this.progresso, this.sobressalto));
    }
    if (this.trocaPendente) {
      this.trocaPendente.em -= dt;
      if (this.trocaPendente.em <= 0) {
        this.aplicaRostoObjeto(this.trocaPendente.rosto, this.trocaPendente.objeto);
        this.trocaPendente = null;
      }
    }

    const suave = 1 - Math.exp(-3 * dt);
    this.ritmo += (this.ritmoAlvo - this.ritmo) * suave;
    this.intensidade += (this.intensidadeAlvo - this.intensidade) * suave;
    this.pesoExtras += ((this.editando ? 0 : 1) - this.pesoExtras) * suave;
    this.pesoAnteriores += (0 - this.pesoAnteriores) * suave;
    // Fase acumulada: mudar o ritmo não dá salto na respiração.
    this.faseRespiracao += dt * this.ritmo;

    for (const v of this.repouso.values()) {
      v.rot.set(0, 0, 0);
      v.pos.set(0, 0, 0);
    }
    const soma = (m: MovimentoPose, tempo: number, peso: number) => {
      if (peso < 1e-3) return;
      const alvo = this.repouso.get(m.grupo);
      if (!alvo) return;
      const v = Math.sin((tempo * m.frequencia + (m.fase ?? 0)) * Math.PI * 2) * m.amplitude * peso * fatorMovimento;
      (m.tipo === "rot" ? alvo.rot : alvo.pos)[m.eixo] += v;
    };
    for (const m of this.cfg.respiracao) soma(m, this.faseRespiracao, this.intensidade);
    for (const m of this.extras) soma(m, t, this.pesoExtras);
    for (const m of this.extrasAnteriores) soma(m, t, this.pesoAnteriores);

    for (const [grupo, lista] of this.nos) {
      const atual = this.atual.get(grupo)!;
      const rep = this.repouso.get(grupo)!;
      const rx = atual.rot.x + rep.rot.x;
      const ry = atual.rot.y + rep.rot.y;
      const rz = atual.rot.z + rep.rot.z;
      for (const no of lista) {
        const s = no.espelho ? -1 : 1;
        this.euler.set(rx * GRAU, s * ry * GRAU, s * rz * GRAU, "XYZ");
        this.dq.setFromEuler(this.euler);
        // Gira no espaço do pai em torno do pivô: pos = pivô + Δ·(pos0 − pivô).
        no.obj.quaternion.copy(this.dq).multiply(no.quat0);
        this.tmp.copy(no.pos0).sub(no.pivo).applyQuaternion(this.dq).add(no.pivo);
        this.tmp.x += s * (atual.pos.x + rep.pos.x);
        this.tmp.y += atual.pos.y + rep.pos.y;
        this.tmp.z += atual.pos.z + rep.pos.z;
        no.obj.position.copy(this.tmp);
      }
    }
  }

  /** Menor y (mundo) das malhas dos pés. Exige matrizes atualizadas. */
  minYPes(): number {
    if (!this.malhasPes.length) return 0;
    let min = Infinity;
    for (const m of this.malhasPes) {
      this.caixa.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld);
      min = Math.min(min, this.caixa.min.y);
    }
    return min;
  }
}
