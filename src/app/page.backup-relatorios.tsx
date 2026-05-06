"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
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
    return "Resumo das unidades com vistorias sincronizadas.";
  }

  if (tela === "colaboradores") {
    return "Área preparada para produtividade e gestão de usuários.";
  }

  if (tela === "relatorios") {
    return "Área preparada para relatórios em PDF e Excel.";
  }

  return "Área preparada para localização GPS das vistorias.";
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
      .map(([nome, itens]) => ({
        nome,
        total: itens.length,
      }))
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
          <Card className="rounded-xl border-0 bg-[#991b1b] text-white shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-2xl font-black">
                  {formatarNumero(dadosDashboard.total)}
                </p>
                <p className="text-xs font-semibold text-white/80">
                  Vistorias gerais
                </p>
              </div>
              <ClipboardCheck className="h-9 w-9 text-white/85" />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 bg-[#b91c1c] text-white shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-2xl font-black">
                  {dadosDashboard.taxaConformidade}%
                </p>
                <p className="text-xs font-semibold text-white/80">
                  Taxa de conformidade
                </p>
              </div>
              <CheckCircle2 className="h-9 w-9 text-white/85" />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 bg-[#7f1d1d] text-white shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-2xl font-black">
                  {formatarNumero(dadosDashboard.naoConformidades)}
                </p>
                <p className="text-xs font-semibold text-white/80">
                  Não conformidades
                </p>
              </div>
              <AlertTriangle className="h-9 w-9 text-white/85" />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 bg-[#dc2626] text-white shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-2xl font-black">
                  {formatarNumero(dadosDashboard.testesHidrostaticos)}
                </p>
                <p className="text-xs font-semibold text-white/80">
                  Testes hidrostáticos
                </p>
              </div>
              <Droplets className="h-9 w-9 text-white/85" />
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

              <div className="rounded-xl bg-yellow-50 p-4">
                <p className="text-sm font-black text-yellow-900">
                  Regra do dashboard
                </p>
                <p className="mt-1 text-sm font-medium text-yellow-900/80">
                  Teste Hidrostático sincroniza no banco, mas não entra no total
                  geral de extintores, hidrantes e lava-olhos.
                </p>
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
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-black text-zinc-800">
            Resumo por unidade
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Agrupamento automático conforme os campos disponíveis no banco.
          </p>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dadosDashboard.unidades.length === 0 ? (
            <div className="rounded-xl bg-zinc-50 p-5 text-sm font-semibold text-zinc-500">
              Nenhuma unidade encontrada.
            </div>
          ) : (
            dadosDashboard.unidades.map((unidade) => (
              <div
                key={unidade.nome}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Unidade
                </p>
                <p className="mt-2 font-black text-red-950">{unidade.nome}</p>
                <p className="mt-4 text-2xl font-black text-zinc-900">
                  {formatarNumero(unidade.total)}
                </p>
                <p className="text-sm text-zinc-500">vistorias</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
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

          <nav className="hidden items-center gap-6 text-sm font-semibold text-zinc-500 lg:flex">
            <span>Dashboard</span>
            <span>Vistorias</span>
            <span>Gestão</span>
            <span>Relatórios</span>
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
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-red-900 text-white hover:bg-red-900">
                    Produção
                  </Badge>
                  <Badge variant="outline" className="border-zinc-300 text-zinc-600">
                    Dados reais do Supabase
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    Acesso {papelUsuario}
                  </Badge>
                </div>

                <h1 className="mt-2 text-2xl font-black text-zinc-900">
                  {tituloDaTela(telaAtiva)}
                </h1>

                <p className="text-sm font-medium text-zinc-500">
                  {descricaoDaTela(telaAtiva)}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-900">
                  Fonte
                </p>
                <p className="font-black text-red-950">Supabase</p>
              </div>
            </div>

            {renderizarConteudo()}
          </section>
        </div>
      </div>
    </main>
  );
}