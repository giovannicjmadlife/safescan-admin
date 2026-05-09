import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function papelEhAdministrativo(papel: unknown) {
  const papelNormalizado = normalizarTexto(papel);
  return papelNormalizado === "ADMIN" || papelNormalizado === "SUPER_ADMIN";
}

function extrairBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const partes = authorization.split(" ");

  if (partes.length !== 2) return "";
  if (partes[0].toLowerCase() !== "bearer") return "";

  return partes[1].trim();
}

async function validarAdmin(request: Request, supabaseAdmin: any) {
  const token = extrairBearerToken(request);

  if (!token) {
    return {
      autorizado: false,
      status: 401,
      erro: "Token de acesso não enviado.",
      usuarioId: "",
    };
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user?.id) {
    return {
      autorizado: false,
      status: 401,
      erro: "Sessão inválida ou expirada. Saia e entre novamente no painel.",
      usuarioId: "",
    };
  }

  const usuarioId = userData.user.id;

  const { data: perfilAdmin, error: perfilError } = await supabaseAdmin
    .from("perfis")
    .select("id, email, papel, ativo")
    .eq("id", usuarioId)
    .maybeSingle();

  if (perfilError) {
    return {
      autorizado: false,
      status: 500,
      erro: `Erro ao validar perfil administrativo: ${perfilError.message}`,
      usuarioId,
    };
  }

  if (!perfilAdmin || perfilAdmin.ativo !== true) {
    return {
      autorizado: false,
      status: 403,
      erro: "Acesso bloqueado: usuário sem perfil administrativo ativo.",
      usuarioId,
    };
  }

  if (!papelEhAdministrativo(perfilAdmin.papel)) {
    return {
      autorizado: false,
      status: 403,
      erro: "Acesso bloqueado: somente ADMIN ou SUPER_ADMIN pode alterar o catálogo.",
      usuarioId,
    };
  }

  return {
    autorizado: true,
    status: 200,
    erro: "",
    usuarioId,
  };
}

function criarSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variáveis do Supabase não configuradas.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}


export async function GET(request: Request) {
  try {
    const supabaseAdmin: any = criarSupabaseAdmin();
    const admin = await validarAdmin(request, supabaseAdmin);

    if (!admin.autorizado) {
      return NextResponse.json(
        { sucesso: false, erro: admin.erro },
        { status: admin.status }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("catalogo_equipamentos")
      .select("*")
      .order("empresa_nome", { ascending: true })
      .order("area_nome", { ascending: true })
      .order("tipo", { ascending: true })
      .order("ordem", { ascending: true })
      .order("equipamento_nome", { ascending: true });

    if (error) {
      return NextResponse.json(
        { sucesso: false, erro: `Erro ao listar catálogo: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ sucesso: true, catalogo: data ?? [] });
  } catch (error: unknown) {
    const detalhe = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { sucesso: false, erro: detalhe || "Erro interno ao listar catálogo." },
      { status: 500 }
    );
  }
}
