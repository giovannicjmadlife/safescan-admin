"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  Download,
  Eye,
  FileText,
  Flame,
  ImageIcon,
  Loader2,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type LinhaBanco = Record<string, unknown>;

type TelaAdmin =
  | "dashboard"
  | "vistorias"
  | "empresas"
  | "colaboradores"
  | "relatorios"
  | "mapa";

const BUCKET_FOTOS = "vistoria-fotos";

const meses = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const tiposDashboard = [
  "EXTINTOR",
  "EXTINTORES",
  "HIDRANTE",
  "HIDRANTES",
  "LAVA_OLHOS",
  "LAVA-OLHOS",
  "LAVA OLHOS",
];

const coresGrafico = ["#991b1b", "#dc2626", "#f97316", "#facc15", "#7f1d1d"];

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pegarCampo(linha: LinhaBanco, campos: string[]) {
  for (const campo of campos) {
    const valor = linha[campo];

    if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
      return valor;
    }
  }

  return "";
}

function pegarData(linha: LinhaBanco) {
  const candidatos = [
    "created_at",
    "criado_em",
    "data",
    "data_vistoria",
    "sincronizado_em",
    "updated_at",
  ];

  for (const campo of candidatos) {
    const valor = linha[campo];

    if (!valor) continue;

    const data = new Date(String(valor));

    if (!Number.isNaN(data.getTime())) {
      return data;
    }
  }

  return null;
}

function papelEhAdministrativo(papel: unknown) {
  const papelNormalizado = normalizarTexto(papel);
  return papelNormalizado === "ADMIN" || papelNormalizado === "SUPER_ADMIN";
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function formatarData(data: Date | null) {
  if (!data) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function tituloDaTela(tela: TelaAdmin) {
  if (tela === "dashboard") return "Dashboard Geral";
  if (tela === "vistorias") return "Vistorias";
  if (tela === "empresas") return "Empresas";
  if (tela === "colaboradores") return "Colaboradores";
  if (tela === "relatorios") return "Relatórios";
  return "Mapa";
}

function descricaoDaTela(tela: TelaAdmin) {
  if (tela === "dashboard") {
    return "Visão executiva das vistorias realizadas em campo.";
  }

  if (tela === "vistorias") {
    return "Consulta, filtros e detalhe das vistorias sincronizadas pelo aplicativo.";
  }

  if (tela === "empresas") {
    return "Resumo executivo por unidade, tipo de equipamento, não conformidades e última vistoria.";
  }

  if (tela === "colaboradores") {
    return "Área preparada para produtividade e gestão de usuários.";
  }

  if (tela === "relatorios") {
    return "Relatórios profissionais com filtros, foto visível, checklist, responsável e exportação em PDF.";
  }

  return "Mapa operacional com localização GPS das vistorias, filtros e rota pelo Google Maps.";
}

function obterTipo(vistoria: LinhaBanco) {
  return String(
    pegarCampo(vistoria, ["tipo", "tipo_vistoria", "categoria"]) ||
      "Tipo não informado"
  );
}

function ehTesteHidrostatico(linha: LinhaBanco) {
  const tipo = normalizarTexto(obterTipo(linha));
  return tipo.includes("TESTE") || tipo.includes("HIDROSTATICO");
}

function ehTipoDoDashboard(linha: LinhaBanco) {
  const tipo = normalizarTexto(obterTipo(linha));

  if (!tipo || tipo === "TIPO NAO INFORMADO") return true;

  if (tipo.includes("TESTE") || tipo.includes("HIDROSTATICO")) {
    return false;
  }

  return tiposDashboard.some((permitido) => tipo === normalizarTexto(permitido));
}

function ehRespostaCriticaPorPergunta(
  pergunta: unknown,
  resposta: unknown,
  tipoVistoria?: unknown
) {
  const perguntaNormalizada = normalizarTexto(pergunta);
  const respostaNormalizada = normalizarTexto(resposta);
  const tipoNormalizado = normalizarTexto(tipoVistoria);

  if (
    tipoNormalizado.includes("TESTE") ||
    tipoNormalizado.includes("HIDROSTATICO")
  ) {
    const perguntasDeServicoNaoObrigatorio = [
      "REEMPATACAO",
      "SUBSTITUICAO DE UNIOES",
      "SUBSTITUICAO DE VEDACAO",
      "SUBSTITUICAO DE ANEIS",
    ];

    if (perguntasDeServicoNaoObrigatorio.includes(perguntaNormalizada)) {
      return false;
    }

    if (respostaNormalizada === "RUIM") {
      return true;
    }

    if (perguntaNormalizada === "MARCACAO" && respostaNormalizada === "NAO") {
      return true;
    }

    if (
      perguntaNormalizada === "ENSAIO HIDROSTATICO" &&
      respostaNormalizada === "NAO"
    ) {
      return true;
    }

    if (
      perguntaNormalizada === "NOVO ENSAIO HIDROSTATICO" &&
      respostaNormalizada === "NAO"
    ) {
      return true;
    }

    if (perguntaNormalizada === "LIMPEZA" && respostaNormalizada === "NAO") {
      return true;
    }

    return false;
  }

  return (
    respostaNormalizada === "NAO" ||
    respostaNormalizada === "RUIM" ||
    respostaNormalizada === "NAO CONFORME"
  );
}

function obterEquipamento(vistoria: LinhaBanco) {
  const equipamentoSalvo = pegarCampo(vistoria, [
    "equipamento",
    "codigo",
    "identificacao",
    "nome",
    "item",
    "numero",
    "tag",
    "patrimonio",
    "descricao",
    "equipamento_nome",
    "nome_equipamento",
    "codigo_equipamento",
  ]);

  if (equipamentoSalvo) {
    return String(equipamentoSalvo);
  }

  if (ehTesteHidrostatico(vistoria)) {
    return "Mangueira não identificada";
  }

  return "Equipamento não informado";
}

function obterUnidade(vistoria: LinhaBanco) {
  return String(
    pegarCampo(vistoria, [
      "unidade",
      "empresa",
      "empresa_nome",
      "area",
      "local",
      "setor",
      "nome_empresa",
    ]) || "Unidade não informada"
  );
}

function obterColaborador(vistoria: LinhaBanco) {
  return String(
    pegarCampo(vistoria, [
      "colaborador",
      "responsavel",
      "usuario",
      "usuario_nome",
      "nome_usuario",
      "usuario_email",
      "email",
      "criado_por",
      "user_email",
    ]) || "Não informado"
  );
}


function converterCoordenada(valor: unknown) {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor;
  }

  const texto = String(valor ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!texto) return null;

  const numero = Number(texto.replace(/[^0-9+.-]/g, ""));

  if (!Number.isFinite(numero)) return null;

  return numero;
}

function coordenadaValida(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function extrairCoordenadas(vistoria: LinhaBanco) {
  const latitudeDireta = converterCoordenada(
    pegarCampo(vistoria, [
      "latitude",
      "lat",
      "gps_latitude",
      "geo_latitude",
      "localizacao_latitude",
      "coord_latitude",
      "coordenada_latitude",
    ])
  );

  const longitudeDireta = converterCoordenada(
    pegarCampo(vistoria, [
      "longitude",
      "lng",
      "lon",
      "long",
      "gps_longitude",
      "geo_longitude",
      "localizacao_longitude",
      "coord_longitude",
      "coordenada_longitude",
    ])
  );

  if (
    latitudeDireta !== null &&
    longitudeDireta !== null &&
    coordenadaValida(latitudeDireta, longitudeDireta)
  ) {
    return { latitude: latitudeDireta, longitude: longitudeDireta };
  }

  const textoGps = String(
    pegarCampo(vistoria, [
      "gps",
      "coordenadas",
      "coordenada",
      "localizacao_gps",
      "geolocalizacao",
      "posicao_gps",
      "geo",
      "location",
    ]) || ""
  );

  if (!textoGps.trim()) return null;

  const numeros =
    textoGps
      .match(/-?\d{1,3}(?:[.,]\d+)?/g)
      ?.map((numero) => Number(numero.replace(",", ".")))
      .filter((numero) => Number.isFinite(numero)) ?? [];

  for (let indice = 0; indice < numeros.length - 1; indice += 1) {
    const latitude = numeros[indice];
    const longitude = numeros[indice + 1];

    if (coordenadaValida(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}

function montarUrlGoogleMaps(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function montarUrlRotaGoogleMaps(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

function montarUrlMapaEmbed(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}&z=18&output=embed`;
}

function formatarCoordenada(valor: number) {
  return valor.toFixed(6).replace(".", ",");
}

function obterUrlFoto(foto: LinhaBanco) {
  const valor = String(
    pegarCampo(foto, [
      "url",
      "foto_url",
      "public_url",
      "arquivo_url",
      "storage_url",
      "path",
      "caminho",
    ]) || ""
  ).trim();

  if (!valor) return "";

  if (
    valor.startsWith("http") ||
    valor.startsWith("data:") ||
    valor.startsWith("blob:")
  ) {
    return valor;
  }

  const caminhoLimpo = valor
    .replace(/^\/+/, "")
    .replace(`${BUCKET_FOTOS}/`, "");

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminhoLimpo);

  return data.publicUrl || valor;
}

function obterRespostaExibida(resposta: LinhaBanco) {
  const respostaOriginal = String(resposta.resposta ?? "-");
  const detalhe = String(resposta.detalhe ?? "").trim();

  if (normalizarTexto(respostaOriginal) === "INFORMAR" && detalhe) {
    return detalhe;
  }

  return respostaOriginal;
}

export default function Home() {
  const [telaAtiva, setTelaAtiva] = useState<TelaAdmin>("dashboard");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [papelUsuario, setPapelUsuario] = useState<string | null>(null);

  const [carregandoLogin, setCarregandoLogin] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(false);

  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [vistorias, setVistorias] = useState<LinhaBanco[]>([]);
  const [respostas, setRespostas] = useState<LinhaBanco[]>([]);
  const [fotos, setFotos] = useState<LinhaBanco[]>([]);
  const [colaboradores, setColaboradores] = useState<LinhaBanco[]>([]);

  const [carregandoColaboradores, setCarregandoColaboradores] = useState(false);
  const [salvandoColaborador, setSalvandoColaborador] = useState(false);

  const [nomeColaborador, setNomeColaborador] = useState("");
  const [emailColaborador, setEmailColaborador] = useState("");
  const [senhaColaborador, setSenhaColaborador] = useState("");
  const [buscaColaborador, setBuscaColaborador] = useState("");

  const [vistoriaSelecionadaId, setVistoriaSelecionadaId] = useState<
    string | null
  >(null);

  const [buscaVistoria, setBuscaVistoria] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("TODAS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  const [relEmpresa, setRelEmpresa] = useState("TODAS");
  const [relArea, setRelArea] = useState("TODAS");
  const [relTipo, setRelTipo] = useState("TODOS");
  const [relColaborador, setRelColaborador] = useState("TODOS");
  const [relDataInicio, setRelDataInicio] = useState("");
  const [relDataFim, setRelDataFim] = useState("");
  const [relatoriosBuscados, setRelatoriosBuscados] = useState(false);
  const [gerandoRelatorioId, setGerandoRelatorioId] = useState<string | null>(null);

  const [mapaBusca, setMapaBusca] = useState("");
  const [mapaEmpresa, setMapaEmpresa] = useState("TODAS");
  const [mapaArea, setMapaArea] = useState("TODAS");
  const [mapaTipo, setMapaTipo] = useState("TODOS");
  const [mapaColaborador, setMapaColaborador] = useState("TODOS");
  const [mapaDataInicio, setMapaDataInicio] = useState("");
  const [mapaDataFim, setMapaDataFim] = useState("");
  const [mapaSelecionadaId, setMapaSelecionadaId] = useState<string | null>(null);

  async function verificarPerfilAdministrativo(userId: string) {
    const { data, error } = await supabase
      .from("perfis")
      .select("id, email, papel, ativo")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      setErro(`Erro ao verificar perfil administrativo: ${error.message}`);
      return false;
    }

    if (!data) {
      setErro(
        "Acesso bloqueado: não existe perfil vinculado a este usuário na tabela public.perfis."
      );
      return false;
    }

    if (data.ativo !== true) {
      setErro("Acesso bloqueado: este usuário está inativo.");
      return false;
    }

    if (!papelEhAdministrativo(data.papel)) {
      setErro(
        `Acesso bloqueado: este usuário está como ${String(
          data.papel
        )}, mas o painel exige ADMIN ou SUPER_ADMIN.`
      );
      return false;
    }

    setPapelUsuario(String(data.papel));
    return true;
  }

  async function carregarDados() {
    setCarregandoDados(true);
    setErro("");
    setAviso("");

    const { data: vistoriasData, error: erroVistorias } = await supabase
      .from("vistorias")
      .select("*")
      .limit(3000);

    if (erroVistorias) {
      setErro(`Erro ao buscar vistorias: ${erroVistorias.message}`);
      setCarregandoDados(false);
      return;
    }

    const { data: respostasData, error: erroRespostas } = await supabase
      .from("vistoria_respostas")
      .select("*")
      .limit(15000);

    if (erroRespostas) {
      setErro(`Erro ao buscar respostas: ${erroRespostas.message}`);
      setCarregandoDados(false);
      return;
    }

    const { data: fotosData, error: erroFotos } = await supabase
      .from("vistoria_fotos")
      .select("*")
      .limit(5000);

    if (erroFotos) {
      setAviso(
        `As vistorias foram carregadas, mas a tabela vistoria_fotos não foi carregada: ${erroFotos.message}. O painel ainda tentará usar o campo foto_url da tabela vistorias.`
      );
      setFotos([]);
    } else {
      setFotos(fotosData ?? []);
    }

    setVistorias(vistoriasData ?? []);
    setRespostas(respostasData ?? []);
    setCarregandoDados(false);
  }

  async function obterTokenDeAcesso() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Sessão expirada. Saia e entre novamente no painel.");
    }

    return token;
  }

  async function carregarColaboradores() {
    setCarregandoColaboradores(true);
    setErro("");

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/listar-colaboradores", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao carregar colaboradores.");
      }

      setColaboradores(resultado.colaboradores ?? []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar colaboradores."
      );
    } finally {
      setCarregandoColaboradores(false);
    }
  }

  function gerarSenhaTemporaria() {
    const numero = Math.floor(100000 + Math.random() * 900000);
    setSenhaColaborador(`Safe${numero}!`);
  }

  async function cadastrarColaborador() {
    setErro("");
    setAviso("");

    const nome = nomeColaborador.trim();
    const email = emailColaborador.trim().toLowerCase();
    const senha = senhaColaborador.trim();

    if (!nome) {
      setErro("Informe o nome do colaborador.");
      return;
    }

    if (!email) {
      setErro("Informe o e-mail do colaborador.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha temporária precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSalvandoColaborador(true);

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/criar-colaborador", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome,
          email,
          senha,
          perfil: "colaborador",
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao criar colaborador.");
      }

      setAviso(`Colaborador ${nome} criado com sucesso.`);
      setNomeColaborador("");
      setEmailColaborador("");
      setSenhaColaborador("");
      await carregarColaboradores();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao criar colaborador."
      );
    } finally {
      setSalvandoColaborador(false);
    }
  }

  async function entrar() {
    setEntrando(true);
    setErro("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(`Erro no login: ${error.message}`);
      setEntrando(false);
      return;
    }

    const userId = data.user?.id;
    const userEmail = data.user?.email ?? null;

    if (!userId) {
      setErro("Erro no login: usuário não encontrado.");
      setEntrando(false);
      return;
    }

    const autorizado = await verificarPerfilAdministrativo(userId);

    if (!autorizado) {
      await supabase.auth.signOut();
      setSessionEmail(null);
      setPapelUsuario(null);
      setEntrando(false);
      return;
    }

    setSessionEmail(userEmail);
    setEntrando(false);
    await carregarDados();
  }

  async function sair() {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setPapelUsuario(null);
    setVistorias([]);
    setRespostas([]);
    setFotos([]);
    setColaboradores([]);
    setEmail("");
    setSenha("");
    setNomeColaborador("");
    setEmailColaborador("");
    setSenhaColaborador("");
    setBuscaColaborador("");
    setTelaAtiva("dashboard");
    setVistoriaSelecionadaId(null);
  }

  useEffect(() => {
    async function iniciar() {
      const { data } = await supabase.auth.getSession();
      const sessao = data.session;

      if (!sessao?.user) {
        setSessionEmail(null);
        setPapelUsuario(null);
        setCarregandoLogin(false);
        return;
      }

      const autorizado = await verificarPerfilAdministrativo(sessao.user.id);

      if (!autorizado) {
        await supabase.auth.signOut();
        setSessionEmail(null);
        setPapelUsuario(null);
        setCarregandoLogin(false);
        return;
      }

      setSessionEmail(sessao.user.email ?? null);
      setCarregandoLogin(false);
      await carregarDados();
    }

    iniciar();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setSessionEmail(null);
          setPapelUsuario(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionEmail) {
      carregarColaboradores();
    }
  }, [sessionEmail]);

  const dadosDashboard = useMemo(() => {
    const vistoriasGerais = vistorias.filter(ehTipoDoDashboard);
    const testesHidrostaticos = vistorias.filter(ehTesteHidrostatico);

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();

    const inicioHoje = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const vistoriasHoje = vistoriasGerais.filter((vistoria) => {
      const data = pegarData(vistoria);
      return data ? data >= inicioHoje : false;
    });

    const vistoriasMes = vistoriasGerais.filter((vistoria) => {
      const data = pegarData(vistoria);
      return data ? data >= inicioMes : false;
    });

    const idsDashboard = new Set(
      vistoriasGerais.map((vistoria) => String(vistoria.id))
    );

    const respostasDashboard = respostas.filter((resposta) =>
      idsDashboard.has(String(resposta.vistoria_id))
    );

    const naoConformidades = respostasDashboard.filter((resposta) => {
      const vistoriaDaResposta = vistorias.find(
        (vistoria) => String(vistoria.id) === String(resposta.vistoria_id)
      );

      return ehRespostaCriticaPorPergunta(
        resposta.pergunta,
        resposta.resposta,
        obterTipo(vistoriaDaResposta ?? {})
      );
    });

    const taxaConformidade =
      respostasDashboard.length === 0
        ? 0
        : Math.round(
            ((respostasDashboard.length - naoConformidades.length) /
              respostasDashboard.length) *
              100
          );

    const porTipo = {
      extintores: vistoriasGerais.filter((vistoria) =>
        normalizarTexto(obterTipo(vistoria)).includes("EXTINTOR")
      ).length,

      hidrantes: vistoriasGerais.filter((vistoria) =>
        normalizarTexto(obterTipo(vistoria)).includes("HIDRANTE")
      ).length,

      lavaOlhos: vistoriasGerais.filter((vistoria) =>
        normalizarTexto(obterTipo(vistoria)).includes("LAVA")
      ).length,
    };

    const vistoriasPorMes = meses.map((mes, indice) => {
      const total = vistoriasGerais.filter((vistoria) => {
        const data = pegarData(vistoria);

        return (
          data &&
          data.getFullYear() === anoAtual &&
          data.getMonth() === indice
        );
      }).length;

      return {
        mes,
        total,
      };
    });

    const conformidadePorMes = meses.map((mes, indice) => {
      const vistoriasDoMes = vistoriasGerais.filter((vistoria) => {
        const data = pegarData(vistoria);

        return (
          data &&
          data.getFullYear() === anoAtual &&
          data.getMonth() === indice
        );
      });

      const idsMes = new Set(
        vistoriasDoMes.map((vistoria) => String(vistoria.id))
      );

      const respostasMes = respostasDashboard.filter((resposta) =>
        idsMes.has(String(resposta.vistoria_id))
      );

      const naoConformesMes = respostasMes.filter((resposta) => {
        const vistoriaDaResposta = vistorias.find(
          (vistoria) => String(vistoria.id) === String(resposta.vistoria_id)
        );

        return ehRespostaCriticaPorPergunta(
          resposta.pergunta,
          resposta.resposta,
          obterTipo(vistoriaDaResposta ?? {})
        );
      });

      const taxa =
        respostasMes.length === 0
          ? 0
          : Math.round(
              ((respostasMes.length - naoConformesMes.length) /
                respostasMes.length) *
                100
            );

      return {
        mes,
        taxa,
      };
    });

    const distribuicaoTipos = [
      {
        nome: "Extintores",
        valor: porTipo.extintores,
      },
      {
        nome: "Hidrantes",
        valor: porTipo.hidrantes,
      },
      {
        nome: "Lava-olhos",
        valor: porTipo.lavaOlhos,
      },
    ];

    const perguntasCriticas = new Map<string, number>();

    for (const resposta of naoConformidades) {
      const pergunta = String(resposta.pergunta ?? "Não informado");
      perguntasCriticas.set(pergunta, (perguntasCriticas.get(pergunta) ?? 0) + 1);
    }

    const naoConformidadesPorPergunta = Array.from(perguntasCriticas.entries())
      .map(([pergunta, total]) => ({
        pergunta,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const agrupadoPorUnidade = new Map<string, LinhaBanco[]>();

    for (const vistoria of vistoriasGerais) {
      const unidade = obterUnidade(vistoria);

      if (!agrupadoPorUnidade.has(unidade)) {
        agrupadoPorUnidade.set(unidade, []);
      }

      agrupadoPorUnidade.get(unidade)?.push(vistoria);
    }

    const unidades = Array.from(agrupadoPorUnidade.entries())
      .map(([nome, itens]) => {
        const itensOrdenados = [...itens].sort((a, b) => {
          const dataA = pegarData(a)?.getTime() ?? 0;
          const dataB = pegarData(b)?.getTime() ?? 0;
          return dataB - dataA;
        });

        const idsUnidade = new Set(itens.map((vistoria) => String(vistoria.id)));

        const naoConformidadesUnidade = respostasDashboard.filter((resposta) => {
          if (!idsUnidade.has(String(resposta.vistoria_id))) return false;

          const vistoriaDaResposta = itens.find(
            (vistoria) => String(vistoria.id) === String(resposta.vistoria_id)
          );

          return ehRespostaCriticaPorPergunta(
            resposta.pergunta,
            resposta.resposta,
            obterTipo(vistoriaDaResposta ?? {})
          );
        }).length;

        return {
          nome,
          total: itens.length,
          extintores: itens.filter((vistoria) =>
            normalizarTexto(obterTipo(vistoria)).includes("EXTINTOR")
          ).length,
          hidrantes: itens.filter((vistoria) =>
            normalizarTexto(obterTipo(vistoria)).includes("HIDRANTE")
          ).length,
          lavaOlhos: itens.filter((vistoria) =>
            normalizarTexto(obterTipo(vistoria)).includes("LAVA")
          ).length,
          naoConformidades: naoConformidadesUnidade,
          ultimaVistoria: itensOrdenados[0] ?? null,
          ultimaData: pegarData(itensOrdenados[0] ?? {}),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const recentes = [...vistorias]
      .sort((a, b) => {
        const dataA = pegarData(a)?.getTime() ?? 0;
        const dataB = pegarData(b)?.getTime() ?? 0;
        return dataB - dataA;
      })
      .slice(0, 10);

    return {
      total: vistoriasGerais.length,
      hoje: vistoriasHoje.length,
      mes: vistoriasMes.length,
      naoConformidades: naoConformidades.length,
      taxaConformidade,
      testesHidrostaticos: testesHidrostaticos.length,
      porTipo,
      vistoriasPorMes,
      conformidadePorMes,
      distribuicaoTipos,
      naoConformidadesPorPergunta,
      unidades,
      recentes,
    };
  }, [vistorias, respostas]);

  const unidadesDisponiveis = useMemo(() => {
    return Array.from(new Set(vistorias.map(obterUnidade))).sort();
  }, [vistorias]);

  const tiposDisponiveis = useMemo(() => {
    return Array.from(new Set(vistorias.map(obterTipo))).sort();
  }, [vistorias]);

  const colaboradoresPorIdentificador = useMemo(() => {
    const mapa = new Map<string, string>();

    for (const colaborador of colaboradores) {
      const nome = String(colaborador.nome ?? "").trim();

      if (!nome) continue;

      const identificadores = [
        colaborador.email,
        colaborador.nome,
        colaborador.id,
        colaborador.auth_user_id,
        colaborador.usuario_id,
      ];

      for (const identificador of identificadores) {
        const chave = normalizarTexto(identificador);

        if (chave) {
          mapa.set(chave, nome);
        }
      }
    }

    return mapa;
  }, [colaboradores]);

  function obterColaboradorExibido(vistoria: LinhaBanco) {
    const colaboradorSalvo = obterColaborador(vistoria).trim();

    if (!colaboradorSalvo || colaboradorSalvo === "Não informado") {
      return "Não informado";
    }

    const nomeEncontrado = colaboradoresPorIdentificador.get(
      normalizarTexto(colaboradorSalvo)
    );

    return nomeEncontrado || colaboradorSalvo;
  }

  const vistoriasFiltradas = useMemo(() => {
    const busca = normalizarTexto(buscaVistoria);

    return [...vistorias]
      .filter((vistoria) => {
        const textoCompleto = normalizarTexto(
          [
            obterEquipamento(vistoria),
            obterUnidade(vistoria),
            obterTipo(vistoria),
            obterColaboradorExibido(vistoria),
            obterColaborador(vistoria),
            String(vistoria.id ?? ""),
          ].join(" ")
        );

        if (busca && !textoCompleto.includes(busca)) {
          return false;
        }

        if (filtroUnidade !== "TODAS" && obterUnidade(vistoria) !== filtroUnidade) {
          return false;
        }

        if (filtroTipo !== "TODOS" && obterTipo(vistoria) !== filtroTipo) {
          return false;
        }

        const data = pegarData(vistoria);

        if (filtroDataInicio) {
          const inicio = new Date(`${filtroDataInicio}T00:00:00`);

          if (!data || data < inicio) {
            return false;
          }
        }

        if (filtroDataFim) {
          const fim = new Date(`${filtroDataFim}T23:59:59`);

          if (!data || data > fim) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dataA = pegarData(a)?.getTime() ?? 0;
        const dataB = pegarData(b)?.getTime() ?? 0;
        return dataB - dataA;
      });
  }, [
    vistorias,
    buscaVistoria,
    filtroUnidade,
    filtroTipo,
    filtroDataInicio,
    filtroDataFim,
    colaboradoresPorIdentificador,
  ]);

  const vistoriaSelecionada = useMemo(() => {
    if (!vistoriaSelecionadaId) return null;

    return (
      vistorias.find((vistoria) => String(vistoria.id) === vistoriaSelecionadaId) ??
      null
    );
  }, [vistorias, vistoriaSelecionadaId]);

  const respostasDaVistoria = useMemo(() => {
    if (!vistoriaSelecionada) return [];

    return respostas
      .filter(
        (resposta) =>
          String(resposta.vistoria_id) === String(vistoriaSelecionada.id)
      )
      .sort((a, b) => {
        const ordemA = Number(a.ordem ?? 999);
        const ordemB = Number(b.ordem ?? 999);

        return ordemA - ordemB;
      });
  }, [respostas, vistoriaSelecionada]);

  const fotosDaVistoria = useMemo(() => {
    if (!vistoriaSelecionada) return [];

    const fotosTabela = fotos.filter(
      (foto) => String(foto.vistoria_id) === String(vistoriaSelecionada.id)
    );

    const urlFotoPrincipal = obterUrlFoto(vistoriaSelecionada);

    if (!urlFotoPrincipal) {
      return fotosTabela;
    }

    const fotoJaExiste = fotosTabela.some(
      (foto) => obterUrlFoto(foto) === urlFotoPrincipal
    );

    if (fotoJaExiste) {
      return fotosTabela;
    }

    return [
      {
        id: `${String(vistoriaSelecionada.id)}-foto-principal`,
        vistoria_id: vistoriaSelecionada.id,
        foto_url: urlFotoPrincipal,
        origem: "vistorias.foto_url",
      },
      ...fotosTabela,
    ];
  }, [fotos, vistoriaSelecionada]);

  function totalNaoConformidadesDaVistoria(vistoriaId: unknown) {
    const vistoria = vistorias.find(
      (item) => String(item.id) === String(vistoriaId)
    );

    return respostas.filter(
      (resposta) =>
        String(resposta.vistoria_id) === String(vistoriaId) &&
        ehRespostaCriticaPorPergunta(
          resposta.pergunta,
          resposta.resposta,
          obterTipo(vistoria ?? {})
        )
    ).length;
  }

  const colaboradoresFiltrados = useMemo(() => {
    const busca = normalizarTexto(buscaColaborador);

    return colaboradores
      .filter((colaborador) => {
        if (!busca) return true;

        const texto = normalizarTexto(
          [
            colaborador.nome,
            colaborador.email,
            colaborador.perfil,
            colaborador.empresa_id,
            colaborador.unidade_id,
          ].join(" ")
        );

        return texto.includes(busca);
      })
      .sort((a, b) => {
        const dataA = pegarData(a)?.getTime() ?? 0;
        const dataB = pegarData(b)?.getTime() ?? 0;
        return dataB - dataA;
      });
  }, [colaboradores, buscaColaborador]);

  function obterEmpresaRelatorio(vistoria: LinhaBanco) {
    return String(
      pegarCampo(vistoria, [
        "empresa",
        "empresa_nome",
        "nome_empresa",
        "unidade",
        "unidade_nome",
      ]) || "Empresa não informada"
    );
  }

  function obterAreaRelatorio(vistoria: LinhaBanco) {
    return String(
      pegarCampo(vistoria, [
        "area",
        "area_nome",
        "setor",
        "local",
        "localizacao",
        "ambiente",
      ]) || "Área não informada"
    );
  }

  const empresasRelatorioDisponiveis = useMemo(() => {
    return Array.from(new Set(vistorias.map(obterEmpresaRelatorio))).sort();
  }, [vistorias]);

  const areasRelatorioDisponiveis = useMemo(() => {
    return Array.from(new Set(vistorias.map(obterAreaRelatorio))).sort();
  }, [vistorias]);

  const colaboradoresRelatorioDisponiveis = useMemo(() => {
    return Array.from(new Set(vistorias.map(obterColaboradorExibido))).sort();
  }, [vistorias, colaboradoresPorIdentificador]);

  const tiposRelatorioDisponiveis = useMemo(() => {
    return Array.from(new Set(vistorias.map(obterTipo))).sort();
  }, [vistorias]);

  const vistoriasComGps = useMemo(() => {
    return vistorias
      .map((vistoria) => ({
        vistoria,
        coordenadas: extrairCoordenadas(vistoria),
      }))
      .filter(
        (item): item is {
          vistoria: LinhaBanco;
          coordenadas: { latitude: number; longitude: number };
        } => item.coordenadas !== null
      )
      .sort((a, b) => {
        const dataA = pegarData(a.vistoria)?.getTime() ?? 0;
        const dataB = pegarData(b.vistoria)?.getTime() ?? 0;
        return dataB - dataA;
      });
  }, [vistorias]);

  const totalVistoriasSemGps = useMemo(() => {
    return vistorias.filter((vistoria) => !extrairCoordenadas(vistoria)).length;
  }, [vistorias]);

  const mapaPontosFiltrados = useMemo(() => {
    const busca = normalizarTexto(mapaBusca);

    return vistoriasComGps.filter(({ vistoria, coordenadas }) => {
      if (mapaEmpresa !== "TODAS" && obterEmpresaRelatorio(vistoria) !== mapaEmpresa) {
        return false;
      }

      if (mapaArea !== "TODAS" && obterAreaRelatorio(vistoria) !== mapaArea) {
        return false;
      }

      if (mapaTipo !== "TODOS" && obterTipo(vistoria) !== mapaTipo) {
        return false;
      }

      if (
        mapaColaborador !== "TODOS" &&
        obterColaboradorExibido(vistoria) !== mapaColaborador
      ) {
        return false;
      }

      const data = pegarData(vistoria);

      if (mapaDataInicio) {
        const inicio = new Date(`${mapaDataInicio}T00:00:00`);

        if (!data || data < inicio) {
          return false;
        }
      }

      if (mapaDataFim) {
        const fim = new Date(`${mapaDataFim}T23:59:59`);

        if (!data || data > fim) {
          return false;
        }
      }

      if (busca) {
        const texto = normalizarTexto(
          [
            obterEmpresaRelatorio(vistoria),
            obterAreaRelatorio(vistoria),
            obterEquipamento(vistoria),
            obterTipo(vistoria),
            obterColaboradorExibido(vistoria),
            obterColaborador(vistoria),
            String(vistoria.id ?? ""),
            `${coordenadas.latitude},${coordenadas.longitude}`,
          ].join(" ")
        );

        if (!texto.includes(busca)) {
          return false;
        }
      }

      return true;
    });
  }, [
    vistoriasComGps,
    mapaBusca,
    mapaEmpresa,
    mapaArea,
    mapaTipo,
    mapaColaborador,
    mapaDataInicio,
    mapaDataFim,
    colaboradoresPorIdentificador,
  ]);

  const mapaSelecionado = useMemo(() => {
    if (mapaPontosFiltrados.length === 0) return null;

    return (
      mapaPontosFiltrados.find(
        ({ vistoria }) => String(vistoria.id) === mapaSelecionadaId
      ) ?? mapaPontosFiltrados[0]
    );
  }, [mapaPontosFiltrados, mapaSelecionadaId]);

  function montarChaveEquipamento(vistoria: LinhaBanco) {
    return [
      obterEmpresaRelatorio(vistoria),
      obterAreaRelatorio(vistoria),
      obterTipo(vistoria),
      obterEquipamento(vistoria),
    ]
      .map((valor) => normalizarTexto(valor))
      .join("|");
  }

  function obterFotoComFallbackPorEquipamento(vistoria: LinhaBanco) {
    const fotoDireta = obterUrlFoto(vistoria);
    if (fotoDireta) return fotoDireta;

    const chaveSelecionada = montarChaveEquipamento(vistoria);

    const vistoriaComFotoRelacionada = [...vistorias]
      .filter((item) => {
        const foto = obterUrlFoto(item);
        if (!foto) return false;

        return montarChaveEquipamento(item) === chaveSelecionada;
      })
      .sort((a, b) => {
        const dataA = pegarData(a)?.getTime() ?? 0;
        const dataB = pegarData(b)?.getTime() ?? 0;
        return dataB - dataA;
      })[0];

    return vistoriaComFotoRelacionada
      ? obterUrlFoto(vistoriaComFotoRelacionada)
      : null;
  }

  const fotoMapaSelecionado = useMemo(() => {
    if (!mapaSelecionado) return null;
    return obterFotoComFallbackPorEquipamento(mapaSelecionado.vistoria);
  }, [mapaSelecionado, vistorias]);

  function existeFiltroRelatorioAplicado() {
    return (
      relEmpresa !== "TODAS" ||
      relArea !== "TODAS" ||
      relTipo !== "TODOS" ||
      relColaborador !== "TODOS" ||
      Boolean(relDataInicio) ||
      Boolean(relDataFim)
    );
  }

  const relatoriosFiltradosBase = useMemo(() => {
    return [...vistorias]
      .filter((vistoria) => {
        if (relEmpresa !== "TODAS" && obterEmpresaRelatorio(vistoria) !== relEmpresa) {
          return false;
        }

        if (relArea !== "TODAS" && obterAreaRelatorio(vistoria) !== relArea) {
          return false;
        }

        if (relTipo !== "TODOS" && obterTipo(vistoria) !== relTipo) {
          return false;
        }

        if (
          relColaborador !== "TODOS" &&
          obterColaboradorExibido(vistoria) !== relColaborador
        ) {
          return false;
        }

        const data = pegarData(vistoria);

        if (relDataInicio) {
          const inicio = new Date(`${relDataInicio}T00:00:00`);

          if (!data || data < inicio) {
            return false;
          }
        }

        if (relDataFim) {
          const fim = new Date(`${relDataFim}T23:59:59`);

          if (!data || data > fim) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dataA = pegarData(a)?.getTime() ?? 0;
        const dataB = pegarData(b)?.getTime() ?? 0;
        return dataB - dataA;
      });
  }, [
    vistorias,
    relEmpresa,
    relArea,
    relTipo,
    relColaborador,
    relDataInicio,
    relDataFim,
    colaboradoresPorIdentificador,
  ]);

  const relatoriosResultados = relatoriosBuscados ? relatoriosFiltradosBase : [];

  function obterRespostasUnicasDaVistoria(vistoriaId: unknown) {
    const mapa = new Map<string, LinhaBanco>();

    for (const resposta of respostas) {
      if (String(resposta.vistoria_id) !== String(vistoriaId)) continue;

      const chave = [
        normalizarTexto(resposta.pergunta),
        normalizarTexto(resposta.resposta),
        normalizarTexto(resposta.detalhe),
      ].join("|");

      if (!mapa.has(chave)) {
        mapa.set(chave, resposta);
      }
    }

    return Array.from(mapa.values()).sort((a, b) => {
      const ordemA = Number(a.ordem ?? 999);
      const ordemB = Number(b.ordem ?? 999);
      return ordemA - ordemB;
    });
  }

  function montarLinhaChecklistRelatorio(resposta: LinhaBanco) {
    const pergunta = String(resposta.pergunta ?? "Pergunta não informada").trim();
    const respostaExibida = obterRespostaExibida(resposta);
    const detalhe = String(resposta.detalhe ?? "").trim();
    const respostaNormalizada = normalizarTexto(resposta.resposta);

    if (detalhe && respostaNormalizada !== "INFORMAR") {
      return `${pergunta}: ${respostaExibida} | ${detalhe}`;
    }

    return `${pergunta}: ${respostaExibida}`;
  }

  function obterFotosDaVistoriaParaRelatorio(vistoria: LinhaBanco) {
    const fotosTabela = fotos.filter(
      (foto) => String(foto.vistoria_id) === String(vistoria.id)
    );

    const urlFotoPrincipal = obterUrlFoto(vistoria);

    if (!urlFotoPrincipal) {
      return fotosTabela;
    }

    const fotoJaExiste = fotosTabela.some(
      (foto) => obterUrlFoto(foto) === urlFotoPrincipal
    );

    if (fotoJaExiste) {
      return fotosTabela;
    }

    return [
      {
        id: `${String(vistoria.id)}-foto-principal`,
        vistoria_id: vistoria.id,
        foto_url: urlFotoPrincipal,
        origem: "vistorias.foto_url",
      },
      ...fotosTabela,
    ];
  }

  function chaveUnicaRelatorio(vistoria: LinhaBanco) {
    return [
      normalizarTexto(obterEmpresaRelatorio(vistoria)),
      normalizarTexto(obterAreaRelatorio(vistoria)),
      normalizarTexto(obterTipo(vistoria)),
      normalizarTexto(obterEquipamento(vistoria)),
    ].join("|");
  }

  function deduplicarVistoriasPorEquipamento(lista: LinhaBanco[]) {
    const mapa = new Map<string, LinhaBanco>();

    for (const vistoria of lista) {
      const chave = chaveUnicaRelatorio(vistoria);
      const existente = mapa.get(chave);

      if (!existente) {
        mapa.set(chave, vistoria);
        continue;
      }

      const dataAtual = pegarData(vistoria)?.getTime() ?? 0;
      const dataExistente = pegarData(existente)?.getTime() ?? 0;

      if (dataAtual > dataExistente) {
        mapa.set(chave, vistoria);
      }
    }

    return Array.from(mapa.values()).sort((a, b) => {
      const empresaA = obterEmpresaRelatorio(a).localeCompare(obterEmpresaRelatorio(b));
      if (empresaA !== 0) return empresaA;

      const areaA = obterAreaRelatorio(a).localeCompare(obterAreaRelatorio(b));
      if (areaA !== 0) return areaA;

      return obterEquipamento(a).localeCompare(obterEquipamento(b));
    });
  }

  async function carregarImagemComoDataUrl(url: string) {
    if (!url) return null;

    try {
      if (url.startsWith("data:")) {
        return url;
      }

      const resposta = await fetch(url, {
        mode: "cors",
        cache: "no-store",
      });

      if (!resposta.ok) return null;

      const blob = await resposta.blob();

      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();

        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function obterDimensoesImagem(dataUrl: string) {
    return await new Promise<{ largura: number; altura: number } | null>((resolve) => {
      const imagem = new Image();
      imagem.onload = () => {
        resolve({
          largura: imagem.naturalWidth || imagem.width,
          altura: imagem.naturalHeight || imagem.height,
        });
      };
      imagem.onerror = () => resolve(null);
      imagem.src = dataUrl;
    });
  }

  function calcularImagemAjustada(
    larguraOriginal: number,
    alturaOriginal: number,
    larguraMaxima: number,
    alturaMaxima: number
  ) {
    const escala = Math.min(
      larguraMaxima / larguraOriginal,
      alturaMaxima / alturaOriginal
    );

    const largura = larguraOriginal * escala;
    const altura = alturaOriginal * escala;

    return {
      largura,
      altura,
      xOffset: (larguraMaxima - largura) / 2,
      yOffset: (alturaMaxima - altura) / 2,
    };
  }

  function garantirEspacoNoPdf(doc: any, posicaoY: number, alturaNecessaria: number) {
    const alturaPagina = doc.internal.pageSize.getHeight();

    if (posicaoY + alturaNecessaria > alturaPagina - 52) {
      doc.addPage();
      return 72;
    }

    return posicaoY;
  }

  function escreverCabecalhoRelatorio(doc: any, titulo: string, subtitulo: string) {
    const larguraPagina = doc.internal.pageSize.getWidth();

    doc.setFillColor(139, 23, 23);
    doc.rect(0, 0, larguraPagina, 74, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(titulo, 40, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(subtitulo, 40, 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SafeScan Admin", larguraPagina - 132, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Gerado em ${formatarData(new Date())}`, larguraPagina - 132, 46);

    doc.setTextColor(24, 24, 27);
    return 104;
  }

  function adicionarRodapeRelatorio(doc: any) {
    const totalPaginas = doc.getNumberOfPages();
    const larguraPagina = doc.internal.pageSize.getWidth();
    const alturaPagina = doc.internal.pageSize.getHeight();

    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      doc.setPage(pagina);
      doc.setDrawColor(220, 220, 220);
      doc.line(40, alturaPagina - 34, larguraPagina - 40, alturaPagina - 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Relatório gerado automaticamente pelo SafeScan Admin", 40, alturaPagina - 18);
      doc.text(`Página ${pagina} de ${totalPaginas}`, larguraPagina - 96, alturaPagina - 18);
    }
  }

  async function escreverBlocoVistoriaTexto(
    doc: any,
    vistoria: LinhaBanco,
    posicaoY: number,
    indice?: number
  ) {
    const margemX = 40;
    const larguraTotal = 515;
    const larguraFoto = 205;
    const alturaFoto = 150;
    const espacoEntreColunas = 18;
    const posicaoXFoto = margemX + larguraTotal - larguraFoto - 12;
    const larguraInfo = larguraTotal - larguraFoto - espacoEntreColunas - 18;
    const checklist = obterRespostasUnicasDaVistoria(vistoria.id);

    posicaoY = garantirEspacoNoPdf(doc, posicaoY, 228);

    const linhasInfo = [
      `Equipamento: ${obterEquipamento(vistoria)}`,
      `Tipo: ${obterTipo(vistoria)}`,
      `Empresa: ${obterEmpresaRelatorio(vistoria)}`,
      `Área: ${obterAreaRelatorio(vistoria)}`,
      `Data: ${formatarData(pegarData(vistoria))}`,
      `Vistoria realizada por: ${obterColaboradorExibido(vistoria)}`,
      `GPS: ${String(vistoria.gps ?? "Não informado")}`,
    ];

    const alturaBlocoTopo = 196;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(196, 201, 209);
    doc.roundedRect(margemX, posicaoY - 14, larguraTotal, alturaBlocoTopo, 10, 10, "FD");

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margemX + 8, posicaoY - 6, larguraInfo + 8, 28, 8, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(127, 29, 29);
    doc.text(
      `${indice ? `${indice}. ` : ""}${obterEquipamento(vistoria)}`,
      margemX + 18,
      posicaoY + 12
    );

    let cursorInfoY = posicaoY + 42;

    for (const linha of linhasInfo) {
      const [rotulo, ...restante] = linha.split(":");
      const valor = restante.join(":").trim();
      const textoCompleto = `${rotulo}: ${valor}`;
      const linhasQuebradas = doc.splitTextToSize(textoCompleto, larguraInfo) as string[];

      for (const parte of linhasQuebradas) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.8);
        doc.setTextColor(39, 39, 42);
        doc.text(parte, margemX + 18, cursorInfoY);
        cursorInfoY += 13;
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(39, 39, 42);
    doc.text("Foto da vistoria", posicaoXFoto, posicaoY + 8);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(150, 155, 165);
    doc.roundedRect(posicaoXFoto, posicaoY + 18, larguraFoto, alturaFoto, 8, 8, "FD");

    const fotosRelatorio = obterFotosDaVistoriaParaRelatorio(vistoria);
    const fotoPrincipal = fotosRelatorio[0] ? obterUrlFoto(fotosRelatorio[0]) : "";

    if (fotoPrincipal) {
      const dataUrl = await carregarImagemComoDataUrl(fotoPrincipal);

      if (dataUrl) {
        try {
          const dimensoes = await obterDimensoesImagem(dataUrl);
          const areaImagemLargura = larguraFoto - 12;
          const areaImagemAltura = alturaFoto - 12;
          const ajuste = dimensoes
            ? calcularImagemAjustada(
                dimensoes.largura,
                dimensoes.altura,
                areaImagemLargura,
                areaImagemAltura
              )
            : {
                largura: areaImagemLargura,
                altura: areaImagemAltura,
                xOffset: 0,
                yOffset: 0,
              };

          const formatoImagem = dataUrl.includes("image/png") ? "PNG" : "JPEG";

          doc.addImage(
            dataUrl,
            formatoImagem,
            posicaoXFoto + 6 + ajuste.xOffset,
            posicaoY + 24 + ajuste.yOffset,
            ajuste.largura,
            ajuste.altura
          );
        } catch {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text("Foto não pôde ser renderizada.", posicaoXFoto + 12, posicaoY + 52);
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text("Foto indisponível.", posicaoXFoto + 12, posicaoY + 52);
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Sem foto sincronizada.", posicaoXFoto + 12, posicaoY + 52);
    }

    posicaoY += alturaBlocoTopo + 12;
    posicaoY = garantirEspacoNoPdf(doc, posicaoY, 42);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(127, 29, 29);
    doc.text("Checklist da vistoria", margemX, posicaoY);

    posicaoY += 17;

    if (checklist.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(82, 82, 91);
      doc.text("Checklist não sincronizado.", margemX, posicaoY);
      posicaoY += 18;
    } else {
      for (const item of checklist) {
        const linha = montarLinhaChecklistRelatorio(item);
        const linhas = doc.splitTextToSize(linha, larguraTotal - 8) as string[];
        const alturaLinha = linhas.length * 12 + 7;

        posicaoY = garantirEspacoNoPdf(doc, posicaoY, alturaLinha + 8);

        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(235, 235, 235);
        doc.roundedRect(margemX, posicaoY - 10, larguraTotal, alturaLinha, 5, 5, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.7);
        doc.setTextColor(39, 39, 42);

        let linhaY = posicaoY + 2;
        for (const parte of linhas) {
          doc.text(parte, margemX + 8, linhaY);
          linhaY += 12;
        }

        posicaoY += alturaLinha + 5;
      }
    }

    posicaoY += 16;
    return posicaoY;
  }

  function montarNomeArquivoRelatorio(prefixo: string, itens: LinhaBanco[]) {
    const primeiro = itens[0] ?? {};
    const partes = [
      prefixo,
      obterEmpresaRelatorio(primeiro),
      obterAreaRelatorio(primeiro),
      obterTipo(primeiro),
    ];

    return `${partes
      .map((parte) =>
        String(parte)
          .replace(/[\\/:*?"<>|]/g, "-")
          .replace(/\s+/g, "_")
          .toUpperCase()
      )
      .join("_")}.pdf`;
  }

  async function finalizarPdfRelatorio(doc: any, acao: "visualizar" | "baixar", nomeArquivo: string) {
    adicionarRodapeRelatorio(doc);

    if (acao === "visualizar") {
      const url = doc.output("bloburl");
      window.open(String(url), "_blank");
      return;
    }

    doc.save(nomeArquivo);
  }

  async function gerarPdfRelatorioIndividual(
    vistoria: LinhaBanco,
    acao: "visualizar" | "baixar"
  ) {
    setErro("");
    setAviso("");
    setGerandoRelatorioId(`${String(vistoria.id)}-${acao}`);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "pt", "a4");
      const titulo = `RELATÓRIO INDIVIDUAL - ${obterEmpresaRelatorio(vistoria)} / ${obterAreaRelatorio(vistoria)} / ${obterTipo(vistoria)}`;
      const subtitulo = `Equipamento: ${obterEquipamento(vistoria)} | Vistoria realizada por: ${obterColaboradorExibido(vistoria)}`;

      let posicaoY = escreverCabecalhoRelatorio(doc, titulo, subtitulo);
      posicaoY = await escreverBlocoVistoriaTexto(doc, vistoria, posicaoY, 1);

      await finalizarPdfRelatorio(
        doc,
        acao,
        montarNomeArquivoRelatorio("RELATORIO_INDIVIDUAL", [vistoria])
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? `Erro ao gerar relatório: ${error.message}`
          : "Erro inesperado ao gerar relatório."
      );
    } finally {
      setGerandoRelatorioId(null);
    }
  }

  async function gerarPdfRelatorioGeral(acao: "visualizar" | "baixar") {
    setErro("");
    setAviso("");

    if (!relatoriosBuscados || relatoriosFiltradosBase.length === 0) {
      setAviso("Busque os relatórios com os filtros desejados antes de gerar o PDF geral.");
      return;
    }

    const itensUnicos = deduplicarVistoriasPorEquipamento(relatoriosFiltradosBase);

    if (itensUnicos.length === 0) {
      setAviso("Nenhum equipamento encontrado para gerar o relatório geral.");
      return;
    }

    setGerandoRelatorioId(`GERAL-${acao}`);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "pt", "a4");
      const primeiro = itensUnicos[0];
      const empresaTitulo = relEmpresa !== "TODAS" ? relEmpresa : obterEmpresaRelatorio(primeiro);
      const areaTitulo = relArea !== "TODAS" ? relArea : obterAreaRelatorio(primeiro);
      const tipoTitulo = relTipo !== "TODOS" ? relTipo : obterTipo(primeiro);
      const titulo = `RELATÓRIO GERAL - ${empresaTitulo} / ${areaTitulo} / ${tipoTitulo}`;
      const subtitulo = `${itensUnicos.length} equipamento(s) único(s) encontrado(s) | Período: ${relDataInicio || "início"} até ${relDataFim || "hoje"}`;

      let posicaoY = escreverCabecalhoRelatorio(doc, titulo, subtitulo);

      for (const [indice, vistoria] of itensUnicos.entries()) {
        posicaoY = await escreverBlocoVistoriaTexto(doc, vistoria, posicaoY, indice + 1);
      }

      await finalizarPdfRelatorio(
        doc,
        acao,
        montarNomeArquivoRelatorio("RELATORIO_GERAL", itensUnicos)
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? `Erro ao gerar relatório geral: ${error.message}`
          : "Erro inesperado ao gerar relatório geral."
      );
    } finally {
      setGerandoRelatorioId(null);
    }
  }

  function buscarRelatorios() {
    setErro("");
    setAviso("");

    if (!existeFiltroRelatorioAplicado()) {
      setRelatoriosBuscados(false);
      setAviso("Selecione pelo menos um filtro para buscar relatórios.");
      return;
    }

    setRelatoriosBuscados(true);
  }

  function limparFiltrosRelatorios() {
    setRelEmpresa("TODAS");
    setRelArea("TODAS");
    setRelTipo("TODOS");
    setRelColaborador("TODOS");
    setRelDataInicio("");
    setRelDataFim("");
    setRelatoriosBuscados(false);
    setGerandoRelatorioId(null);
    setAviso("");
    setErro("");
  }

  function limparFiltrosMapa() {
    setMapaBusca("");
    setMapaEmpresa("TODAS");
    setMapaArea("TODAS");
    setMapaTipo("TODOS");
    setMapaColaborador("TODOS");
    setMapaDataInicio("");
    setMapaDataFim("");
    setMapaSelecionadaId(null);
  }

  function renderizarRelatorios() {
    const itensUnicos = deduplicarVistoriasPorEquipamento(relatoriosFiltradosBase);

    return (
      <div className="space-y-4">
        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {erro}
          </div>
        )}

        {aviso && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">
            {aviso}
          </div>
        )}

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-zinc-800">
              Central de relatórios profissionais
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Gere relatório individual ou geral por empresa, área, tipo e período. O PDF mantém foto visível, identificação do equipamento, responsável pela vistoria e checklist completo.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Empresa
                </label>
                <select
                  value={relEmpresa}
                  onChange={(event) => {
                    setRelEmpresa(event.target.value);
                    setRelatoriosBuscados(false);
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODAS">Todas</option>
                  {empresasRelatorioDisponiveis.map((empresa) => (
                    <option key={empresa} value={empresa}>
                      {empresa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Área
                </label>
                <select
                  value={relArea}
                  onChange={(event) => {
                    setRelArea(event.target.value);
                    setRelatoriosBuscados(false);
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODAS">Todas</option>
                  {areasRelatorioDisponiveis.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Tipo
                </label>
                <select
                  value={relTipo}
                  onChange={(event) => {
                    setRelTipo(event.target.value);
                    setRelatoriosBuscados(false);
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODOS">Todos</option>
                  {tiposRelatorioDisponiveis.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Colaborador
                </label>
                <select
                  value={relColaborador}
                  onChange={(event) => {
                    setRelColaborador(event.target.value);
                    setRelatoriosBuscados(false);
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODOS">Todos</option>
                  {colaboradoresRelatorioDisponiveis.map((colaborador) => (
                    <option key={colaborador} value={colaborador}>
                      {colaborador}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Início
                </label>
                <input
                  type="date"
                  value={relDataInicio}
                  onChange={(event) => {
                    setRelDataInicio(event.target.value);
                    setRelatoriosBuscados(false);
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Fim
                </label>
                <input
                  type="date"
                  value={relDataFim}
                  onChange={(event) => {
                    setRelDataFim(event.target.value);
                    setRelatoriosBuscados(false);
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3">
              <div>
                <p className="text-sm font-black text-red-950">
                  {relatoriosBuscados
                    ? `${formatarNumero(relatoriosResultados.length)} vistoria(s) encontrada(s)`
                    : "Nenhuma busca realizada"}
                </p>
                <p className="text-xs font-semibold text-red-900/70">
                  Geral da área: {relatoriosBuscados ? formatarNumero(itensUnicos.length) : 0} equipamento(s) único(s)
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={limparFiltrosRelatorios}
                  className="rounded-xl border-red-200 text-red-900 hover:bg-red-100"
                >
                  Limpar
                </Button>

                <Button
                  onClick={buscarRelatorios}
                  className="rounded-xl bg-red-900 text-white hover:bg-red-950"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Buscar relatórios
                </Button>

                <Button
                  variant="outline"
                  disabled={!relatoriosBuscados || relatoriosResultados.length === 0 || Boolean(gerandoRelatorioId)}
                  onClick={() => gerarPdfRelatorioGeral("visualizar")}
                  className="rounded-xl border-red-200 text-red-900 hover:bg-red-100"
                >
                  {gerandoRelatorioId === "GERAL-visualizar" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Visualizar geral
                </Button>

                <Button
                  disabled={!relatoriosBuscados || relatoriosResultados.length === 0 || Boolean(gerandoRelatorioId)}
                  onClick={() => gerarPdfRelatorioGeral("baixar")}
                  className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-950"
                >
                  {gerandoRelatorioId === "GERAL-baixar" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Baixar geral
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-zinc-800">
              Vistorias filtradas
            </CardTitle>
            <p className="text-sm text-zinc-500">
              A lista só aparece após clicar em Buscar relatórios.
            </p>
          </CardHeader>

          <CardContent>
            {!relatoriosBuscados ? (
              <div className="rounded-xl border border-dashed border-red-900/25 bg-red-50 p-6 text-sm font-semibold text-red-900">
                Use os filtros acima e clique em Buscar relatórios para listar as vistorias.
              </div>
            ) : relatoriosResultados.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-6 text-sm font-semibold text-zinc-500">
                Nenhuma vistoria encontrada para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-zinc-200">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr] bg-red-900 px-4 py-3 text-xs font-bold uppercase text-white">
                  <div>Data</div>
                  <div>Empresa</div>
                  <div>Área</div>
                  <div>Equipamento</div>
                  <div>Tipo</div>
                  <div>Ações</div>
                </div>

                {relatoriosResultados.map((vistoria, index) => {
                  const id = String(vistoria.id ?? index);

                  return (
                    <div
                      key={id}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr] items-center border-t border-zinc-100 px-4 py-3 text-sm"
                    >
                      <div className="font-semibold text-zinc-700">
                        {formatarData(pegarData(vistoria))}
                      </div>
                      <div className="font-bold text-red-950">
                        {obterEmpresaRelatorio(vistoria)}
                      </div>
                      <div className="text-zinc-700">
                        {obterAreaRelatorio(vistoria)}
                      </div>
                      <div className="font-semibold text-zinc-800">
                        {obterEquipamento(vistoria)}
                      </div>
                      <div className="text-zinc-700">{obterTipo(vistoria)}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(gerandoRelatorioId)}
                          onClick={() => gerarPdfRelatorioIndividual(vistoria, "visualizar")}
                          className="rounded-xl border-red-200 text-red-900 hover:bg-red-50"
                        >
                          {gerandoRelatorioId === `${id}-visualizar` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="mr-2 h-4 w-4" />
                          )}
                          Ver PDF
                        </Button>

                        <Button
                          size="sm"
                          disabled={Boolean(gerandoRelatorioId)}
                          onClick={() => gerarPdfRelatorioIndividual(vistoria, "baixar")}
                          className="rounded-xl bg-red-900 text-white hover:bg-red-950"
                        >
                          {gerandoRelatorioId === `${id}-baixar` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Baixar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const menu = [
    {
      id: "dashboard" as TelaAdmin,
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      id: "vistorias" as TelaAdmin,
      label: "Vistorias",
      icon: ClipboardCheck,
    },
    {
      id: "empresas" as TelaAdmin,
      label: "Empresas",
      icon: Building2,
    },
    {
      id: "colaboradores" as TelaAdmin,
      label: "Colaboradores",
      icon: Users,
    },
    {
      id: "relatorios" as TelaAdmin,
      label: "Relatórios",
      icon: FileText,
    },
    {
      id: "mapa" as TelaAdmin,
      label: "Mapa",
      icon: MapPin,
    },
  ];

  if (carregandoLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-red-900" />
          <p className="font-bold text-red-950">Carregando SafeScan Admin...</p>
        </div>
      </main>
    );
  }

  if (!sessionEmail) {
    return (
      <main className="min-h-screen bg-[#f6f2ea] text-red-950">
        <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
          <section className="hidden bg-[#8f1717] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/15">
                  <ShieldCheck className="h-8 w-8 text-yellow-300" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.45em] text-yellow-200">
                    SafeScan
                  </p>
                  <h1 className="text-3xl font-black">Admin</h1>
                </div>
              </div>

              <div className="mt-20 max-w-xl">
                <h2 className="text-5xl font-black leading-tight">
                  Gestão profissional de vistorias em campo.
                </h2>
                <p className="mt-6 text-lg font-medium leading-8 text-white/75">
                  Painel administrativo para acompanhar vistorias, produtividade,
                  não conformidades, empresas, colaboradores, fotos e relatórios.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-black/20 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-200">
                Ambiente seguro
              </p>
              <p className="mt-2 text-sm text-white/75">
                Somente usuários ADMIN ou SUPER_ADMIN podem acessar o painel.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center p-6">
            <Card className="w-full max-w-md rounded-3xl border-red-950/10 bg-white shadow-sm">
              <CardHeader>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-900 text-white">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <CardTitle className="text-3xl font-black text-red-950">
                  Entrar no SafeScan Admin
                </CardTitle>
                <p className="text-sm font-medium text-zinc-500">
                  Acesse com um usuário administrativo do Supabase.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-red-950">
                    E-mail
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@safescan.com.br"
                    className="mt-2 h-12 rounded-2xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-red-950">
                    Senha
                  </label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    placeholder="Digite sua senha"
                    className="mt-2 h-12 rounded-2xl"
                  />
                </div>

                {erro && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                    {erro}
                  </div>
                )}

                <Button
                  onClick={entrar}
                  disabled={entrando || !email || !senha}
                  className="h-12 w-full rounded-2xl bg-red-900 text-white hover:bg-red-950"
                >
                  {entrando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <p className="text-xs font-medium leading-5 text-zinc-500">
                  O painel valida o perfil na tabela public.perfis antes de
                  liberar o dashboard.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    );
  }

  function renderizarDashboard() {
    return (
      <div className="space-y-4">
        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {erro}
          </div>
        )}

        {aviso && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">
            {aviso}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-red-950 to-red-800 text-white shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                  Total operacional
                </p>
                <p className="mt-2 text-3xl font-black">
                  {formatarNumero(dadosDashboard.total)}
                </p>
                <p className="text-xs font-semibold text-white/80">
                  vistorias sincronizadas
                </p>
              </div>
              <ClipboardCheck className="h-10 w-10 text-white/85" />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-zinc-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  Hoje
                </p>
                <p className="mt-2 text-3xl font-black text-red-950">
                  {formatarNumero(dadosDashboard.hoje)}
                </p>
                <p className="text-xs font-semibold text-zinc-500">
                  realizadas no dia
                </p>
              </div>
              <CalendarDays className="h-10 w-10 text-red-900" />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-white shadow-sm ring-1 ring-zinc-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  Conformidade
                </p>
                <p className="mt-2 text-3xl font-black text-red-950">
                  {dadosDashboard.taxaConformidade}%
                </p>
                <p className="text-xs font-semibold text-zinc-500">
                  média do checklist
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-red-900" />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-red-700 to-red-600 text-white shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                  Pendências
                </p>
                <p className="mt-2 text-3xl font-black">
                  {formatarNumero(dadosDashboard.naoConformidades)}
                </p>
                <p className="text-xs font-semibold text-white/80">
                  não conformidades
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-white/85" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-sm font-bold text-zinc-700">
                Vistorias por mês
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosDashboard.vistoriasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#991b1b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-sm font-bold text-zinc-700">
                Taxa de conformidade no ano
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosDashboard.conformidadePorMes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="taxa"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#991b1b" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-sm font-bold text-zinc-700">
                Distribuição por tipo
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid h-56 grid-cols-[1fr_130px] items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosDashboard.distribuicaoTipos}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {dadosDashboard.distribuicaoTipos.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={coresGrafico[index % coresGrafico.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {dadosDashboard.distribuicaoTipos.map((item, index) => (
                    <div key={item.nome} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            coresGrafico[index % coresGrafico.length],
                        }}
                      />
                      <div>
                        <p className="text-xs font-bold text-zinc-700">
                          {item.nome}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatarNumero(item.valor)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
          <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.15em] text-zinc-600">
                Resumo operacional
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-red-50 p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-900">
                    <Flame className="h-8 w-8" />
                  </div>
                  <p className="mt-3 text-2xl font-black text-zinc-900">
                    {formatarNumero(dadosDashboard.porTipo.extintores)}
                  </p>
                  <p className="text-xs font-bold text-zinc-500">Extintores</p>
                </div>

                <div className="rounded-xl bg-red-50 p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-900">
                    <Droplets className="h-8 w-8" />
                  </div>
                  <p className="mt-3 text-2xl font-black text-zinc-900">
                    {formatarNumero(dadosDashboard.porTipo.hidrantes)}
                  </p>
                  <p className="text-xs font-bold text-zinc-500">Hidrantes</p>
                </div>

                <div className="rounded-xl bg-red-50 p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-900">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <p className="mt-3 text-2xl font-black text-zinc-900">
                    {formatarNumero(dadosDashboard.porTipo.lavaOlhos)}
                  </p>
                  <p className="text-xs font-bold text-zinc-500">Lava-olhos</p>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    No mês
                  </p>
                  <p className="mt-2 text-2xl font-black text-red-950">
                    {formatarNumero(dadosDashboard.mes)}
                  </p>
                  <p className="text-xs font-semibold text-zinc-500">vistorias</p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Hidrostático
                  </p>
                  <p className="mt-2 text-2xl font-black text-red-950">
                    {formatarNumero(dadosDashboard.testesHidrostaticos)}
                  </p>
                  <p className="text-xs font-semibold text-zinc-500">teste(s)</p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Status
                  </p>
                  <p className="mt-2 text-lg font-black text-green-700">Online</p>
                  <p className="text-xs font-semibold text-zinc-500">Supabase ativo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.15em] text-zinc-600">
                Não conformidades por pergunta
              </CardTitle>
            </CardHeader>

            <CardContent>
              {dadosDashboard.naoConformidadesPorPergunta.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl bg-zinc-50 text-sm font-semibold text-zinc-500">
                  Nenhuma não conformidade encontrada.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosDashboard.naoConformidadesPorPergunta}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="pergunta"
                        width={130}
                        fontSize={11}
                      />
                      <Tooltip />
                      <Bar dataKey="total" fill="#991b1b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  function renderizarVistorias() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-zinc-800">
              Vistorias sincronizadas
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Busca, filtros e consulta dos registros puxados da tabela
              public.vistorias.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Buscar
                </label>
                <Input
                  value={buscaVistoria}
                  onChange={(event) => setBuscaVistoria(event.target.value)}
                  placeholder="Equipamento, unidade, tipo ou ID"
                  className="mt-2 h-10 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Unidade
                </label>
                <select
                  value={filtroUnidade}
                  onChange={(event) => setFiltroUnidade(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODAS">Todas</option>
                  {unidadesDisponiveis.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Tipo
                </label>
                <select
                  value={filtroTipo}
                  onChange={(event) => setFiltroTipo(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODOS">Todos</option>
                  {tiposDisponiveis.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Início
                  </label>
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(event) => setFiltroDataInicio(event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Fim
                  </label>
                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={(event) => setFiltroDataFim(event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3">
              <p className="text-sm font-bold text-red-950">
                {formatarNumero(vistoriasFiltradas.length)} vistoria(s)
                encontrada(s)
              </p>

              <Button
                variant="outline"
                className="rounded-xl border-red-200 text-red-900 hover:bg-red-100"
                onClick={() => {
                  setBuscaVistoria("");
                  setFiltroUnidade("TODAS");
                  setFiltroTipo("TODOS");
                  setFiltroDataInicio("");
                  setFiltroDataFim("");
                }}
              >
                Limpar filtros
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="grid grid-cols-[1.1fr_1.2fr_1fr_1fr_0.7fr_0.9fr] bg-red-900 px-4 py-3 text-xs font-bold uppercase text-white">
                <div>Data</div>
                <div>Unidade</div>
                <div>Equipamento</div>
                <div>Tipo</div>
                <div>N.C.</div>
                <div>Ação</div>
              </div>

              {vistoriasFiltradas.length === 0 ? (
                <div className="p-5 text-sm font-semibold text-zinc-500">
                  Nenhuma vistoria encontrada com os filtros atuais.
                </div>
              ) : (
                vistoriasFiltradas.map((vistoria, index) => {
                  const naoConformes = totalNaoConformidadesDaVistoria(vistoria.id);
                  const selecionada =
                    String(vistoria.id) === String(vistoriaSelecionadaId);

                  return (
                    <div
                      key={String(vistoria.id ?? index)}
                      className={`grid grid-cols-[1.1fr_1.2fr_1fr_1fr_0.7fr_0.9fr] items-center border-t border-zinc-100 px-4 py-3 text-sm ${
                        selecionada ? "bg-red-50" : "bg-white"
                      }`}
                    >
                      <div className="font-semibold text-zinc-700">
                        {formatarData(pegarData(vistoria))}
                      </div>

                      <div className="font-bold text-red-950">
                        {obterUnidade(vistoria)}
                      </div>

                      <div className="text-zinc-700">
                        {obterEquipamento(vistoria)}
                      </div>

                      <div className="text-zinc-700">{obterTipo(vistoria)}</div>

                      <div>
                        {naoConformes > 0 ? (
                          <Badge className="bg-red-100 text-red-900 hover:bg-red-100">
                            {naoConformes}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            0
                          </Badge>
                        )}
                      </div>

                      <div>
                        <Button
                          size="sm"
                          className="rounded-xl bg-red-900 text-white hover:bg-red-950"
                          onClick={() =>
                            setVistoriaSelecionadaId(String(vistoria.id))
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-zinc-800">
              Detalhe da vistoria
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Clique em uma vistoria para ver checklist, respostas e fotos.
            </p>
          </CardHeader>

          <CardContent>
            {!vistoriaSelecionada ? (
              <div className="rounded-xl border border-dashed border-red-900/25 bg-red-50 p-6 text-sm font-semibold text-red-900">
                Nenhuma vistoria selecionada.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-900">
                    Identificação
                  </p>

                  <h3 className="mt-2 text-xl font-black text-red-950">
                    {obterEquipamento(vistoriaSelecionada)}
                  </h3>

                  <div className="mt-4 grid gap-3 text-sm">
                    <div>
                      <p className="font-bold text-zinc-500">Unidade</p>
                      <p className="font-black text-zinc-900">
                        {obterUnidade(vistoriaSelecionada)}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-zinc-500">Tipo</p>
                      <p className="font-black text-zinc-900">
                        {obterTipo(vistoriaSelecionada)}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-zinc-500">Data</p>
                      <p className="font-black text-zinc-900">
                        {formatarData(pegarData(vistoriaSelecionada))}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-zinc-500">Colaborador</p>
                      <p className="font-black text-zinc-900">
                        {obterColaboradorExibido(vistoriaSelecionada)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-black text-zinc-900">Checklist</h4>
                    <Badge className="bg-red-900 text-white hover:bg-red-900">
                      {formatarNumero(respostasDaVistoria.length)} resposta(s)
                    </Badge>
                  </div>

                  {respostasDaVistoria.length === 0 ? (
                    <div className="rounded-xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">
                      Nenhuma resposta encontrada para esta vistoria.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {respostasDaVistoria.map((resposta, index) => {
                        const critica = ehRespostaCriticaPorPergunta(
                          resposta.pergunta,
                          resposta.resposta,
                          obterTipo(vistoriaSelecionada)
                        );

                        const respostaExibida = obterRespostaExibida(resposta);
                        const respostaOriginal = normalizarTexto(resposta.resposta);
                        const detalhe = String(resposta.detalhe ?? "").trim();

                        return (
                          <div
                            key={String(resposta.id ?? index)}
                            className={`rounded-xl border p-3 ${
                              critica
                                ? "border-red-200 bg-red-50"
                                : "border-zinc-200 bg-zinc-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-zinc-900">
                                  {String(resposta.pergunta ?? "Pergunta")}
                                </p>

                                {detalhe && respostaOriginal !== "INFORMAR" ? (
                                  <p className="mt-1 text-xs font-medium text-zinc-500">
                                    {detalhe}
                                  </p>
                                ) : null}
                              </div>

                              <Badge
                                className={
                                  critica
                                    ? "bg-red-900 text-white hover:bg-red-900"
                                    : "bg-green-100 text-green-800 hover:bg-green-100"
                                }
                              >
                                {respostaExibida}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-black text-zinc-900">Fotos</h4>
                    <ImageIcon className="h-5 w-5 text-red-900" />
                  </div>

                  {fotosDaVistoria.length === 0 ? (
                    <div className="rounded-xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">
                      Nenhuma foto encontrada para esta vistoria.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {fotosDaVistoria.map((foto, index) => {
                        const url = obterUrlFoto(foto);

                        return (
                          <div
                            key={String(foto.id ?? index)}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                              Foto {index + 1}
                            </p>

                            {url.startsWith("http") ? (
                              <div className="mt-2 space-y-2">
                                <img
                                  src={url}
                                  alt={`Foto da vistoria ${index + 1}`}
                                  className="h-44 w-full rounded-xl border border-zinc-200 object-cover"
                                />

                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block break-all text-sm font-bold text-red-900 underline"
                                >
                                  Abrir imagem
                                </a>
                              </div>
                            ) : (
                              <p className="mt-1 break-all text-sm font-semibold text-zinc-600">
                                {url || "URL/caminho não informado"}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderizarEmpresas() {
    return (
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Unidades
              </p>
              <p className="mt-2 text-3xl font-black text-red-950">
                {formatarNumero(dadosDashboard.unidades.length)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                com vistorias sincronizadas
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Total geral
              </p>
              <p className="mt-2 text-3xl font-black text-red-950">
                {formatarNumero(dadosDashboard.total)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                extintores, hidrantes e lava-olhos
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Não conformidades
              </p>
              <p className="mt-2 text-3xl font-black text-red-950">
                {formatarNumero(dadosDashboard.naoConformidades)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                encontradas nos checklists
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Conformidade
              </p>
              <p className="mt-2 text-3xl font-black text-red-950">
                {dadosDashboard.taxaConformidade}%
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                desempenho operacional
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-zinc-800">
              Resumo por unidade
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Visão rápida para apresentar ao cliente: quantidade de vistorias, tipos de equipamentos, pendências e última sincronização.
            </p>
          </CardHeader>

          <CardContent>
            {dadosDashboard.unidades.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm font-semibold text-zinc-500">
                Nenhuma unidade encontrada. Sincronize uma vistoria no aplicativo para aparecer aqui.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {dadosDashboard.unidades.map((unidade) => (
                  <div
                    key={unidade.nome}
                    className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                          Unidade
                        </p>
                        <h3 className="mt-1 text-xl font-black text-red-950">
                          {unidade.nome}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-zinc-500">
                          Última vistoria: {formatarData(unidade.ultimaData)}
                        </p>
                      </div>

                      <Badge
                        className={
                          unidade.naoConformidades > 0
                            ? "bg-red-100 text-red-900 hover:bg-red-100"
                            : "bg-green-100 text-green-800 hover:bg-green-100"
                        }
                      >
                        {unidade.naoConformidades > 0
                          ? `${unidade.naoConformidades} pendência(s)`
                          : "Sem pendências"}
                      </Badge>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-xl bg-red-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-900/70">
                          Total
                        </p>
                        <p className="mt-1 text-2xl font-black text-red-950">
                          {formatarNumero(unidade.total)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          Extintores
                        </p>
                        <p className="mt-1 text-2xl font-black text-zinc-900">
                          {formatarNumero(unidade.extintores)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          Hidrantes
                        </p>
                        <p className="mt-1 text-2xl font-black text-zinc-900">
                          {formatarNumero(unidade.hidrantes)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          Lava-olhos
                        </p>
                        <p className="mt-1 text-2xl font-black text-zinc-900">
                          {formatarNumero(unidade.lavaOlhos)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                          Último equipamento
                        </p>
                        <p className="text-sm font-bold text-zinc-800">
                          {unidade.ultimaVistoria
                            ? obterEquipamento(unidade.ultimaVistoria)
                            : "Não informado"}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        className="rounded-xl border-red-200 text-red-900 hover:bg-red-50"
                        onClick={() => {
                          setTelaAtiva("relatorios");
                          setRelEmpresa(unidade.nome);
                          setRelArea("TODAS");
                          setRelTipo("TODOS");
                          setRelColaborador("TODOS");
                          setRelatoriosBuscados(false);
                        }}
                      >
                        Abrir relatórios
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderizarColaboradores() {
    return (
      <div className="space-y-4">
        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {erro}
          </div>
        )}

        {aviso && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            {aviso}
          </div>
        )}

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black text-zinc-800">
              <Users className="h-5 w-5 text-red-900" />
              Adicionar colaborador
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Crie o login do colaborador para ele acessar o aplicativo SafeScan.
            </p>
          </CardHeader>

          <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="text-sm font-bold text-red-950">Nome</label>
              <Input
                value={nomeColaborador}
                onChange={(event) => setNomeColaborador(event.target.value)}
                placeholder="Nome do colaborador"
                className="mt-2 h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-red-950">E-mail</label>
              <Input
                type="email"
                value={emailColaborador}
                onChange={(event) => setEmailColaborador(event.target.value)}
                placeholder="colaborador@email.com"
                className="mt-2 h-11 rounded-xl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-red-950">
                  Senha temporária
                </label>
                <button
                  type="button"
                  onClick={gerarSenhaTemporaria}
                  className="text-xs font-black text-red-900 underline"
                >
                  Gerar
                </button>
              </div>

              <Input
                type="text"
                value={senhaColaborador}
                onChange={(event) => setSenhaColaborador(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-2 h-11 rounded-xl"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={cadastrarColaborador}
                disabled={salvandoColaborador}
                className="h-11 w-full rounded-xl bg-red-900 px-6 font-black text-white hover:bg-red-950 lg:w-auto"
              >
                {salvandoColaborador ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg font-black text-zinc-800">
                  Colaboradores cadastrados
                </CardTitle>
                <p className="text-sm text-zinc-500">
                  Lista carregada da tabela public.colaboradores.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input
                    value={buscaColaborador}
                    onChange={(event) => setBuscaColaborador(event.target.value)}
                    placeholder="Buscar colaborador"
                    className="h-11 rounded-xl pl-9 sm:w-72"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={carregarColaboradores}
                  disabled={carregandoColaboradores}
                  className="h-11 rounded-xl border-red-200 font-bold text-red-900"
                >
                  {carregandoColaboradores ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {carregandoColaboradores ? (
              <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-5 text-sm font-bold text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin text-red-900" />
                Carregando colaboradores...
              </div>
            ) : colaboradoresFiltrados.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-5 text-sm font-semibold text-zinc-500">
                Nenhum colaborador encontrado.
              </div>
            ) : (
              <div className="grid gap-3">
                {colaboradoresFiltrados.map((colaborador) => {
                  const nome = String(colaborador.nome ?? "Sem nome");
                  const email = String(colaborador.email ?? "Sem e-mail");
                  const perfil = String(colaborador.perfil ?? "colaborador");
                  const ativo = colaborador.ativo !== false;
                  const dataCriacao = pegarData(colaborador);

                  return (
                    <div
                      key={String(colaborador.id ?? email)}
                      className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1.5fr_1.5fr_1fr_1fr]"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Nome
                        </p>
                        <p className="mt-1 font-black text-red-950">{nome}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          E-mail
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold text-zinc-700">
                          {email}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Perfil
                        </p>
                        <Badge className="mt-1 bg-red-100 text-red-900 hover:bg-red-100">
                          {perfil}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Status
                        </p>
                        <div className="mt-1 flex flex-col gap-1">
                          <Badge
                            className={
                              ativo
                                ? "w-fit bg-green-100 text-green-800 hover:bg-green-100"
                                : "w-fit bg-zinc-200 text-zinc-700 hover:bg-zinc-200"
                            }
                          >
                            {ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          <span className="text-xs font-medium text-zinc-500">
                            {formatarData(dataCriacao)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderizarMapa() {
    const itemSelecionado = mapaSelecionado;
    const vistoriaSelecionadaMapa = itemSelecionado?.vistoria ?? null;
    const coordenadasSelecionadas = itemSelecionado?.coordenadas ?? null;
    const fotoSelecionada = fotoMapaSelecionado;

    return (
      <div className="space-y-4">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-zinc-800">
              Mapa operacional das vistorias
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Localize as vistorias sincronizadas pelo GPS do aplicativo, filtre por empresa, área, tipo, colaborador e período, e abra a rota diretamente no Google Maps.
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl bg-red-900 p-5 text-white shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-100">
                  Pontos com GPS
                </p>
                <p className="mt-3 text-3xl font-black">
                  {formatarNumero(vistoriasComGps.length)}
                </p>
                <p className="mt-1 text-xs font-semibold text-red-100">
                  vistorias localizadas no mapa
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-900">
                  Resultado filtrado
                </p>
                <p className="mt-3 text-3xl font-black text-red-950">
                  {formatarNumero(mapaPontosFiltrados.length)}
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  ponto(s) conforme os filtros
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Sem coordenada
                </p>
                <p className="mt-3 text-3xl font-black text-zinc-800">
                  {formatarNumero(totalVistoriasSemGps)}
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  vistorias sem latitude/longitude
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-5 text-white shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">
                  Ponto selecionado
                </p>
                <p className="mt-3 text-sm font-black">
                  {coordenadasSelecionadas
                    ? `${formatarCoordenada(coordenadasSelecionadas.latitude)}, ${formatarCoordenada(coordenadasSelecionadas.longitude)}`
                    : "Nenhum ponto"}
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-400">
                  coordenada da vistoria atual
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <label className="mb-2 block text-sm font-bold text-red-950">
                  Empresa
                </label>
                <select
                  value={mapaEmpresa}
                  onChange={(event) => setMapaEmpresa(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none focus:border-red-400"
                >
                  <option value="TODAS">Todas</option>
                  {empresasRelatorioDisponiveis.map((empresa) => (
                    <option key={empresa} value={empresa}>
                      {empresa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="mb-2 block text-sm font-bold text-red-950">
                  Área
                </label>
                <select
                  value={mapaArea}
                  onChange={(event) => setMapaArea(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none focus:border-red-400"
                >
                  <option value="TODAS">Todas</option>
                  {areasRelatorioDisponiveis.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="mb-2 block text-sm font-bold text-red-950">
                  Tipo
                </label>
                <select
                  value={mapaTipo}
                  onChange={(event) => setMapaTipo(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none focus:border-red-400"
                >
                  <option value="TODOS">Todos</option>
                  {tiposRelatorioDisponiveis.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="mb-2 block text-sm font-bold text-red-950">
                  Colaborador
                </label>
                <select
                  value={mapaColaborador}
                  onChange={(event) => setMapaColaborador(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none focus:border-red-400"
                >
                  <option value="TODOS">Todos</option>
                  {colaboradoresRelatorioDisponiveis.map((colaborador) => (
                    <option key={colaborador} value={colaborador}>
                      {colaborador}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="mb-2 block text-sm font-bold text-red-950">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    value={mapaBusca}
                    onChange={(event) => setMapaBusca(event.target.value)}
                    placeholder="Equipamento, ID ou local"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
              <div>
                <label className="mb-2 block text-sm font-bold text-red-950">
                  Data início
                </label>
                <Input
                  type="date"
                  value={mapaDataInicio}
                  onChange={(event) => setMapaDataInicio(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-red-950">
                  Data fim
                </label>
                <Input
                  type="date"
                  value={mapaDataFim}
                  onChange={(event) => setMapaDataFim(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={limparFiltrosMapa}
                  className="h-11 w-full rounded-xl border-red-200 font-bold text-red-900"
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-zinc-800">
                    Visualização do mapa
                  </CardTitle>
                  <p className="text-sm text-zinc-500">
                    Clique em uma vistoria na lista para centralizar o mapa naquele ponto.
                  </p>
                </div>

                {coordenadasSelecionadas ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        window.open(
                          montarUrlGoogleMaps(
                            coordenadasSelecionadas.latitude,
                            coordenadasSelecionadas.longitude
                          ),
                          "_blank"
                        )
                      }
                      className="rounded-xl bg-red-900 font-bold text-white hover:bg-red-950"
                    >
                      Abrir no Maps
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          montarUrlRotaGoogleMaps(
                            coordenadasSelecionadas.latitude,
                            coordenadasSelecionadas.longitude
                          ),
                          "_blank"
                        )
                      }
                      className="rounded-xl border-red-200 font-bold text-red-900"
                    >
                      Abrir rota
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent>
              {coordenadasSelecionadas && vistoriaSelecionadaMapa ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                    <iframe
                      title="Mapa da vistoria selecionada"
                      src={montarUrlMapaEmbed(
                        coordenadasSelecionadas.latitude,
                        coordenadasSelecionadas.longitude
                      )}
                      className="h-[480px] w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>

                  <div className="grid gap-4 rounded-2xl border border-red-100 bg-red-50 p-5 lg:grid-cols-[1fr_220px]">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-900">
                          Empresa
                        </p>
                        <p className="mt-1 font-black text-red-950">
                          {obterEmpresaRelatorio(vistoriaSelecionadaMapa)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-900">
                          Área
                        </p>
                        <p className="mt-1 font-black text-red-950">
                          {obterAreaRelatorio(vistoriaSelecionadaMapa)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-900">
                          Equipamento
                        </p>
                        <p className="mt-1 font-black text-red-950">
                          {obterEquipamento(vistoriaSelecionadaMapa)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-900">
                          Tipo
                        </p>
                        <p className="mt-1 font-black text-red-950">
                          {obterTipo(vistoriaSelecionadaMapa)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-900">
                          Colaborador
                        </p>
                        <p className="mt-1 font-black text-red-950">
                          {obterColaboradorExibido(vistoriaSelecionadaMapa)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-900">
                          Data
                        </p>
                        <p className="mt-1 font-black text-red-950">
                          {formatarData(pegarData(vistoriaSelecionadaMapa))}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white bg-white p-2 shadow-sm">
                      {fotoSelecionada ? (
                        <img
                          src={fotoSelecionada}
                          alt="Foto da vistoria selecionada"
                          className="h-44 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl bg-zinc-100 text-center text-xs font-bold text-zinc-400">
                          <ImageIcon className="mb-2 h-6 w-6" />
                          Sem foto vinculada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                  <MapPin className="h-12 w-12 text-zinc-300" />
                  <h3 className="mt-4 text-xl font-black text-zinc-800">
                    Nenhuma vistoria com GPS encontrada
                  </h3>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-zinc-500">
                    Verifique se o aplicativo está salvando latitude e longitude na sincronização. Quando houver coordenadas, os pontos aparecerão aqui automaticamente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-zinc-800">
                Vistorias localizadas
              </CardTitle>
              <p className="text-sm text-zinc-500">
                {formatarNumero(mapaPontosFiltrados.length)} ponto(s) com GPS no filtro atual.
              </p>
            </CardHeader>

            <CardContent>
              {mapaPontosFiltrados.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 p-5 text-sm font-semibold text-zinc-500">
                  Nenhum ponto localizado para os filtros selecionados.
                </div>
              ) : (
                <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
                  {mapaPontosFiltrados.map(({ vistoria, coordenadas }) => {
                    const id = String(vistoria.id ?? "");
                    const ativo =
                      itemSelecionado &&
                      String(itemSelecionado.vistoria.id) === String(vistoria.id);
                    const naoConformes = totalNaoConformidadesDaVistoria(vistoria.id);
                    const foto = obterUrlFoto(vistoria);

                    return (
                      <button
                        key={`${id}-${coordenadas.latitude}-${coordenadas.longitude}`}
                        type="button"
                        onClick={() => setMapaSelecionadaId(id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          ativo
                            ? "border-red-700 bg-red-50 shadow-sm"
                            : "border-zinc-200 bg-white hover:border-red-200 hover:bg-red-50/40"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-900 text-white">
                            <MapPin className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="line-clamp-2 text-sm font-black text-red-950">
                                  {obterEquipamento(vistoria)}
                                </p>
                                <p className="mt-1 text-xs font-bold text-zinc-500">
                                  {obterEmpresaRelatorio(vistoria)} • {obterAreaRelatorio(vistoria)}
                                </p>
                              </div>

                              {foto ? (
                                <img
                                  src={foto}
                                  alt="Foto da vistoria"
                                  className="h-12 w-12 rounded-xl object-cover"
                                />
                              ) : null}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-zinc-600">
                              <span>{obterTipo(vistoria)}</span>
                              <span>{formatarData(pegarData(vistoria))}</span>
                              <span>{obterColaboradorExibido(vistoria)}</span>
                              <span
                                className={
                                  naoConformes > 0 ? "text-red-800" : "text-green-700"
                                }
                              >
                                {naoConformes} N.C.
                              </span>
                            </div>

                            <p className="mt-3 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">
                              GPS: {formatarCoordenada(coordenadas.latitude)}, {formatarCoordenada(coordenadas.longitude)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderizarTelaEmConstrucao() {
    return (
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-black text-zinc-800">
            {tituloDaTela(telaAtiva)}
          </CardTitle>
          <p className="text-sm text-zinc-500">{descricaoDaTela(telaAtiva)}</p>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-dashed border-red-900/30 bg-red-50 p-8">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-red-900">
              Próxima etapa
            </p>
            <h3 className="mt-3 text-2xl font-black text-red-950">
              Esta área já está preparada.
            </h3>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-zinc-600">
              A próxima evolução é criar a tela completa de{" "}
              {tituloDaTela(telaAtiva)} com dados reais do Supabase, filtros e
              ações.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderizarConteudo() {
    if (telaAtiva === "dashboard") return renderizarDashboard();
    if (telaAtiva === "vistorias") return renderizarVistorias();
    if (telaAtiva === "empresas") return renderizarEmpresas();
    if (telaAtiva === "colaboradores") return renderizarColaboradores();
    if (telaAtiva === "relatorios") return renderizarRelatorios();
    if (telaAtiva === "mapa") return renderizarMapa();

    return renderizarTelaEmConstrucao();
  }

  return (
    <main className="min-h-screen bg-[#eef0f2] text-zinc-950">
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-zinc-200 bg-white px-4 shadow-sm">
          <div className="flex w-64 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900 text-yellow-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-black leading-none text-red-950">
                SafeScan
              </p>
              <p className="text-xs font-bold text-zinc-500">Admin</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 text-sm font-semibold text-zinc-500 lg:flex">
            {menu.slice(0, 5).map((item) => (
              <button
                key={`top-${item.id}`}
                type="button"
                onClick={() => setTelaAtiva(item.id)}
                className={`rounded-xl px-3 py-2 transition ${
                  telaAtiva === item.id
                    ? "bg-red-50 font-black text-red-950"
                    : "hover:bg-zinc-100 hover:text-red-950"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden h-10 w-72 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 lg:flex">
              <Search className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">
                Encontrar vistoria, empresa ou colaborador
              </span>
            </div>

            <Button
              onClick={carregarDados}
              disabled={carregandoDados}
              className="rounded-xl bg-red-900 text-white hover:bg-red-950"
            >
              {carregandoDados ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando
                </>
              ) : (
                "Atualizar"
              )}
            </Button>

            <div className="hidden text-right text-xs lg:block">
              <p className="font-bold text-zinc-700">Usuário</p>
              <p className="max-w-48 truncate text-zinc-500">{sessionEmail}</p>
              <p className="font-bold text-red-900">{papelUsuario}</p>
            </div>
          </div>
        </header>

        <div className="flex">
          <aside className="hidden min-h-[calc(100vh-64px)] w-64 border-r border-zinc-200 bg-white lg:block">
            <nav className="space-y-1 p-3">
              {menu.map((item) => {
                const Icone = item.icon;
                const ativo = telaAtiva === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTelaAtiva(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                      ativo
                        ? "bg-red-100 font-black text-red-950"
                        : "font-semibold text-zinc-600 hover:bg-red-50 hover:text-red-950"
                    }`}
                  >
                    <Icone className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}

              <div className="pt-3">
                <Button
                  onClick={sair}
                  variant="outline"
                  className="w-full justify-start rounded-xl border-red-200 text-red-900 hover:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </nav>
          </aside>

          <section className="flex-1 p-4">
            <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    Online
                  </Badge>
                  <Badge variant="outline" className="border-zinc-300 text-zinc-600">
                    Banco sincronizado
                  </Badge>
                  <Badge className="bg-red-50 text-red-900 hover:bg-red-50">
                    Perfil {papelUsuario}
                  </Badge>
                </div>

                <h1 className="mt-3 text-2xl font-black text-zinc-900">
                  {tituloDaTela(telaAtiva)}
                </h1>

                <p className="mt-1 max-w-3xl text-sm font-medium text-zinc-500">
                  {descricaoDaTela(telaAtiva)}
                </p>
              </div>

              <div className="grid min-w-[280px] grid-cols-2 gap-3 rounded-2xl bg-zinc-50 p-3 text-sm">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    Registros
                  </p>
                  <p className="text-lg font-black text-red-950">
                    {formatarNumero(vistorias.length)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    Origem
                  </p>
                  <p className="text-lg font-black text-red-950">Supabase</p>
                </div>
              </div>
            </div>

            {renderizarConteudo()}
          </section>
        </div>
      </div>
    </main>
  );
}