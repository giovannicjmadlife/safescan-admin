import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMPRESAS_OFICIAIS = [
  "BP - TROPICAL",
  "BP - ITUMBIARA",
  "BP - ITUIUTABA",
  "BP - ITAPAGIPE",
  "BP - FRUTAL",
  "BP - SANTA JULIANA",
];

function gerarSenhaTemporaria() {
  const numero = Math.floor(100000 + Math.random() * 900000);
  return `SafeScan@${numero}`;
}

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

function erroAuthUsuarioJaExiste(error: unknown) {
  const mensagem = error instanceof Error ? error.message : String(error ?? "");
  const texto = normalizarTexto(mensagem);

  return (
    texto.includes("ALREADY") ||
    texto.includes("REGISTERED") ||
    texto.includes("EXISTS") ||
    texto.includes("DUPLICATE") ||
    texto.includes("JA EXISTE") ||
    texto.includes("EXISTE")
  );
}

async function buscarAuthUserIdPorEmail(supabaseAdmin: any, email: string) {
  const { data: perfilExistente } = await supabaseAdmin
    .from("perfis")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (perfilExistente?.id) {
    return String(perfilExistente.id);
  }

  const { data: colaboradorExistente } = await supabaseAdmin
    .from("colaboradores")
    .select("auth_user_id")
    .eq("email", email)
    .maybeSingle();

  if (colaboradorExistente?.auth_user_id) {
    return String(colaboradorExistente.auth_user_id);
  }

  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: pagina,
      perPage: 1000,
    });

    if (error) {
      throw new Error(`Erro ao buscar usuário no Auth: ${error.message}`);
    }

    const usuario = data.users.find(
      (item: any) => String(item.email ?? "").toLowerCase() === email
    );

    if (usuario?.id) {
      return usuario.id;
    }

    if (data.users.length < 1000) {
      break;
    }
  }

  return "";
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
      erro: "Acesso bloqueado: somente ADMIN ou SUPER_ADMIN pode criar colaborador.",
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

export async function POST(request: Request) {
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

    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "").trim() || gerarSenhaTemporaria();

    if (!nome) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Informe o nome do colaborador.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Informe o e-mail do colaborador.",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Informe um e-mail válido para o colaborador.",
        },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "A senha precisa ter pelo menos 6 caracteres.",
        },
        { status: 400 }
      );
    }

    let authUserId = "";

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome,
          perfil: "colaborador",
        },
      });

    if (authError) {
      if (!erroAuthUsuarioJaExiste(authError)) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Erro ao criar usuário no Supabase Auth: ${authError.message}`,
          },
          { status: 400 }
        );
      }

      authUserId = await buscarAuthUserIdPorEmail(supabaseAdmin, email);

      if (!authUserId) {
        return NextResponse.json(
          {
            sucesso: false,
            erro:
              "O e-mail já existe no Auth, mas não foi possível localizar o ID do usuário.",
          },
          { status: 400 }
        );
      }

      const { error: updateAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: senha,
          email_confirm: true,
          user_metadata: {
            nome,
            perfil: "colaborador",
          },
        });

      if (updateAuthError) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Usuário já existia, mas não foi possível atualizar senha/metadados: ${updateAuthError.message}`,
          },
          { status: 400 }
        );
      }
    } else {
      authUserId = authData.user?.id || "";
    }

    if (!authUserId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Usuário criado ou localizado, mas o ID não foi retornado.",
        },
        { status: 500 }
      );
    }

    const { data: colaboradorPorAuth } = await supabaseAdmin
      .from("colaboradores")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    let colaboradorPorEmail = null;

    if (!colaboradorPorAuth) {
      const { data } = await supabaseAdmin
        .from("colaboradores")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      colaboradorPorEmail = data;
    }

    const colaboradorExistente = colaboradorPorAuth || colaboradorPorEmail;

    let colaborador;

    if (colaboradorExistente?.id) {
      const { data, error } = await supabaseAdmin
        .from("colaboradores")
        .update({
          auth_user_id: authUserId,
          nome,
          email,
          perfil: "colaborador",
          ativo: true,
        })
        .eq("id", colaboradorExistente.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Erro ao atualizar public.colaboradores: ${error.message}`,
          },
          { status: 400 }
        );
      }

      colaborador = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("colaboradores")
        .insert({
          auth_user_id: authUserId,
          nome,
          email,
          perfil: "colaborador",
          ativo: true,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Erro ao inserir public.colaboradores: ${error.message}`,
          },
          { status: 400 }
        );
      }

      colaborador = data;
    }

    const { error: perfilError } = await supabaseAdmin.from("perfis").upsert(
      {
        id: authUserId,
        nome,
        email,
        papel: "COLABORADOR",
        ativo: true,
      },
      {
        onConflict: "id",
      }
    );

    if (perfilError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Erro ao criar/atualizar public.perfis: ${perfilError.message}`,
        },
        { status: 400 }
      );
    }

    const { data: empresas, error: empresasError } = await supabaseAdmin
      .from("empresas")
      .select("id, nome")
      .in("nome", EMPRESAS_OFICIAIS);

    if (empresasError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Erro ao buscar empresas oficiais: ${empresasError.message}`,
        },
        { status: 400 }
      );
    }

    const empresasEncontradas = empresas ?? [];

    const nomesEncontrados = new Set(
      empresasEncontradas.map((empresa: any) => String(empresa.nome))
    );

    const empresasFaltando = EMPRESAS_OFICIAIS.filter(
      (nomeEmpresa) => !nomesEncontrados.has(nomeEmpresa)
    );

    if (empresasFaltando.length > 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Empresas oficiais não encontradas no Supabase: ${empresasFaltando.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    const empresaIds = empresasEncontradas.map((empresa: any) =>
      String(empresa.id)
    );

    const { data: vinculosExistentes, error: vinculosError } =
      await supabaseAdmin
        .from("usuarios_empresas")
        .select("usuario_id, empresa_id")
        .eq("usuario_id", authUserId)
        .in("empresa_id", empresaIds);

    if (vinculosError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Erro ao consultar public.usuarios_empresas: ${vinculosError.message}`,
        },
        { status: 400 }
      );
    }

    const chavesExistentes = new Set(
      (vinculosExistentes ?? []).map(
        (vinculo: any) =>
          `${String(vinculo.usuario_id)}|${String(vinculo.empresa_id)}`
      )
    );

    const vinculosParaInserir = empresasEncontradas
      .filter(
        (empresa: any) =>
          !chavesExistentes.has(`${authUserId}|${String(empresa.id)}`)
      )
      .map((empresa: any) => ({
        usuario_id: authUserId,
        empresa_id: empresa.id,
      }));

    if (vinculosParaInserir.length > 0) {
      const { error: inserirVinculosError } = await supabaseAdmin
        .from("usuarios_empresas")
        .insert(vinculosParaInserir);

      if (inserirVinculosError) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Erro ao liberar empresas para o colaborador: ${inserirVinculosError.message}`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: "Colaborador criado/atualizado com sucesso.",
      colaborador,
      perfil: {
        id: authUserId,
        nome,
        email,
        papel: "COLABORADOR",
        ativo: true,
      },
      empresas_liberadas: empresasEncontradas.length,
      novos_vinculos: vinculosParaInserir.length,
      senha_temporaria: senha,
    });
  } catch (error: unknown) {
    const detalhe = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        sucesso: false,
        erro: "Erro interno ao criar colaborador.",
        detalhe,
      },
      { status: 500 }
    );
  }
}
