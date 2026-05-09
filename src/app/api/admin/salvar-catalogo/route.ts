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


function statusCatalogo(valor: unknown) {
  const status = normalizarTexto(valor || "ATIVO");
  return status === "INATIVO" ? "INATIVO" : "ATIVO";
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin: any = criarSupabaseAdmin();
    const admin = await validarAdmin(request, supabaseAdmin);

    if (!admin.autorizado) {
      return NextResponse.json(
        { sucesso: false, erro: admin.erro },
        { status: admin.status }
      );
    }

    const body = await request.json();

    const id = String(body.id || "").trim();
    const empresa_nome = String(body.empresa_nome || "").trim();
    const area_nome = String(body.area_nome || "").trim();
    const tipo = String(body.tipo || "").trim().toUpperCase();
    const equipamento_nome = String(body.equipamento_nome || "").trim();
    const status = statusCatalogo(body.status);
    const ordem = Number(body.ordem ?? 0);

    if (!empresa_nome) {
      return NextResponse.json({ sucesso: false, erro: "Informe a empresa." }, { status: 400 });
    }

    if (!area_nome) {
      return NextResponse.json({ sucesso: false, erro: "Informe a área." }, { status: 400 });
    }

    if (!tipo) {
      return NextResponse.json({ sucesso: false, erro: "Informe o tipo." }, { status: 400 });
    }

    if (!equipamento_nome) {
      return NextResponse.json({ sucesso: false, erro: "Informe o equipamento." }, { status: 400 });
    }

    const payload = {
      empresa_nome,
      area_nome,
      tipo,
      equipamento_nome,
      status,
      ordem: Number.isFinite(ordem) ? ordem : 0,
      atualizado_por: admin.usuarioId,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabaseAdmin
        .from("catalogo_equipamentos")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        const mensagem = error.code === "23505"
          ? "Já existe um equipamento igual cadastrado para essa empresa, área e tipo."
          : `Erro ao atualizar catálogo: ${error.message}`;

        return NextResponse.json({ sucesso: false, erro: mensagem }, { status: 400 });
      }

      return NextResponse.json({ sucesso: true, catalogo: data });
    }

    const { data, error } = await supabaseAdmin
      .from("catalogo_equipamentos")
      .insert({
        ...payload,
        criado_por: admin.usuarioId,
      })
      .select("*")
      .single();

    if (error) {
      const mensagem = error.code === "23505"
        ? "Já existe um equipamento igual cadastrado para essa empresa, área e tipo."
        : `Erro ao cadastrar catálogo: ${error.message}`;

      return NextResponse.json({ sucesso: false, erro: mensagem }, { status: 400 });
    }

    return NextResponse.json({ sucesso: true, catalogo: data });
  } catch (error: unknown) {
    const detalhe = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { sucesso: false, erro: detalhe || "Erro interno ao salvar catálogo." },
      { status: 500 }
    );
  }
}
