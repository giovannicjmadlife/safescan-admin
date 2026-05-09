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

  if (!perfilAdmin) {
    return {
      autorizado: false,
      status: 403,
      erro: "Acesso bloqueado: usuário sem perfil administrativo.",
      usuarioId,
    };
  }

  if (perfilAdmin.ativo !== true) {
    return {
      autorizado: false,
      status: 403,
      erro: "Acesso bloqueado: usuário administrativo inativo.",
      usuarioId,
    };
  }

  if (!papelEhAdministrativo(perfilAdmin.papel)) {
    return {
      autorizado: false,
      status: 403,
      erro: "Acesso bloqueado: somente ADMIN ou SUPER_ADMIN pode alterar colaboradores.",
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

async function tentarAtualizarAuthUsuario(
  supabaseAdmin: any,
  authUserId: string,
  ativo: boolean
) {
  if (!authUserId) return;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    ban_duration: ativo ? "none" : "876000h",
  } as any);

  if (error) {
    throw new Error(`Erro ao atualizar Supabase Auth: ${error.message}`);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Variáveis do Supabase não configuradas.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin: any = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const admin = await validarAdmin(request, supabaseAdmin);

    if (!admin.autorizado) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: admin.erro,
        },
        { status: admin.status }
      );
    }

    const body = await request.json();

    const id = String(body.id || "").trim();
    const acao = normalizarTexto(body.acao);

    if (!id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "ID do colaborador não informado.",
        },
        { status: 400 }
      );
    }

    if (!["INATIVAR", "REATIVAR", "EXCLUIR"].includes(acao)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Ação inválida. Use INATIVAR, REATIVAR ou EXCLUIR.",
        },
        { status: 400 }
      );
    }

    const { data: colaborador, error: colaboradorError } = await supabaseAdmin
      .from("colaboradores")
      .select("id, auth_user_id, nome, email, perfil, ativo")
      .eq("id", id)
      .maybeSingle();

    if (colaboradorError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Erro ao buscar colaborador: ${colaboradorError.message}`,
        },
        { status: 400 }
      );
    }

    if (!colaborador) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Colaborador não encontrado.",
        },
        { status: 404 }
      );
    }

    const authUserId = String(colaborador.auth_user_id || "").trim();
    const email = String(colaborador.email || "").trim().toLowerCase();

    if (acao === "REATIVAR") {
      await tentarAtualizarAuthUsuario(supabaseAdmin, authUserId, true);

      const { error: colaboradorUpdateError } = await supabaseAdmin
        .from("colaboradores")
        .update({ ativo: true })
        .eq("id", id);

      if (colaboradorUpdateError) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Erro ao reativar colaborador: ${colaboradorUpdateError.message}`,
          },
          { status: 400 }
        );
      }

      if (authUserId) {
        const { error: perfilUpdateError } = await supabaseAdmin
          .from("perfis")
          .update({ ativo: true })
          .eq("id", authUserId);

        if (perfilUpdateError) {
          return NextResponse.json(
            {
              sucesso: false,
              erro: `Erro ao reativar perfil: ${perfilUpdateError.message}`,
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: "Colaborador reativado com sucesso.",
      });
    }

    await tentarAtualizarAuthUsuario(supabaseAdmin, authUserId, false);

    if (authUserId) {
      const { error: perfilUpdateError } = await supabaseAdmin
        .from("perfis")
        .update({ ativo: false })
        .eq("id", authUserId);

      if (perfilUpdateError) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Erro ao inativar perfil: ${perfilUpdateError.message}`,
          },
          { status: 400 }
        );
      }
    } else if (email) {
      await supabaseAdmin
        .from("perfis")
        .update({ ativo: false })
        .eq("email", email);
    }

    if (acao === "EXCLUIR") {
      await supabaseAdmin
        .from("usuarios_empresas")
        .delete()
        .eq("usuario_id", authUserId || id);

      await supabaseAdmin
        .from("dispositivos_autorizados")
        .update({ status: "BLOQUEADO", bloqueado_em: new Date().toISOString() })
        .eq("usuario_id", authUserId || id);

      const { error: deleteError } = await supabaseAdmin
        .from("colaboradores")
        .delete()
        .eq("id", id);

      if (deleteError) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Erro ao excluir colaborador: ${deleteError.message}`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: "Colaborador excluído com sucesso.",
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("colaboradores")
      .update({ ativo: false })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Erro ao inativar colaborador: ${updateError.message}`,
        },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from("dispositivos_autorizados")
      .update({ status: "BLOQUEADO", bloqueado_em: new Date().toISOString() })
      .eq("usuario_id", authUserId || id);

    return NextResponse.json({
      sucesso: true,
      mensagem: "Colaborador inativado com sucesso.",
    });
  } catch (error: unknown) {
    const detalhe = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        sucesso: false,
        erro: detalhe || "Erro interno ao atualizar colaborador.",
      },
      { status: 500 }
    );
  }
}
