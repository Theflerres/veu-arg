import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Poser, buscaRasa, nomeBase, type ConfigPoses } from "./poser";
import type { AbaInspect, CameraAba, EstadoPose } from "./poses";
import { COR_AMBAR, COR_FUNDO, COR_MEL } from "./cores";

// Motor three.js do visualizador de inspeção (InspectViewer.tsx). Fica fora do
// React: o componente só cria, conversa pelos callbacks de EventosMotor e
// descarta. Tudo que vale a pena ajustar à mão está nas constantes abaixo.

// ---------------------------------------------------------------------------
// CONSTANTES AJUSTÁVEIS
// ---------------------------------------------------------------------------

/** true força filtro nearest (pixels nítidos); false força linear; "auto" usa
 *  nearest quando a textura tem até LIMITE_PIXELADA px ou o glTF já pede NEAREST. */
export const TEXTURA_PIXELADA: boolean | "auto" = "auto";
export const LIMITE_PIXELADA = 256;

/** Bloom leve: "auto" liga e desliga sozinho se o fps cair abaixo de FPS_MINIMO. */
export const BLOOM: boolean | "auto" = "auto";
export const BLOOM_FORCA = 0.3;
export const BLOOM_RAIO = 0.4;
export const BLOOM_LIMIAR = 0.92;
export const FPS_MINIMO = 50;
/** Já na qualidade mínima, fps abaixo disto por SEGUNDOS_CRITICOS para o motor e avisa (evento `lento`). */
export const FPS_CRITICO = 12;
export const SEGUNDOS_CRITICOS = 6;

export const PIXEL_RATIO_MAX = 2;
/** O modelo é normalizado para esta altura; palco, luzes e partículas usam essa escala. */
export const ALTURA_PADRAO = 2;
export const FOV = 30;
/** Folga em volta do modelo no enquadramento inicial (1 = encostado nas bordas). */
export const MARGEM_ENQUADRAMENTO = 1.3;

export const ZOOM_MIN = 0.7;
export const ZOOM_MAX = 2.8;
const GRAU = Math.PI / 180;
export const ELEVACAO_MIN = -10 * GRAU;
export const ELEVACAO_MAX = 38 * GRAU;
export const ELEVACAO_INICIAL = 8 * GRAU;

/** Radianos por pixel arrastado. */
export const SENSIBILIDADE_GIRO = 0.009;
export const SENSIBILIDADE_ELEVACAO = 0.005;
/** Quanto maior, mais rápido a inércia morre (por segundo). */
export const AMORTECIMENTO_INERCIA = 3.2;
export const VELOCIDADE_AUTO_GIRO = 0.42;

/** Sem interação por esse tempo, a câmera começa a balançar sozinha. */
export const OCIOSO_MS = 4500;
export const BALANCO_GIRO = 0.07;
export const BALANCO_ELEVACAO = 0.03;

export const QUANTIDADE_PARTICULAS = 170;

/** Troca de aba: duração da pose (s) e força do overshoot (0 = sem). */
export const DURACAO_TRANSICAO = 0.6;
export const SOBRESSALTO = 1.3;
/** A câmera acompanha um pouco mais devagar e sem overshoot. */
export const DURACAO_CAMERA = 0.75;
/** Duração da pose quando o editor mexe ao vivo. */
const DURACAO_AO_VIVO = 0.12;
/** Transição da cor do contraluz numa sobreposição (s). */
const DURACAO_COR = 0.5;

export { COR_MEL, COR_AMBAR, COR_VERDE, COR_FUNDO } from "./cores";

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

/** Um movimento de repouso aplicado a um nó do modelo (grupo do Blockbench,
 *  osso, etc.): seno com amplitude (rad ou unidades do modelo) e frequência (Hz). */
export type MovimentoRig = {
  no: string;
  tipo: "rot" | "pos";
  eixo: "x" | "y" | "z";
  amplitude: number;
  frequencia: number;
  fase?: number;
};

export type OpcoesMotor = {
  /** Giro inicial do modelo (rad). Modelos do Blockbench olham para -Z: use Math.PI. */
  rotacaoInicialY?: number;
  /** { grupo: [filhos visíveis] } — dentro de cada grupo, só os filhos listados aparecem.
   *  Serve para variantes empilhadas no mesmo lugar (rostos, objetos na mão). */
  variantes?: Record<string, string[]>;
  /** Movimentos de repouso por nó, usados quando o modelo não tem animação. */
  rig?: MovimentoRig[];
  texturaPixelada?: boolean | "auto";
  bloom?: boolean | "auto";
  autoGiro?: boolean;
  /** Sistema de abas/poses (ver poses.ts). Com ele, `variantes` e `rig` são ignorados. */
  poses?: ConfigPoses;
};

export type InfoModelo = {
  triangulos: number;
  malhas: number;
  materiais: number;
  texturas: string[];
  animacoes: string[];
  esqueleto: boolean;
  repouso: string;
};

export type EstadoHud = {
  rotacao: number;
  zoom: number;
  elevacao: number;
  fps: number;
  bloom: boolean;
};

export type EventosMotor = {
  progresso?: (fracao: number | null) => void;
  pronto?: (info: InfoModelo) => void;
  erro?: (mensagem: string) => void;
  hud?: (estado: EstadoHud) => void;
  contexto?: (perdido: boolean) => void;
  arrastando?: (sim: boolean) => void;
  /** fps crítico mesmo na qualidade mínima: o motor parou de renderizar. */
  lento?: () => void;
};

/** Rosto e/ou contraluz que se sobrepõem aos da aba por um tempo. */
export type Sobreposicao = { rosto?: string; contraluz?: string } | null;

// ---------------------------------------------------------------------------
// SHADERS
// ---------------------------------------------------------------------------

// Grade de favo: devolve (posição na célula, id da célula).
const GLSL_HEX = /* glsl */ `
float hexDist(vec2 p){ p = abs(p); return max(dot(p, vec2(0.5, 0.8660254)), p.x); }
vec4 hexCoords(vec2 uv){
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  return vec4(gv, uv - gv);
}
float hash21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;

const FUNDO_VERT = /* glsl */ `
void main(){ gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;

const FUNDO_FRAG = /* glsl */ `
uniform vec2 uRes;
uniform vec2 uParallax;
uniform float uTempo;
uniform vec3 uCentro;
uniform vec3 uBorda;
uniform vec3 uCor;
${GLSL_HEX}
float camada(vec2 c, float escala, vec2 desloc, float grossura){
  vec4 hc = hexCoords(c * escala + desloc);
  float d = 0.5 - hexDist(hc.xy);
  float w = fwidth(d) * grossura;
  float linha = 1.0 - smoothstep(0.0, w, d);
  float pisca = step(0.965, hash21(hc.zw)) * (0.5 + 0.5 * sin(uTempo * 0.9 + hash21(hc.zw + 3.1) * 40.0));
  return linha + pisca * 0.35 * smoothstep(0.12, 0.0, d);
}
void main(){
  vec2 c = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = length(c - vec2(0.0, -0.08));
  vec3 col = mix(uCentro, uBorda, smoothstep(0.0, 0.95, r));
  float mascara = smoothstep(1.15, 0.25, r);
  col += uCor * camada(c, 5.5, uParallax * 0.55, 1.3) * 0.055 * mascara;
  col += uCor * camada(c, 10.0, uParallax + vec2(0.37, 0.11), 1.0) * 0.028 * mascara;
  col *= 1.0 - smoothstep(0.55, 1.25, r) * 0.65;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const DISCO_VERT = /* glsl */ `
varying vec2 vPos;
void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const DISCO_FRAG = /* glsl */ `
uniform float uTempo;
uniform float uRaio;
uniform vec3 uCor;
varying vec2 vPos;
${GLSL_HEX}
void main(){
  float r = length(vPos) / uRaio;
  vec4 hc = hexCoords(vPos * 7.0);
  float d = 0.5 - hexDist(hc.xy);
  float linha = 1.0 - smoothstep(0.0, fwidth(d) * 1.2, d);
  float fade = smoothstep(1.0, 0.35, r);
  float scan = 0.0;
  for (int k = 0; k < 2; k++) {
    float fase = fract(uTempo * 0.11 + float(k) * 0.5);
    scan += smoothstep(0.035, 0.0, abs(r - fase)) * (1.0 - fase);
  }
  float rnd = hash21(hc.zw);
  float celula = step(0.9, rnd) * (0.5 + 0.5 * sin(uTempo * 1.4 + rnd * 50.0)) * 0.12 * smoothstep(0.2, 0.0, d);
  float aros = smoothstep(0.008, 0.0, abs(r - 0.96)) * 0.55 + smoothstep(0.005, 0.0, abs(r - 0.58)) * 0.3;
  float a = (linha * (0.22 + scan * 0.9) + celula) * fade + scan * 0.18 * fade + aros;
  gl_FragColor = vec4(uCor * a, a);
  #include <colorspace_fragment>
}
`;

const PARTICULA_VERT = /* glsl */ `
attribute float aSemente;
uniform float uTempo;
uniform float uAltura;
uniform float uTamanho;
uniform float uPixelRatio;
varying float vAlpha;
void main(){
  vec3 p = position;
  float vel = 0.04 + 0.07 * fract(aSemente * 7.13);
  p.y = mod(p.y + uTempo * vel, uAltura);
  p.x += sin(uTempo * 0.31 + aSemente * 6.283) * 0.09;
  p.z += cos(uTempo * 0.23 + aSemente * 12.7) * 0.09;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float brilho = 0.55 + 0.45 * sin(uTempo * (1.2 + aSemente * 2.3) + aSemente * 31.0);
  float borda = smoothstep(0.0, 0.18 * uAltura, p.y) * smoothstep(uAltura, 0.72 * uAltura, p.y);
  // Some perto da câmera (no zoom ela entra no meio das partículas).
  vAlpha = brilho * borda * smoothstep(1.2, 2.6, -mv.z);
  gl_PointSize = min(uTamanho * (0.45 + fract(aSemente * 3.71)) * uPixelRatio / -mv.z, 14.0 * uPixelRatio);
}
`;

const PARTICULA_FRAG = /* glsl */ `
uniform vec3 uCor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a * vAlpha;
  gl_FragColor = vec4(uCor * a, a);
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------------
// MOTOR
// ---------------------------------------------------------------------------

type Ponteiro = { x: number; y: number };
/** Eventos do canvas que o lib.dom do TypeScript não lista. */
type EventosCanvas = HTMLElementEventMap & { webglcontextlost: Event; webglcontextrestored: Event; gesturestart: Event };
type Amostra = { t: number; giro: number; elev: number };
type NoRig = { obj: THREE.Object3D; pos0: THREE.Vector3; quat0: THREE.Quaternion; movs: MovimentoRig[] };

const EIXOS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

const limita = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = THREE.MathUtils.lerp;
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
const arredonda = (v: number, casas: number) => Math.round(v * 10 ** casas) / 10 ** casas;

/** Enquadramento: giro e elevação em rad, alvo em fração da altura, dist em múltiplos do corpo inteiro. */
type QuadroCamera = { giro: number; elev: number; alvoY: number; dist: number; fov: number };
/** Suavização exponencial independente de fps. */
const aproxima = (atual: number, alvo: number, taxa: number, dt: number) =>
  atual + (alvo - atual) * (1 - Math.exp(-taxa * dt));

export class MotorInspect {
  private readonly container: HTMLElement;
  private readonly eventos: EventosMotor;
  private readonly opcoes: OpcoesMotor;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly cena = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);
  private composer: EffectComposer | null = null;
  private bloomAtivo = false;
  private readonly bloomModo: boolean | "auto";

  /** Mesa giratória: modelo, disco de favo, sombra e partículas giram juntos. */
  private readonly mesa = new THREE.Group();
  private readonly suporte = new THREE.Group();
  private modelo: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private nosRig: NoRig[] = [];
  private ossosRespiracao: { osso: THREE.Bone; quat0: THREE.Quaternion; eixo: "x" | "z"; amp: number }[] = [];
  private flutuar = false;
  private raioModelo = 0.6;
  private readonly escalaSombra = new THREE.Vector2(1, 1);
  private distanciaBase = 6;
  private poser: Poser | null = null;
  private abaAtual: AbaInspect | null = null;

  private readonly uniFundo;
  private readonly uniDisco;
  private readonly uniParticulas;
  private readonly sombraBlob: THREE.Mesh;
  private readonly luzChave: THREE.DirectionalLight;
  private readonly contraluz: THREE.DirectionalLight;
  private readonly corDe = new THREE.Color();
  private readonly corPara = new THREE.Color(COR_MEL);
  private transCor: { p: number; dur: number } | null = null;
  private sobreposicao: Sobreposicao = null;

  // estado de câmera / mesa
  private readonly giroInicial: number;
  private giro: number;
  private velGiro = 0;
  private elev = ELEVACAO_INICIAL;
  private velElev = 0;
  private zoom = 1;
  private zoomAlvo = 1;
  private autoGiro: boolean;
  private camAlvoY = 0.5;
  private camDist = 1;
  private camFov = FOV;
  private alvoEfetivo = 0.5;
  /** Transição de câmera (troca de aba / reiniciar). `mesa` cai se o usuário arrastar. */
  private transCam: { de: QuadroCamera; para: QuadroCamera; p: number; dur: number; mesa: boolean } | null = null;
  // deslocamento da vista (px) para o modelo não ficar atrás do painel lateral
  private deslocX = 0;
  private deslocY = 0;
  private deslocAlvoX = 0;
  private deslocAlvoY = 0;
  private largura = 1;
  private altura = 1;
  private projecaoAplicada = "";
  private pesoOcioso = 0;
  private ultimoInput = performance.now();
  private readonly movimentoReduzido: boolean;

  // ponteiros
  private readonly ponteiros = new Map<number, Ponteiro>();
  private arrastando = false;
  private amostras: Amostra[] = [];
  private movimentoToque = 0;
  private inicioToque = { t: 0, x: 0, y: 0 };
  private ultimoToque = { t: -Infinity, x: 0, y: 0 };
  private pinca: { dist0: number; zoom0: number } | null = null;

  // laço
  private raf = 0;
  private ultimoQuadro = 0;
  private ultimoHud = 0;
  private fps = 60;
  private quadrosFps = 0;
  private inicioFps = 0;
  private segundosLentos = 0;
  private segundosCriticos = 0;
  private parado = false;
  private fatorQualidade = 1;
  private prontoEm = 0;
  private perdido = false;
  private descartado = false;
  private readonly observador: ResizeObserver;
  private readonly limpezas: (() => void)[] = [];

  constructor(container: HTMLElement, eventos: EventosMotor, opcoes: OpcoesMotor = {}) {
    this.container = container;
    this.eventos = eventos;
    this.opcoes = opcoes;
    this.giroInicial = opcoes.rotacaoInicialY ?? 0;
    this.giro = this.giroInicial;
    this.autoGiro = opcoes.autoGiro ?? false;
    this.bloomModo = opcoes.bloom ?? BLOOM;
    this.movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Lança erro se não houver WebGL — o componente mostra a mensagem.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(COR_FUNDO, 1);
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);

    // --- fundo (quad de tela cheia) ---
    this.uniFundo = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uParallax: { value: new THREE.Vector2() },
      uTempo: { value: 0 },
      uCentro: { value: new THREE.Color("#2a1a09") },
      uBorda: { value: new THREE.Color("#070402") },
      uCor: { value: new THREE.Color(COR_MEL) },
    };
    const fundo = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: FUNDO_VERT,
        fragmentShader: FUNDO_FRAG,
        uniforms: this.uniFundo,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      })
    );
    fundo.frustumCulled = false;
    fundo.renderOrder = -1000;
    this.cena.add(fundo);

    // --- luzes: chave, preenchimento e dois contraluzes em mel/âmbar ---
    this.cena.add(new THREE.HemisphereLight("#ffe7c0", "#2a1606", 0.45));
    this.luzChave = new THREE.DirectionalLight("#fff0dc", 1.3);
    this.luzChave.position.set(-2.6, 4.2, 3.6);
    this.luzChave.castShadow = true;
    this.luzChave.shadow.mapSize.set(1024, 1024);
    this.luzChave.shadow.radius = 5;
    this.luzChave.shadow.bias = -0.0008;
    this.luzChave.shadow.normalBias = 0.02;
    const cs = this.luzChave.shadow.camera;
    cs.left = -2; cs.right = 2; cs.top = 2; cs.bottom = -2; cs.near = 0.5; cs.far = 12;
    this.cena.add(this.luzChave);
    const preenchimento = new THREE.DirectionalLight("#ffe2bd", 0.35);
    preenchimento.position.set(3.2, 1.6, 2.4);
    this.cena.add(preenchimento);
    this.contraluz = new THREE.DirectionalLight(COR_MEL, 2.8);
    this.contraluz.position.set(1.8, 3.2, -4);
    this.cena.add(this.contraluz);
    const contraluz2 = new THREE.DirectionalLight(COR_AMBAR, 2.2);
    contraluz2.position.set(-2.4, 1.8, -3.4);
    this.cena.add(contraluz2);

    // --- palco ---
    this.cena.add(this.mesa);
    this.mesa.add(this.suporte);

    const raioDisco = 1.25;
    this.uniDisco = {
      uTempo: { value: 0 },
      uRaio: { value: raioDisco },
      uCor: { value: new THREE.Color(COR_MEL) },
    };
    const disco = new THREE.Mesh(
      new THREE.CircleGeometry(raioDisco, 96),
      new THREE.ShaderMaterial({
        vertexShader: DISCO_VERT,
        fragmentShader: DISCO_FRAG,
        uniforms: this.uniDisco,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    );
    disco.rotation.x = -Math.PI / 2;
    disco.position.y = 0.002;
    disco.renderOrder = 1;
    this.mesa.add(disco);

    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.ShadowMaterial({ color: "#000000", opacity: 0.42, depthWrite: false })
    );
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    chao.renderOrder = 2;
    this.cena.add(chao);

    this.sombraBlob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: texturaBlob(),
        color: "#000000",
        transparent: true,
        depthWrite: false,
        opacity: 0.6,
      })
    );
    this.sombraBlob.rotation.x = -Math.PI / 2;
    this.sombraBlob.position.y = 0.004;
    this.sombraBlob.renderOrder = 3;
    this.mesa.add(this.sombraBlob);

    // --- partículas (pólen) ---
    const alturaParticulas = 3.6;
    this.uniParticulas = {
      uTempo: { value: 0 },
      uAltura: { value: alturaParticulas },
      uTamanho: { value: 40 },
      uPixelRatio: { value: 1 },
      uCor: { value: new THREE.Color(COR_MEL) },
    };
    const n = QUANTIDADE_PARTICULAS;
    const posicoes = new Float32Array(n * 3);
    const sementes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const raio = 0.85 + Math.pow(Math.random(), 0.7) * 3.2;
      posicoes[i * 3] = Math.cos(ang) * raio;
      posicoes[i * 3 + 1] = Math.random() * alturaParticulas;
      posicoes[i * 3 + 2] = Math.sin(ang) * raio;
      sementes[i] = Math.random();
    }
    const geoParticulas = new THREE.BufferGeometry();
    geoParticulas.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));
    geoParticulas.setAttribute("aSemente", new THREE.BufferAttribute(sementes, 1));
    const particulas = new THREE.Points(
      geoParticulas,
      new THREE.ShaderMaterial({
        vertexShader: PARTICULA_VERT,
        fragmentShader: PARTICULA_FRAG,
        uniforms: this.uniParticulas,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    );
    particulas.frustumCulled = false;
    particulas.renderOrder = 5;
    this.mesa.add(particulas);

    this.configuraBloom();
    this.ligaEventos(canvas);

    this.observador = new ResizeObserver(() => this.redimensiona());
    this.observador.observe(container);
    this.redimensiona();
    this.iniciaLaco();
  }

  // -------------------------------------------------------------------------
  // CARREGAMENTO
  // -------------------------------------------------------------------------

  carregar(url: string) {
    if (!url) {
      this.eventos.erro?.("nenhum arquivo de modelo (.gltf/.glb) foi informado");
      return;
    }
    this.eventos.progresso?.(0);
    new GLTFLoader().load(
      url,
      (gltf) => {
        if (this.descartado) {
          descartaObjeto(gltf.scene);
          return;
        }
        try {
          this.montaModelo(gltf.scene, gltf.animations);
        } catch (e) {
          this.eventos.erro?.(`falha ao montar o modelo: ${(e as Error).message}`);
        }
      },
      (ev) => this.eventos.progresso?.(ev.lengthComputable && ev.total > 0 ? ev.loaded / ev.total : null),
      (e) => {
        if (this.descartado) return;
        const msg = e instanceof Error ? e.message : String(e);
        this.eventos.erro?.(`não foi possível carregar ${url}\n${msg}`);
      }
    );
  }

  private montaModelo(raiz: THREE.Group, animacoes: THREE.AnimationClip[]) {
    const modoTextura = this.opcoes.texturaPixelada ?? TEXTURA_PIXELADA;
    const materiais = new Set<THREE.Material>();
    const texturas = new Map<string, string>();
    let triangulos = 0;
    let malhas = 0;
    let esqueleto = false;

    raiz.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) esqueleto = true;
      const malha = o as THREE.Mesh;
      if (!malha.isMesh) return;
      malhas++;
      const geo = malha.geometry;
      triangulos += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      malha.castShadow = true;
      malha.receiveShadow = false;
      for (const m of Array.isArray(malha.material) ? malha.material : [malha.material]) {
        if (materiais.has(m)) continue;
        materiais.add(m);
        this.ajustaMaterial(m as THREE.MeshStandardMaterial, modoTextura, texturas);
      }
    });

    // Variantes empilhadas: em cada grupo listado, só os filhos pedidos ficam visíveis.
    // (Com abas, rosto e objeto vêm de cada aba.)
    for (const [grupo, manter] of Object.entries(this.opcoes.poses ? {} : this.opcoes.variantes ?? {})) {
      raiz.traverse((o) => {
        if (nomeBase(o.name) !== grupo || o.children.length < 2) return;
        for (const filho of o.children) filho.visible = manter.includes(nomeBase(filho.name));
      });
    }

    // Normaliza: altura ALTURA_PADRAO, centro em x/z = 0, pés em y = 0.
    raiz.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(raiz, true);
    const tamanho = caixa.getSize(new THREE.Vector3());
    if (tamanho.y <= 0 || !Number.isFinite(tamanho.y)) throw new Error("caixa do modelo vazia");
    const escala = ALTURA_PADRAO / tamanho.y;
    const centro = caixa.getCenter(new THREE.Vector3());
    const ajuste = new THREE.Group();
    ajuste.scale.setScalar(escala);
    ajuste.position.set(-centro.x * escala, -caixa.min.y * escala, -centro.z * escala);
    ajuste.add(raiz);
    this.suporte.add(ajuste);
    this.modelo = ajuste;

    // Raio horizontal (o modelo gira, então vale o pior caso em x/z).
    const cantos = [caixa.min.x, caixa.max.x].flatMap((x) => [caixa.min.z, caixa.max.z].map((z) => [x, z]));
    this.raioModelo = Math.max(...cantos.map(([x, z]) => Math.hypot(x - centro.x, z - centro.z))) * escala;
    const larguraSombra = Math.max(tamanho.x, tamanho.z) * escala * 1.35;
    this.escalaSombra.set(larguraSombra, larguraSombra * 0.8);
    this.sombraBlob.scale.set(this.escalaSombra.x, this.escalaSombra.y, 1);
    this.enquadra();

    // Vida em repouso: abas/poses > animação idle > esqueleto > rig de grupos > flutuar.
    let repouso: string;
    if (this.opcoes.poses) {
      this.poser = new Poser(raiz, this.opcoes.poses);
      repouso = `poses por aba (${this.poser.gruposEncontrados} grupos)`;
      if (this.abaAtual) this.setAba(this.abaAtual, true);
      else this.poser.definir({ pose: {}, rosto: "padrao", objeto: "nenhum" }, { duracao: 0, sobressalto: 0, piscar: false });
    } else if (animacoes.length) {
      const clip = animacoes.find((a) => /idle/i.test(a.name)) ?? animacoes[0];
      this.mixer = new THREE.AnimationMixer(raiz);
      this.mixer.clipAction(clip).play();
      repouso = `animação "${clip.name}"`;
    } else {
      this.nosRig = this.montaRig(raiz);
      if (this.nosRig.length) {
        repouso = `rig por código (${this.nosRig.length} nós)`;
      } else if (esqueleto && this.montaRespiracaoOssos(raiz)) {
        repouso = "respiração pelos ossos";
      } else {
        this.flutuar = true;
        repouso = "flutuar";
      }
    }

    this.prontoEm = performance.now();
    this.eventos.pronto?.({
      triangulos,
      malhas,
      materiais: materiais.size,
      texturas: [...texturas.values()],
      animacoes: animacoes.map((a) => `${a.name} (${a.duration.toFixed(2)} s)`),
      esqueleto,
      repouso,
    });
  }

  private ajustaMaterial(m: THREE.MeshStandardMaterial, modoTextura: boolean | "auto", texturas: Map<string, string>) {
    for (const chave of ["map", "emissiveMap"] as const) {
      const tex = m[chave];
      if (!tex) continue;
      tex.colorSpace = THREE.SRGBColorSpace;
      const img = tex.image as { width?: number; height?: number } | undefined;
      const w = img?.width ?? 0;
      const h = img?.height ?? 0;
      const pixelada =
        modoTextura === true ||
        (modoTextura === "auto" && ((w > 0 && Math.max(w, h) <= LIMITE_PIXELADA) || tex.magFilter === THREE.NearestFilter));
      if (pixelada) {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
      } else {
        tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      }
      tex.needsUpdate = true;
      texturas.set(tex.uuid, `${tex.name || chave} ${w}×${h}${pixelada ? " (nearest)" : ""}`);
    }
    // Recortes: BLEND com textura vira alphaTest — sem ordenação, sem buracos.
    if (m.transparent && m.map && m.opacity >= 1) {
      m.transparent = false;
      m.alphaTest = Math.max(m.alphaTest, 0.5);
      m.depthWrite = true;
    }
    // Planos de uma face só (cabelo, asas, camada externa) visíveis dos dois lados.
    m.side = THREE.DoubleSide;
    // Sobreposições sem luz (olhos, telas) ficam coladas na face de baixo:
    // polygonOffset puxa elas para frente e evita z-fighting.
    if ((m as THREE.Material as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = -1;
      m.polygonOffsetUnits = -4;
    }
    m.needsUpdate = true;
  }

  /** Procura cada nó pelo nome (o mais raso ganha, já que o Blockbench repete nomes). */
  private montaRig(raiz: THREE.Object3D): NoRig[] {
    const porNome = new Map<string, NoRig>();
    for (const mov of this.opcoes.rig ?? []) {
      let alvo = porNome.get(mov.no);
      if (!alvo) {
        const obj = buscaRasa(raiz, mov.no);
        if (!obj) continue;
        alvo = { obj, pos0: obj.position.clone(), quat0: obj.quaternion.clone(), movs: [] };
        porNome.set(mov.no, alvo);
      }
      alvo.movs.push(mov);
    }
    return [...porNome.values()];
  }

  private montaRespiracaoOssos(raiz: THREE.Object3D) {
    raiz.traverse((o) => {
      const osso = o as THREE.Bone;
      if (!osso.isBone) return;
      if (/spine|chest|torso|peito|tronco/i.test(osso.name)) {
        this.ossosRespiracao.push({ osso, quat0: osso.quaternion.clone(), eixo: "x", amp: 0.025 });
      } else if (/head|cabe/i.test(osso.name)) {
        this.ossosRespiracao.push({ osso, quat0: osso.quaternion.clone(), eixo: "z", amp: 0.03 });
      }
    });
    return this.ossosRespiracao.length > 0;
  }

  // -------------------------------------------------------------------------
  // CÂMERA E ENQUADRAMENTO
  // -------------------------------------------------------------------------

  private enquadra() {
    const vFov = FOV * GRAU;
    // Largura útil: desconta o que o painel lateral cobre.
    const aspecto = Math.max(0.3, (this.largura - 2 * Math.abs(this.deslocAlvoX)) / this.altura);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspecto);
    const distAltura = ALTURA_PADRAO / 2 / Math.tan(vFov / 2);
    const distLargura = this.raioModelo / Math.tan(hFov / 2);
    this.distanciaBase = Math.max(distAltura, distLargura) * MARGEM_ENQUADRAMENTO + this.raioModelo * 0.5;
  }

  private posicionaCamera(t: number) {
    // Ao aproximar, o foco sobe do alvo da aba para a altura do rosto.
    const progressoZoom = Math.pow(limita((this.zoom - 1) / (ZOOM_MAX - 1), 0, 1), 0.6);
    this.alvoEfetivo = lerp(this.camAlvoY, Math.max(this.camAlvoY, 0.8), progressoZoom);
    const alvoY = this.alvoEfetivo * ALTURA_PADRAO;
    const balanco = this.movimentoReduzido ? 0 : this.pesoOcioso;
    const e = this.elev + balanco * BALANCO_ELEVACAO * Math.sin(t * 0.31);
    const a = balanco * BALANCO_GIRO * Math.sin(t * 0.23);
    // FOV diferente com distância compensada: muda a perspectiva, não o tamanho.
    const compensaFov = Math.tan((FOV * GRAU) / 2) / Math.tan((this.camFov * GRAU) / 2);
    const dist = ((this.distanciaBase * this.camDist * compensaFov) / this.zoom) * (1 + balanco * 0.015 * Math.sin(t * 0.17));
    this.camera.position.set(
      Math.sin(a) * Math.cos(e) * dist,
      alvoY + Math.sin(e) * dist,
      Math.cos(a) * Math.cos(e) * dist
    );
    this.camera.lookAt(0, alvoY, 0);
    this.aplicaProjecao();
  }

  /** FOV e deslocamento da vista: só recalcula a projeção quando mudam. */
  private aplicaProjecao() {
    const dx = Math.round(this.deslocX * 2) / 2;
    const dy = Math.round(this.deslocY * 2) / 2;
    const fov = arredonda(this.camFov, 3);
    const chave = `${fov}|${dx}|${dy}|${this.largura}|${this.altura}`;
    if (chave === this.projecaoAplicada) return;
    this.projecaoAplicada = chave;
    this.camera.fov = fov;
    if (dx || dy) this.camera.setViewOffset(this.largura, this.altura, dx, dy, this.largura, this.altura);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Enquadramento da aba atual (ou o padrão, sem abas). */
  private enquadramento(): QuadroCamera {
    const c = this.abaAtual?.camera;
    return {
      giro: this.giroInicial + (c?.giro ?? 0) * GRAU,
      elev: c ? limita(c.elevacao * GRAU, ELEVACAO_MIN, ELEVACAO_MAX) : ELEVACAO_INICIAL,
      alvoY: c?.alvoY ?? 0.5,
      dist: c?.distancia ?? 1,
      fov: c?.fov ?? FOV,
    };
  }

  private vaiPara(q: QuadroCamera, instantaneo: boolean) {
    // Giro: o equivalente mais próximo, para não dar voltas inteiras.
    q.giro += Math.round((this.giro - q.giro) / (Math.PI * 2)) * Math.PI * 2;
    this.velGiro = 0;
    this.velElev = 0;
    this.zoomAlvo = 1;
    if (instantaneo) {
      this.giro = q.giro;
      this.elev = q.elev;
      this.camAlvoY = q.alvoY;
      this.camDist = q.dist;
      this.camFov = q.fov;
      this.zoom = 1;
      this.contraluz.color.copy(this.corPara);
      this.transCor = null;
      this.transCam = null;
      return;
    }
    this.iniciaCor(DURACAO_CAMERA);
    this.transCam = {
      de: { giro: this.giro, elev: this.elev, alvoY: this.camAlvoY, dist: this.camDist, fov: this.camFov },
      para: q,
      p: 0,
      dur: DURACAO_CAMERA,
      mesa: true,
    };
  }

  reiniciar() {
    this.vaiPara(this.enquadramento(), false);
    this.marcaInput();
  }

  private iniciaCor(dur: number) {
    this.corDe.copy(this.contraluz.color);
    this.transCor = { p: 0, dur };
  }

  /** Troca de aba: pose (com overshoot), rosto/objeto (com piscar), câmera e contraluz. */
  setAba(aba: AbaInspect, instantaneo = false) {
    this.abaAtual = aba;
    this.corPara.set(this.sobreposicao?.contraluz ?? aba.contraluz);
    this.vaiPara(this.enquadramento(), instantaneo || !this.modelo);
    this.poser?.definir(
      { pose: aba.pose, rosto: this.sobreposicao?.rosto ?? aba.rosto, objeto: aba.objeto, repouso: aba.repouso },
      {
        duracao: instantaneo ? 0 : DURACAO_TRANSICAO,
        sobressalto: this.movimentoReduzido ? 0 : SOBRESSALTO,
        piscar: !instantaneo && !this.movimentoReduzido,
      }
    );
    this.marcaInput();
  }

  /** Rosto/contraluz por cima dos da aba (estado do hub); null devolve os da aba. */
  setSobreposicao(sob: Sobreposicao) {
    const antes = this.sobreposicao;
    if (antes?.rosto === sob?.rosto && antes?.contraluz === sob?.contraluz) return;
    this.sobreposicao = sob;
    const rosto = sob?.rosto ?? this.abaAtual?.rosto;
    if (rosto) this.poser?.trocaRosto(rosto, !this.movimentoReduzido);
    this.corPara.set(sob?.contraluz ?? this.abaAtual?.contraluz ?? COR_MEL);
    this.iniciaCor(DURACAO_COR);
  }

  /** Editor: aplica pose/rosto/objeto quase na hora, sem mexer na câmera. */
  setPoseAoVivo(estado: EstadoPose) {
    this.poser?.definir(estado, { duracao: DURACAO_AO_VIVO, sobressalto: 0, piscar: false });
  }

  setEditando(sim: boolean) {
    if (this.poser) this.poser.editando = sim;
  }

  /** Câmera atual no formato de enquadramento de aba (para o editor). */
  lerCamera(): CameraAba {
    const giro = THREE.MathUtils.euclideanModulo(this.giro - this.giroInicial + Math.PI, Math.PI * 2) - Math.PI;
    return {
      alvoY: arredonda(this.alvoEfetivo, 2),
      distancia: arredonda(this.camDist / this.zoom, 2),
      elevacao: arredonda(THREE.MathUtils.radToDeg(this.elev), 1),
      giro: Math.round(THREE.MathUtils.radToDeg(giro)),
      fov: arredonda(this.camFov, 1),
    };
  }

  /** Desloca o centro da vista (px CSS): o modelo fica centrado na área livre. */
  setDeslocamento(x: number, y: number) {
    this.deslocAlvoX = x;
    this.deslocAlvoY = y;
    this.enquadra();
  }

  setAutoGiro(ligado: boolean) {
    this.autoGiro = ligado;
    this.marcaInput();
  }

  /** PNG do quadro atual (só canvas: modelo e fundo, sem HUD). */
  capturarPng(): string {
    this.renderiza();
    return this.renderer.domElement.toDataURL("image/png");
  }

  // -------------------------------------------------------------------------
  // ENTRADA (mouse e toque via Pointer Events)
  // -------------------------------------------------------------------------

  private marcaInput() {
    this.ultimoInput = performance.now();
  }

  private ligaEventos(canvas: HTMLCanvasElement) {
    const ouvir = <K extends keyof EventosCanvas>(
      alvo: HTMLElement,
      tipo: K,
      fn: (e: EventosCanvas[K]) => void,
      opts?: AddEventListenerOptions
    ) => {
      const ouvinte = fn as EventListener;
      alvo.addEventListener(tipo, ouvinte, opts);
      this.limpezas.push(() => alvo.removeEventListener(tipo, ouvinte, opts));
    };

    ouvir(canvas, "pointerdown", (e) => this.aoPressionar(e));
    ouvir(canvas, "pointermove", (e) => this.aoMover(e));
    ouvir(canvas, "pointerup", (e) => this.aoSoltar(e, true));
    ouvir(canvas, "pointercancel", (e) => this.aoSoltar(e, false));
    ouvir(canvas, "lostpointercapture", (e) => {
      if (this.ponteiros.has(e.pointerId)) this.aoSoltar(e, false);
    });
    ouvir(canvas, "wheel", (e) => this.aoRolar(e), { passive: false });
    ouvir(canvas, "contextmenu", (e) => e.preventDefault());
    // Safari: impede o zoom da página no gesto de pinça.
    ouvir(canvas, "gesturestart", (e) => e.preventDefault());

    ouvir(canvas, "webglcontextlost", (e) => {
      e.preventDefault();
      this.perdido = true;
      cancelAnimationFrame(this.raf);
      this.eventos.contexto?.(true);
    });
    ouvir(canvas, "webglcontextrestored", () => {
      this.perdido = false;
      this.eventos.contexto?.(false);
      this.redimensiona();
      if (!this.parado) this.iniciaLaco();
    });
  }

  private aoPressionar(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.marcaInput();
    if (this.ponteiros.size === 1) {
      this.comecaArrasto();
      this.movimentoToque = 0;
      this.inicioToque = { t: e.timeStamp, x: e.clientX, y: e.clientY };
    } else if (this.ponteiros.size === 2) {
      this.fimArrasto(false);
      this.pinca = { dist0: this.distanciaPinca(), zoom0: this.zoomAlvo };
      this.movimentoToque = Infinity;
    }
  }

  private aoMover(e: PointerEvent) {
    const anterior = this.ponteiros.get(e.pointerId);
    if (!anterior) return;
    const dx = e.clientX - anterior.x;
    const dy = e.clientY - anterior.y;
    anterior.x = e.clientX;
    anterior.y = e.clientY;
    this.marcaInput();

    if (this.ponteiros.size >= 2 && this.pinca) {
      const dist = this.distanciaPinca();
      if (this.pinca.dist0 > 0) this.zoomAlvo = limita((this.pinca.zoom0 * dist) / this.pinca.dist0, ZOOM_MIN, ZOOM_MAX);
      return;
    }
    if (!this.arrastando) return;
    const dGiro = dx * SENSIBILIDADE_GIRO;
    const dElev = dy * SENSIBILIDADE_ELEVACAO;
    this.giro += dGiro;
    this.elev = limita(this.elev + dElev, ELEVACAO_MIN, ELEVACAO_MAX);
    this.movimentoToque += Math.abs(dx) + Math.abs(dy);
    const agora = e.timeStamp;
    this.amostras.push({ t: agora, giro: dGiro, elev: dElev });
    while (this.amostras.length && agora - this.amostras[0].t > 120) this.amostras.shift();
  }

  private aoSoltar(e: PointerEvent, valeToque: boolean) {
    if (!this.ponteiros.has(e.pointerId)) return;
    this.ponteiros.delete(e.pointerId);
    if (this.renderer.domElement.hasPointerCapture(e.pointerId)) {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    }
    this.marcaInput();

    if (this.ponteiros.size === 1) {
      // Saiu da pinça com um dedo ainda na tela: volta a girar, sem inércia.
      this.pinca = null;
      this.comecaArrasto();
      return;
    }
    if (this.ponteiros.size > 0) return;
    this.pinca = null;
    this.fimArrasto(true, e.timeStamp);

    if (!valeToque) return;
    // Hora do evento, não do handler: com o quadro pesado, o handler atrasa
    // e o toque duplo deixaria de ser reconhecido.
    const agora = e.timeStamp;
    const foiToque = this.movimentoToque < 8 && agora - this.inicioToque.t < 320;
    if (!foiToque) return;
    // Intervalo entre o fim do toque anterior e o começo deste.
    const perto = Math.hypot(e.clientX - this.ultimoToque.x, e.clientY - this.ultimoToque.y) < 32;
    if (this.inicioToque.t - this.ultimoToque.t < 320 && perto) {
      this.reiniciar();
      this.ultimoToque.t = -Infinity;
    } else {
      this.ultimoToque = { t: agora, x: e.clientX, y: e.clientY };
    }
  }

  private comecaArrasto() {
    if (this.transCam) this.transCam.mesa = false;
    this.arrastando = true;
    this.velGiro = 0;
    this.velElev = 0;
    this.amostras = [];
    this.eventos.arrastando?.(true);
  }

  private fimArrasto(comInercia: boolean, agora = performance.now()) {
    if (!this.arrastando) return;
    this.arrastando = false;
    this.eventos.arrastando?.(false);
    const recentes = this.amostras.filter((a) => agora - a.t < 100);
    if (comInercia && recentes.length >= 2) {
      const janela = Math.max(16, agora - recentes[0].t) / 1000;
      this.velGiro = limita(recentes.reduce((s, a) => s + a.giro, 0) / janela, -14, 14);
      this.velElev = limita(recentes.reduce((s, a) => s + a.elev, 0) / janela, -4, 4);
    }
    this.amostras = [];
  }

  private distanciaPinca() {
    const [a, b] = [...this.ponteiros.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private aoRolar(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    this.zoomAlvo = limita(this.zoomAlvo * Math.exp(-delta * 0.0015), ZOOM_MIN, ZOOM_MAX);
    this.marcaInput();
  }

  // -------------------------------------------------------------------------
  // LAÇO
  // -------------------------------------------------------------------------

  private iniciaLaco() {
    cancelAnimationFrame(this.raf);
    this.ultimoQuadro = performance.now();
    this.inicioFps = this.ultimoQuadro;
    this.quadrosFps = 0;
    this.raf = requestAnimationFrame(this.quadro);
  }

  private readonly quadro = (agora: number) => {
    if (this.descartado || this.perdido || this.parado) return;
    this.raf = requestAnimationFrame(this.quadro);
    const dt = Math.min(0.05, Math.max(0, (agora - this.ultimoQuadro) / 1000));
    this.ultimoQuadro = agora;
    const t = agora / 1000;

    this.atualizaMesa(dt);
    const ocioso = !this.arrastando && agora - this.ultimoInput > OCIOSO_MS;
    this.pesoOcioso = aproxima(this.pesoOcioso, ocioso ? 1 : 0, ocioso ? 0.8 : 4, dt);
    this.posicionaCamera(t);
    this.atualizaRepouso(t, dt);

    this.uniFundo.uTempo.value = t;
    this.uniFundo.uParallax.value.set(
      THREE.MathUtils.euclideanModulo(this.giro * 0.09, 1),
      (this.elev - ELEVACAO_INICIAL) * 0.25
    );
    this.uniDisco.uTempo.value = t;
    this.uniParticulas.uTempo.value = t;

    this.renderiza();
    this.mediFps(agora);

    if (agora - this.ultimoHud > 110) {
      this.ultimoHud = agora;
      this.eventos.hud?.({
        rotacao: Math.round(THREE.MathUtils.radToDeg(THREE.MathUtils.euclideanModulo(this.giro - this.giroInicial, Math.PI * 2))) % 360,
        zoom: this.zoom,
        elevacao: THREE.MathUtils.radToDeg(this.elev),
        fps: this.fps,
        bloom: this.bloomAtivo,
      });
    }
  };

  private atualizaMesa(dt: number) {
    const tc = this.transCam;
    if (tc) {
      tc.p = Math.min(1, tc.p + dt / tc.dur);
      const e = easeOutCubic(tc.p);
      this.camAlvoY = lerp(tc.de.alvoY, tc.para.alvoY, e);
      this.camDist = lerp(tc.de.dist, tc.para.dist, e);
      this.camFov = lerp(tc.de.fov, tc.para.fov, e);
      if (tc.mesa && !this.arrastando) {
        this.giro = lerp(tc.de.giro, tc.para.giro, e);
        this.elev = lerp(tc.de.elev, tc.para.elev, e);
      }
      if (tc.p >= 1) this.transCam = null;
    }
    if (!this.arrastando && !this.transCam?.mesa) {
      if (this.autoGiro) this.velGiro = aproxima(this.velGiro, VELOCIDADE_AUTO_GIRO, 1.5, dt);
      else this.velGiro *= Math.exp(-AMORTECIMENTO_INERCIA * dt);
      this.velElev *= Math.exp(-AMORTECIMENTO_INERCIA * 1.6 * dt);
      this.giro += this.velGiro * dt;
      this.elev = limita(this.elev + this.velElev * dt, ELEVACAO_MIN, ELEVACAO_MAX);
    }
    const cor = this.transCor;
    if (cor) {
      cor.p = Math.min(1, cor.p + dt / cor.dur);
      this.contraluz.color.lerpColors(this.corDe, this.corPara, easeOutCubic(cor.p));
      if (cor.p >= 1) this.transCor = null;
    }
    this.zoom = aproxima(this.zoom, this.zoomAlvo, 10, dt);
    this.deslocX = aproxima(this.deslocX, this.deslocAlvoX, 8, dt);
    this.deslocY = aproxima(this.deslocY, this.deslocAlvoY, 8, dt);
    this.mesa.rotation.y = this.giro;
  }

  private atualizaRepouso(t: number, dt: number) {
    if (this.mixer) this.mixer.update(dt);
    const amplitude = this.movimentoReduzido ? 0.4 : 1;

    if (this.poser) {
      this.poser.atualizar(dt, t, amplitude);
      // Pés no chão: se uma perna girar e descer abaixo de y = 0, o modelo sobe.
      this.suporte.position.y = 0;
      this.mesa.updateMatrixWorld(true);
      const min = this.poser.minYPes();
      this.suporte.position.y = Number.isFinite(min) && Math.abs(min) > 1e-4 ? -min : 0;
      return;
    }

    const q = new THREE.Quaternion();
    for (const no of this.nosRig) {
      no.obj.position.copy(no.pos0);
      no.obj.quaternion.copy(no.quat0);
      for (const m of no.movs) {
        const v = Math.sin((t * m.frequencia + (m.fase ?? 0)) * Math.PI * 2) * m.amplitude * amplitude;
        if (m.tipo === "pos") no.obj.position[m.eixo] += v;
        else no.obj.quaternion.multiply(q.setFromAxisAngle(EIXOS[m.eixo], v));
      }
    }
    for (const o of this.ossosRespiracao) {
      const v = Math.sin(t * Math.PI * 2 * 0.25) * o.amp * amplitude;
      o.osso.quaternion.copy(o.quat0).multiply(q.setFromAxisAngle(EIXOS[o.eixo], v));
    }
    if (this.flutuar) {
      const y = (Math.sin(t * 1.1) * 0.5 + 0.5) * 0.035 * amplitude;
      this.suporte.position.y = y;
      const s = 1 - y * 3;
      this.sombraBlob.scale.set(this.escalaSombra.x * s, this.escalaSombra.y * s, 1);
    }
  }

  private renderiza() {
    if (this.bloomAtivo && this.composer) this.composer.render();
    else this.renderer.render(this.cena, this.camera);
  }

  // -------------------------------------------------------------------------
  // DESEMPENHO
  // -------------------------------------------------------------------------

  private configuraBloom() {
    if (this.bloomModo === false) return;
    const tam = this.renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.cena, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(tam.x, tam.y), BLOOM_FORCA, BLOOM_RAIO, BLOOM_LIMIAR));
    this.composer.addPass(new OutputPass());
    this.bloomAtivo = true;
  }

  /** A cada segundo: fps abaixo de FPS_MINIMO por 2 s seguidos desliga o bloom
   *  (modo "auto"); persistindo, baixa o pixelRatio até 1. */
  private mediFps(agora: number) {
    this.quadrosFps++;
    const decorrido = agora - this.inicioFps;
    if (decorrido < 1000) return;
    const valido = decorrido < 2000 && document.visibilityState === "visible";
    this.fps = Math.round((this.quadrosFps * 1000) / decorrido);
    this.quadrosFps = 0;
    this.inicioFps = agora;
    if (!valido || !this.prontoEm || agora - this.prontoEm < 2500) return;

    if (this.fps >= FPS_MINIMO) {
      this.segundosLentos = 0;
      this.segundosCriticos = 0;
      return;
    }
    // Já sem bloom e no pixelRatio mínimo, e ainda assim muito lento: para e avisa.
    const noMinimo = !this.bloomAtivo && (this.fatorQualidade <= 0.5 || this.pixelRatioAtual() <= 1);
    if (noMinimo && this.fps < FPS_CRITICO) {
      if (++this.segundosCriticos >= SEGUNDOS_CRITICOS) {
        this.parado = true;
        cancelAnimationFrame(this.raf);
        this.eventos.lento?.();
      }
      return;
    }
    this.segundosCriticos = 0;
    if (++this.segundosLentos < 2) return;
    this.segundosLentos = 0;
    if (this.bloomAtivo && this.bloomModo === "auto") {
      this.bloomAtivo = false;
    } else if (this.fatorQualidade > 0.5 && this.pixelRatioAtual() > 1) {
      this.fatorQualidade -= 0.25;
      this.redimensiona();
    }
  }

  private pixelRatioAtual() {
    return Math.max(1, Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX) * this.fatorQualidade);
  }

  private redimensiona() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const pr = this.pixelRatioAtual();
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(pr);
    this.composer?.setSize(w, h);
    this.largura = w;
    this.altura = h;
    this.camera.aspect = w / h;
    this.projecaoAplicada = "";
    this.aplicaProjecao();
    this.renderer.getDrawingBufferSize(this.uniFundo.uRes.value);
    this.uniParticulas.uPixelRatio.value = pr * (h / 800);
    this.enquadra();
  }

  // -------------------------------------------------------------------------
  // DESCARTE
  // -------------------------------------------------------------------------

  descartar() {
    if (this.descartado) return;
    this.descartado = true;
    cancelAnimationFrame(this.raf);
    this.observador.disconnect();
    for (const limpa of this.limpezas.splice(0)) limpa();
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.mixer.getRoot());
    descartaObjeto(this.cena);
    this.luzChave.shadow.dispose();
    for (const passo of this.composer?.passes ?? []) passo.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

// ---------------------------------------------------------------------------
// AUXILIARES
// ---------------------------------------------------------------------------

/** Libera geometrias, materiais e todas as texturas presas nos materiais. */
function descartaObjeto(raiz: THREE.Object3D) {
  raiz.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) {
      for (const valor of Object.values(mat)) {
        if (valor instanceof THREE.Texture) valor.dispose();
      }
      const uniforms = (mat as THREE.ShaderMaterial).uniforms;
      if (uniforms) {
        for (const u of Object.values(uniforms)) if (u.value instanceof THREE.Texture) u.value.dispose();
      }
      mat.dispose();
    }
  });
}

/** Gradiente radial para a sombra de contato (preto no centro, some na borda). */
function texturaBlob() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
