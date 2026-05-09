import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function criarRespostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function verificarAdmin(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      autorizado: false,
      erro: "Variáveis do Supabase não configuradas no servidor.",
      status: 500,
      usuarioId: null,
    };
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace("Bearer ", "").trim();

  if (!token) {
    return {
      autorizado: false,
      erro: "Token de acesso não enviado.",
      status: 401,
      usuarioId: null,
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      autorizado: false,
      erro: "Sessão inválida ou expirada.",
      status: 401,
      usuarioId: null,
    };
  }

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from("perfis")
    .select("id, email, papel, ativo")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (perfilError) {
    return {
      autorizado: false,
      erro: `Erro ao verificar perfil: ${perfilError.message}`,
      status: 500,
      usuarioId: null,
    };
  }

  if (!perfil || perfil.ativo !== true) {
    return {
      autorizado: false,
      erro: "Usuário sem perfil administrativo ativo.",
      status: 403,
      usuarioId: null,
    };
  }

  const papel = String(perfil.papel || "").trim().toUpperCase();

  if (papel !== "ADMIN" && papel !== "SUPER_ADMIN") {
    return {
      autorizado: false,
      erro: "Acesso permitido apenas para ADMIN ou SUPER_ADMIN.",
      status: 403,
      usuarioId: null,
    };
  }

  return {
    autorizado: true,
    erro: "",
    status: 200,
    usuarioId: userData.user.id,
  };
}

export async function GET(request: NextRequest) {
  const admin = await verificarAdmin(request);

  if (!admin.autorizado) {
    return criarRespostaErro(admin.erro, admin.status);
  }

  const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabaseAdmin
    .from("dispositivos_autorizados")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return criarRespostaErro(`Erro ao listar dispositivos: ${error.message}`, 500);
  }

  return NextResponse.json({
    dispositivos: data ?? [],
  });
}