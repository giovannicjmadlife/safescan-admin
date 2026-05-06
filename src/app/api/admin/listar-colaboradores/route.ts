import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { sucesso: false, erro: "Variáveis do Supabase não configuradas." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from("colaboradores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { sucesso: false, erro: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      colaboradores: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: "Erro interno ao listar colaboradores.",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}
