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
  | "catalogo"
  | "colaboradores"
  | "dispositivos"
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

const TIPOS_CATALOGO = [
  { valor: "EXTINTORES", label: "Extintores" },
  { valor: "HIDRANTES", label: "Hidrantes" },
  { valor: "LAVA_OLHOS", label: "Lava-olhos" },
  { valor: "TESTE_HIDROSTATICO", label: "Teste hidrostático" },
];

const OPCAO_NOVO_CATALOGO = "__NOVO__";

// Inventário fixo legado importado exatamente do main.dart do app Flutter.
// Esse mapa é a base verdadeira para calcular o dashboard de extintores por empresa/área.
// Não calcular o total usando apenas as vistorias filtradas, senão 1 vistoria vira 1/1 = 100%.
const CATALOGO_FIXO_EXTINTORES: Record<string, Record<string, string[]>> = {
  "BP - TROPICAL": {
    "POSTO": [
      "1-POSTO ESCRITÓRIO",
      "2-POSTO BOMBA 08 E 09",
      "3-POSTO BOMBA 08 E 09",
      "4-POSTO BOMBA 10 E 11",
      "5-POSTO BOMBA 10 E 11",
      "6-POSTO BOMBA ALTA VAZÃO",
      "7-POSTO BOMBA ALTA VAZÃO",
      "8-POSTO BOMBA 12 E 13",
      "9-POSTO BOMBA 12 E 13",
      "10-POSTO BOMBA 12 E 13",
      "11-POSTO FILTROS",
      "12-POSTO FILTROS",
      "13-POSTO FILTROS",
      "14-POSTO D. LUBRIFICANTES",
      "15-POSTO D. LUBRIFICANTES",
    ],
    "PORTARIA": [
      "1-ÁREA DE VIVÊNCIA AGRÍCOLA",
      "2-AUTOMAÇÃO AGRÍCOLA INTERNO",
      "3-PORTARIA B. INCÊNDIO",
      "4-PORTARIA ENTRADA",
    ],
    "OFICINA BORRACHARIA / LAVADOR": [
      "1-OFICINA AGRÍCOLA BORRACHARIA",
      "2-OFICINA AGRÍCOLA BORRACHARIA",
      "3-OFICINA AGRÍCOLA BORRACHARIA",
      "4-OFICINA AGRÍCOLA BORRACHARIA",
      "5-OFICINA AGRÍCOLA BORRACHARIA",
      "6-OFICINA AGRÍCOLA LAVADOR",
    ],
    "OFICINA AUTOMOTIVA": [
      "1-OFICINA AGRÍCOLA ESCRITÓRIO",
      "2-OFICINA AGRÍCOLA OFICINA",
      "3-OFICINA AGRÍCOLA 1º PISO ESCADA",
      "4-OFICINA SALA REUNIÃO",
      "5-OFICINA AGRÍCOLA OFICINA",
      "6-OFICINA AGRÍCOLA OFICINA",
      "7-OFICINA AGRÍCOLA OFICINA",
      "8-OFICINA AGRÍCOLA OFICINA",
      "9-OFICINA AGRÍCOLA OFICINA",
      "10-OFICINA AGRÍCOLA OFICINA",
    ],
    "OFIC IMPLEMENTO SALA MONTAGEM": [
      "1-OFICINA IMPLEMENTOS",
      "2-OFICINA IMPLEMENTOS",
      "3-OFICINA IMPLEMENTOS",
    ],
    "EXPEDIÇÃO": [
      "1-EXPEDIÇÃO EXTERNO",
      "2-EXPEDIÇÃO EXTERNO",
      "3-EXPEDIÇÃO EXTERNO",
      "4-EXPEDIÇÃO EXTERNO",
    ],
    "VIST CAMINHÃO FATURAMENTO": [
      "1-VIST CAMINHÃO FATURAMENTO",
      "2-VIST CAMINHÃO FATURAMENTO",
      "3-VIST CAMINHÃO FATURAMENTO",
    ],
    "DEPÓSITO INSUMOS": [
      "1-ALMOXARIFADO",
      "2-ESCRITÓRIO",
      "3-CO. ESCRITÓRIO",
      "4-LÍQUIDO A EXTERNO",
      "5-LÍQUIDO A EXTERNO",
      "6-LÍQUIDO A EXTERNO",
      "7-LÍQUIDO A EXTERNO",
      "8-LÍQUIDO B EXTERNO",
      "9-LÍQUIDO B EXTERNO",
      "10-LÍQUIDO B EXTERNO",
      "11-INTERNO",
      "12-INTERNO",
    ],
    "BALANÇA": ["1-BALANÇA 01", "2-BALANÇA 02"],
    "PCTS": [
      "1-PCTS EXTERNO",
      "2-PCTS EXTERNO",
      "3-PCTS INTERNO",
      "4-PCTS INTERNO",
      "5-PCTS EXTERNO",
    ],
    "TRATAMENTO ESGOTO": ["1-ETE"],
    "ÁREA DE VIVÊNCIA": [
      "1-ÁREA DE VIVÊNCIA",
      "2-ÁREA DE VIVÊNCIA",
      "3-ÁREA DE VIVÊNCIA",
    ],
    "ADMINISTRATIVO RECEPÇÃO": [
      "1-CORREDOR",
      "2-ADMINISTRATIVO",
      "3-TEC INFORMÁTICA",
    ],
    "PORTARIA INDUSTRIA / RH": ["1-INDUSTRIA", "2-RH"],
    "SALA JEQUITIBÁ": ["1-SALA JEQUITIBÁ", "2-SALA JEQUITIBÁ"],
    "SALA JERIVÁ": ["1-SALA JERIVÁ", "2-SALA JERIVÁ"],
    "SALA ANGELIN": ["1-SALA ANGELIN", "2-SALA ANGELIN"],
    "SALA CAJÁ": ["1-SALA CAJÁ", "2-SALA CAJA"],
    "SALA CEDRO": ["1-SALA CEDRO", "2-SALA CEDRO"],
    "SALA DOJÔ INDUSTRIA": ["1-DOJÔ INDUSTRIA", "2-DOJÔ INDUSTRIA"],
    "SALA DOJÔ AGRICOLA": ["1-DOJÔ AGRICOLA", "2-DOJÔ AGRICOLA"],
    "SEGURANÇA DO TRABALHO": [
      "1-HSSE CONS MÉDICO",
      "2-HSSE SEG TRABALHO",
      "3-SEG DO TRABALHO",
    ],
    "ALMOXARIFADO": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-DEP.EXTERNO",
      "5-DEP.EXTERNO",
      "6-DEP.LUBRIFICANTE",
      "7-DEP.LUBRIFICANTE",
    ],
    "REFEITÓRIO": [
      "1-FUNDO COZINHA",
      "2-FUNDO COZINHA",
      "3-FUNDO COZINHA",
      "4-SALÃO ALIMENTAÇÃO",
      "5-SALÃO ALIMENTAÇÃO",
      "6-COZINHA",
      "7-COZINHA",
      "8-GLP",
      "9-GLP",
      "10-GLP",
    ],
    "COI": [
      "1-RECEPÇÃO",
      "2-RECEPÇÃO",
      "3-COMPLEXO",
      "4-COI",
      "5-COI",
      "6-COR.LABORATÓRIO",
      "7-LABORATÓRIO",
      "8-GLP LABORATÓRIO",
      "9-GLP LABORATÓRIO",
    ],
    "BARRACÃO DE AÇUCAR": [
      "1-BARRACÃO DE AÇUCAR",
      "2-BARRACÃO DE AÇUCAR",
      "3-BARRACÃO DE AÇUCAR",
    ],
    "MANUTENÇÃO": ["1-INSTRUMENTAL", "2-MECÂNICA", "3-MECÂNICA"],
    "DEPÓSITO DE OXIGÊNIO": ["1-DEP OXIGÊNIO", "2-DEP OXIGÊNIO"],
    "CAIEIRA": ["1-TÉRREO", "2-TÉRREO", "3-CCM"],
    "CENTRAL DE RESÍDUOS": ["1-CENTRAL DE RESÍDUOS", "2-CENTRAL DE RESÍDUOS"],
    "BATE E VOLTA MOTORISTA": ["1-BATE E VOLTA"],
    "DIFUSOR CCM 02": [
      "1-TERREO",
      "2-TERREO",
      "3-TERREO",
      "4-TERREO",
      "5-TERREO",
      "6-PISO 1",
      "7-PISO 1",
      "8-PISO 1",
      "9-PISO 1",
      "10-PISO 1",
      "11-PISO 1",
      "12-PISO 1",
    ],
    "DIFUSOR 02 TERREO MOTORES": [
      "1-ESCADA",
      "2-MOTORES",
      "3-MOTORES",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-LUBRIF. TÉRREO",
      "8-MOENDA PISO 01",
      "9-ESTEIRA",
      "10-HILO A",
      "11-HILO B",
      "12-PISO SUPERIOR",
      "13-PISO SUPERIOR",
      "14-PISO SUPERIOR",
      "15-PISO SUP AQUEC CALDO",
      "16-DESAGUADOR PISO 01",
      "17-DESAGUADOR PISO 01",
      "18-MOENDA DESAGUADOR",
    ],
    "DIFUSOR 01 CCM": ["1-CCM", "2-CCM", "3-CCM"],
    "DIFUSOR 01 TÉRREO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TERREO",
      "5-MOTORES",
      "6-TOMBADOR PISO 01",
      "7-TOMBADOR PISO 02",
      "8-HILO A",
      "9-HILO B",
      "10-TOMBADOR TERREO",
      "11-TOMBADOR PISO SUPERIOR",
      "12-TERREO",
      "13-ESCADA",
      "14-PISO SUPERIOR",
      "15-PISO SUPERIOR",
    ],
    "CALDEIRA 01": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-1º PISO",
      "7-3º PISO",
      "8-4º PISO",
      "9-5º PISO",
      "10-4º PISO",
    ],
    "VLC": ["1-TÉRREO", "2-TÉRREO"],
    "CALDEIRA 02": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-1º PISO",
      "8-1º PISO",
      "9-2º PISO",
      "10-2º PISO",
      "11-2º PISO",
      "12-3º PISO",
      "13-3º PISO",
      "14-4º PISO",
      "15-5º PISO",
      "16-TOPO",
      "17-TOPO",
      "18-3º PISO",
    ],
    "CALDEIRA 02 CCM TÉRREO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-1º PISO",
      "5-1º PISO",
      "6-1º PISO",
      "7-1º PISO",
      "8-1º PISO",
      "9-1º PISO",
      "10-1º PISO",
      "11-1º PISO",
    ],
    "TRATAMENTO DE CALDO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
    ],
    "TRATAMENTO CALDO CCM": ["1-CCM", "2-CCM", "3-CCM"],
    "CASA DE FORÇA": [
      "1-EXTERNO",
      "2-EXTERNO",
      "3-EXTERNO",
      "4-EXTERNO",
      "5-EXTERNO",
      "6-EXTERNO",
      "7-EXTERNO",
      "8-TÉRREO",
      "9-TÉRREO",
      "10-TÉRREO",
      "11-TÉRREO",
      "12-CCM INTERNO",
      "13-CCM INTERNO",
      "14-SALA BATERIA EXTER",
      "15-TÉRREO",
      "16-TÉRREO",
      "17-TÉRREO",
      "18-TÉRREO",
      "19-SALA CABOS 1º PISO",
      "20-SALA CABOS 1º PISO",
      "21-SALA CABOS 1º PISO",
      "22-1º PISO",
      "23-1º PISO",
      "24-2º PISO",
      "25-2º PISO",
      "26-2º PISO",
      "27-2º PISO",
      "28-SALA CUBÍCULO 2 PISO",
      "29-SALA CUBÍCULO 2 PISO",
      "30-SALA CUBÍCULO 2 PISO",
      "31-SALA CUBÍCULO 2 PISO",
      "32-SALA CONTROLE 2 PISO",
      "33-SALA CONTROLE 2 PISO",
      "34-CASA DE FORÇA",
      "35-CASA DE FORÇA",
      "36-CASA DE FORÇA",
      "37-CASA DE FORÇA",
      "38-CASA DE FORÇA",
    ],
    "EVAPORAÇÃO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-1º PISO",
      "7-1º PISO",
      "8-1º PISO",
      "9-2º PISO",
      "10-2º PISO",
    ],
    "EVAPORAÇÃO CCM": ["1-CCM", "2-CCM", "3-CCM"],
    "FÁBRICA DE AÇÚCAR": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-1º PISO",
      "5-1º PISO",
      "6-1º PISO",
      "7-1º PISO",
      "8-2º PISO",
      "9-2º PISO",
      "10-2º PISO",
    ],
    "FERMENTAÇÃO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-PISO SUPERIOR",
      "8-PISO SUPERIOR",
      "9-PISO SUPERIOR",
    ],
    "DESTILARIA 01": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-TÉRREO",
      "8-TÉRREO",
      "9-TÉRREO",
      "10-1º PISO",
      "11-TÉRREO",
      "12-1º PISO",
      "13-1º PISO",
    ],
    "DESTILARIA 02": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-1º PISO",
      "6-1º PISO",
      "7-2º PISO",
      "8-2º PISO",
    ],
    "DESTILARIA 01 CCM": ["1-CCM", "2-CCM", "3-CCM", "4-CCM"],
    "CARREGAMENTO ETANOL": [
      "1-CARREGAMENTO",
      "2-CARREGAMENTO",
      "3-CARREGAMENTO",
      "4-CARREGAMENTO",
    ],
    "TORRE DE RESFRIAMENTO CCM": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-TÉRREO",
      "8-1º PISO",
      "9-1º PISO",
      "10-1º PISO",
      "11-1º PISO",
      "12-1º PISO",
      "13-1º PISO",
      "14-1º PISO",
    ],
    "TORRE DE RESFRIAMENTO MOTORES": [
      "1-MOTORES",
      "2-MOTORES",
      "3-MOTORES",
      "4-MOTORES",
    ],
    "ETA": [
      "1-PRTS QUÍMICOS",
      "2-ETA",
      "3-FRENTE TORRE",
      "4-ETA",
      "5-FRENTE CALDEIRA",
      "6-FRENTE BAGAÇO",
      "7-BOMBA HID CALD",
      "8-BOMBA HID CALD",
      "9-BOMBA FREN BRIG",
      "10-BOMBA FREN BRIG",
      "11-FRENTE DEST",
      "12-FRENTE DEST",
    ],
    "ETA CCM": ["1-CCM", "2-CCM", "3-CCM"],
    "BOMBA DE INCÊNDIO": ["1-RES D'AGUA", "2-RES D'AGUA", "3-RES D'AGUA"],
    "SUBESTAÇÃO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-TÉRREO",
      "8-TÉRREO",
      "9-1º PISO",
      "10-1º PISO",
      "11-1º PISO",
    ],
    "R7": ["1-EXTERNO", "2-EXTERNO", "3-EXTERNO", "4-EXTERNO"],
    "R7 CCM": ["1-CCM", "2-CCM"],
    "R6": ["1-EXTERNO", "2-EXTERNO", "3-EXTERNO"],
    "R6 CCM": ["1-CCM", "2-CCM"],
  },
  "BP - ITUMBIARA": {
    "POSTO": [
      "1-ALMOXARIFADO",
      "2-COMBUSTÍVEL",
      "3-COMBUSTÍVEL",
      "4-COMBUSTÍVEL BANHEIRO",
      "5-COMBUSTÍVEL",
      "6-COMBUSTÍVEL",
      "7-COMBUSTÍVEL",
      "8-COMBUSTÍVEL",
      "9-COMBUSTÍVEL",
      "10-COMBUSTÍVEL",
      "11-COMBUSTÍVEL",
      "12-COMBUSTÍVEL",
      "13-COMBUSTÍVEL",
      "14-COMBUSTÍVEL DEP. ÓLEO",
      "15-COMBUSTÍVEL DEP. ÓLEO",
    ],
    "EXPEDIÇÃO": [
      "16-ESCRITÓRIO",
      "17-CHECK LIST",
      "18-CHECK LIST",
      "19-CHECK LIST",
      "20-SALA DE ESPERA",
      "21-INDUSTRIAL PORTARIA",
      "22-ESCRITÓRIO FUNDO",
    ],
    "BALANÇA": ["23-ENTRADA", "24-SALA INTERNA"],
    "PCTS": ["25-PRINCIPAL", "26-PORTA ENTRADA", "27-CHUV. EMERGÊNCIA"],
    "ADM AGRÍCOLA": [
      "28-RECEPÇÃO",
      "29-RECEPÇÃO",
      "30-EXTERNO",
      "31-EXTERNO",
      "32-FRENTE AO BANHEIRO",
      "33-DOJÔ",
      "34-INTERNO",
      "35-ANTENA",
    ],
    "REFEITÓRIO": [
      "36-SALÃO ALIMENTAÇÃO",
      "37-SALÃO ALIMENTAÇÃO",
      "38-COZINHA",
      "39-COZINHA",
      "40-COZINHA SAÍDA INTERNO",
      "41-SAÍDA",
      "42-EXTERNO SAÍDA",
      "43-RECEBIMENTO MARMITEX",
      "44-GLP",
      "45-GLP",
      "46-GLP",
      "47-GLP",
      "48-GLP",
    ],
    "ÁREA DE VIVÊNCIA": [
      "49-SALA DE JOGOS",
      "50-SALA DE JOGOS",
      "51-SANITÁRIOS",
    ],
    "ADM 02": [
      "52-AMBULATÓRIO",
      "53-AMBULATÓRIO",
      "54-PORTARIA LÍDER",
      "55-BANHEIRO MASC. FUNDO",
      "56-PORTARIA VIGILÂNCIA",
      "57-CAMINHO REFEITÓRIO",
      "58-IPÊ AMARELO",
      "59-IPÊ ROSA",
      "60-IPÊ BRANCO",
      "61-RH",
      "62-AMBULÂNCIA",
      "63-SUBSTAÇÃO PORTA ENTRADA",
    ],
    "MANUTENÇÃO": [
      "64-MECÂNICA",
      "65-ELÉTRICA",
      "66-INSTRUMENTAÇÃO",
      "67-FERRAMENTARIA",
      "68-FERRAMENTARIA",
      "69-LUBRIF. FUNDO",
    ],
    "ALMOXARIFADO": [
      "70-ATENDIMENTO",
      "71-RECEB. MATERIAIS",
      "72-FRENTE MANUTENÇÃO",
      "73-FRENTE MANUTENÇÃO",
      "74-PISO 01 INTERNO",
      "75-DEP. LUBRIFICANTES",
      "76-SALA ENGENHARIA PISO 01 INTERNO",
      "77-SALA ENGENHARIA PISO 01 INTERNO",
    ],
    "COI": [
      "78-ESTACIONAMENTO",
      "79-SALA OPERAÇÃO",
      "80-SALA SUPERVISÃO",
      "81-LABORATÓRIO",
      "82-LABORATÓRIO",
      "83-EXTERNO FRENTE FÁBRICA AÇÚCAR",
    ],
    "FÁBRICA DE AÇÚCAR": [
      "84-SECADOR AÇÚCAR",
      "85-ABAIXO CENTRÍFUGA",
      "86-CENTRÍFUGA CONTÍNUA",
      "87-CENTRÍFUGA AUTOMÁTICA",
      "88-LADO TANQUE XAROPE",
      "89-LADO TANQUE MEL POBRE",
      "90-1º PISO",
      "91-1º PISO",
      "92-1º PISO",
      "93-2º PISO",
      "94-2º PISO",
      "95-2º PISO",
      "96-CCM",
      "97-CCM",
      "98-CCM",
      "99-CCM",
    ],
    "ARMAZÉM": [
      "100-AÇÚCAR FRENTE FÁBRICA",
      "101-AÇÚCAR FRENTE FÁBRICA",
      "102-AÇÚCAR FRENTE COE",
      "103-AÇÚCAR 1º PISO ESCADA",
      "104-AÇÚCAR 2º PISO",
      "105-AÇÚCAR 3º PISO",
      "106-AÇÚCAR ENVASE",
      "107-AÇÚCAR ENVASE",
      "108-AÇÚCAR SILO 1 PISO SUPERIOR",
    ],
    "DESTILARIA": [
      "109-TÉRREO",
      "110-TÉRREO",
      "111-TÉRREO",
      "112-TÉRREO",
      "113-TÉRREO",
      "114-PISO SUPERIOR",
      "115-PRODUTOS QUÍMICA",
      "116-PRODUTOS QUÍMICA",
    ],
    "FERMENTAÇÃO": [
      "117-ENTRADA",
      "118-CUBA 1",
      "119-CCM",
      "120-DORNA PULMÃO",
      "121-CUBA 3",
      "122-DORNA VOLANTE",
      "123-DORNA 2",
      "124-DORNA 1",
      "125-CASA DE FERMENTAÇÃO",
      "126-DORNA 4",
      "127-DORNA 4",
      "128-DORNA 5",
      "129-DORNA 7",
      "130-DORNA 6",
      "131-1º PISO",
      "132-2º PISO",
      "133-2º PISO",
      "134-2º PISO",
      "135-CENTRÍFUGA 3º PISO",
      "136-CENTRÍFUGA 3º PISO",
    ],
    "DIFUSOR": [
      "137-TÉRREO",
      "138-TÉRREO",
      "139-TÉRREO",
      "140-TÉRREO",
      "141-TÉRREO",
      "142-TÉRREO",
      "143-TÉRREO",
      "144-TÉRREO",
      "145-1º PISO",
      "146-1º PISO",
      "147-2º PISO",
      "148-2º PISO",
      "149-3º PISO",
      "150-CCM",
      "151-CCM",
      "152-CCM",
      "153-EXTRAÇÃO DE CALDO",
      "154-EXTRAÇÃO DE CALDO",
      "155-EXTRAÇÃO DE CALDO PISO 1",
      "156-EXTRAÇÃO DE CALDO PISO 1",
    ],
    "CALDEIRA": [
      "157-TÉRREO",
      "158-TÉRREO",
      "159-TÉRREO",
      "160-TÉRREO",
      "161-TÉRREO",
      "162-TÉRREO",
      "163-TÉRREO",
      "164-TÉRREO",
      "165-1º PISO",
      "166-2º PISO DISTRIBUIDORA",
      "167-3º PISO",
      "168-4º PISO",
      "169-5º PISO",
      "170-6º PISO",
      "171-TETO 7º PISO",
      "172-DESAERADOR 1 8º PISO",
      "173-TÉRREO MOTORES",
      "174-DESAERADOR 1º PISO",
      "175-DESAERADOR 2º PISO",
      "176-TÉRREO",
      "177-TÉRREO",
    ],
    "CCM DA CALDEIRA": ["178-CCM", "179-CCM", "180-CCM", "181-CCM"],
    "CASA DE FORÇA": [
      "182-TÉRREO EXTERNO",
      "183-TÉRREO EXTERNO",
      "184-TÉRREO EXTERNO",
      "185-TÉRREO EXTERNO",
      "186-TÉRREO EXTERNO",
      "187-GERADOR DIESEL",
      "188-GERADOR DIESEL",
      "189-TÉRREO INTERNO",
      "190-TÉRREO INTERNO",
      "191-TÉRREO INTERNO",
      "192-TÉRREO INTERNO",
      "193-1º PISO",
      "194-1º PISO",
      "195-1º PISO",
      "196-1º PISO SALA DE SURTO",
      "197-1º PISO SALA DE SURTO",
      "198-2º PISO ESCADA",
      "199-2º PISO",
      "200-2º PISO",
      "201-2º PISO",
      "202-2º PISO CUBÍCULO",
      "203-2º PISO CUBÍCULO",
      "204-2º PISO",
    ],
    "ETA": [
      "205-CASA ETA",
      "206-ETE CONVENCIONAL",
      "207-TANQUE ÁGUA FILTRADA",
      "208-TANQUE DE OSMOSE BOMBA INCÊNDIO",
      "209-DEPÓSITO DE GALÕES",
      "210-DEPÓSITO DE GALÕES",
      "211-CCM LADO TANQUE INCÊNDIO",
      "212-CCM LADO TANQUE INCÊNDIO",
      "213-CCM LADO PÁTIO BAGAÇO",
      "214-CCM LADO PÁTIO BAGAÇO",
    ],
    "EVAPORAÇÃO": [
      "215-TÉRREO",
      "216-TÉRREO",
      "217-TÉRREO",
      "218-TÉRREO",
      "219-TÉRREO",
      "220-TÉRREO",
      "221-TÉRREO",
      "222-1º PISO",
      "223-1º PISO",
      "224-1º PISO",
      "225-1º PISO",
      "226-1º PISO",
      "227-1º PISO",
      "228-2º PISO",
      "229-2º PISO",
      "230-2º PISO",
      "231-2º PISO",
      "232-2º PISO",
      "233-2º PISO",
      "234-CCM",
      "235-CCM",
    ],
    "TRATAMENTO DE CALDO": [
      "236-TANQUE DOSADO",
      "237-TANQUE ENXOFREIRA",
      "238-TANQUE COND.",
      "239-COLUNA DECANT. ÁLCOOL",
      "240-TANQUE ÁGUA",
      "241-TANQUE DE LODO",
      "242-TANQUE DE POLINO",
      "243-COLUNA DECANT. AÇÚCAR",
    ],
    "TORRE DE RESFRIAMENTO": [
      "244-CAIEIRA",
      "245-LADO BOMBA INCÊNDIO",
      "246-MOTORES",
      "247-MOTORES",
      "248-TORRE",
      "249-TORRE",
      "250-VINHAÇA",
      "251-VINHAÇA",
    ],
    "VLC": [
      "252-TÉRREO B. CONTENÇÃO",
      "253-ÁREA DOS CAMINHÕES",
      "254-PISO SUPERIOR",
      "255-CCM TÉRREO LADO DIFUSOR",
      "256-CCM ESCADA LADO DIFUSOR",
      "257-CCM TÉRREO LADO VLC",
      "258-CCM ESCADA LADO VLC",
    ],
    "CENTRAL DE RESÍDUOS": [
      "259-CENTRAL",
      "260-CENTRAL",
      "261-TAMBOR E BOMBINAS",
      "262-PRODUTOS QUÍMICOS",
      "263-TANQUE",
    ],
    "CARREGAMENTO DE ÁLCOOL": ["264-CARREGAMENTO", "265-CASA DO MOTORISTA"],
    "TANQUE DE ÁLCOOL": [
      "266-HIDRANTE 35",
      "267-HIDRANTE 35",
      "268-HIDRANTE 36",
      "269-HIDRANTE 36",
      "270-HIDRANTE 37",
      "271-HIDRANTE 37",
      "272-HIDRANTE 43",
    ],
    "DEFENSIVOS AGRÍCOLAS": [
      "273-DEFENSIVOS",
      "274-DEFENSIVOS",
      "275-DEFENSIVOS",
      "276-DEFENSIVOS",
      "277-DEFENSIVOS",
      "278-DEFENSIVOS",
      "279-DEFENSIVOS",
      "280-DEFENSIVOS",
      "281-DEFENSIVOS",
      "282-DEFENSIVOS",
      "283-DEFENSIVOS",
      "284-DEFENSIVOS",
      "285-INTERNO",
    ],
    "OFICINA": [
      "286-LAVADOR",
      "287-LADO LAVADOR",
      "288-TROCA DE ÓLEO",
      "289-TROCA DE ÓLEO",
      "290-FUNDO DEP. PNEUS",
      "291-FUNDO DEP. PNEUS",
      "292-PCM EXTERNO",
      "293-PCM EXTERNO",
      "294-PCM EXTERNO",
      "295-PCM INTERNO",
      "296-PCM INTERNO",
      "297-ALMOXARIFADO",
      "298-MANUTENÇÃO MÁQUINAS AGRÍCOLA",
      "299-MANUTENÇÃO IMPLEMENTOS",
      "300-MANUTENÇÃO LADO HIDRANTE 35",
      "301-ALINHAMENTO",
      "302-CALDEIRARIA",
      "303-OXIGÊNIO LADO CALDEIRARIA",
      "304-COMPRESSOR DE AR",
      "305-TENDA MANUTENÇÃO",
      "306-TENDA MANUTENÇÃO",
      "307-TENDA MANUTENÇÃO",
      "308-TENDA MANUTENÇÃO",
      "309-TENDA MANUTENÇÃO",
      "310-TENDA MANUTENÇÃO",
      "311-TENDA MANUTENÇÃO",
      "312-TENDA MANUTENÇÃO",
      "313-FUNELÁRIA FUNDO TENDA",
      "314-FUNELÁRIA FUNDO TENDA",
      "315-FUNELÁRIA FUNDO TENDA",
      "316-FUNELÁRIA FUNDO TENDA",
      "317-TRATAMENTO DE ESGOTO FUNDO OFICINA",
      "318-R 0",
      "319-R 0",
    ],
  },
  "BP - ITUIUTABA": {
    "ADM": [
      "1-01 INTERNO",
      "2-01 INTERNO",
      "3-01 SALA TAMANDUÁ BANDEIRA",
      "4-01 RH EXTERNO",
      "5-SALA DOJÔ",
      "6-02 PORTARIA",
      "7-02 CATRACA",
      "8-02 ARARA CANINDÉ",
      "9-SEGURANÇA DO TRABALHO",
      "10-AMBULATÓRIO MÉDICO",
      "11-AMBULATÓRIO MÉDICO INTERNO",
    ],
    "REFEITÓRIO": [
      "1-SALÃO ALIMENTAÇÃO",
      "2-SALÃO ALIMENTAÇÃO",
      "3-COZINHA",
      "4-SAÍDA",
      "5-GLP",
      "6-GLP",
      "7-EXTERNO",
    ],
    "ÁREA DE VIVÊNCIA": ["1-PRINCIPAL"],
    "INSTRUMENTAÇÃO": ["1-INTERNO", "2-EXTERNO"],
    "MANUTENÇÃO": ["1-ELÉTRICA", "2-MECÂNICA", "3-MECÂNICA", "4-MECÂNICA"],
    "ALMOXARIFADO": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-INTERNO",
      "5-DEPÓSITO DE ÓLEO",
    ],
    "COI": [
      "1-INTERNO",
      "2-INTERNO",
      "3-LABORATÓRIO",
      "4-EXTERNO",
      "5-EXTERNO",
    ],
    "CONTAINER": ["1-PRINCIPAL"],
    "BARRACÃO DE AÇÚCAR": [
      "1-PRINCIPAL",
      "2-PISO 01",
      "3-PISO 02",
      "4-PISO 03",
      "5-PISO 01",
      "6-DESENSAQUE PISO 01",
      "7-SAÍDA CAMINHÃO",
      "8-ENTRADA CAMINHÃO",
      "9-TENDA",
      "10-TENDA",
      "11-TENDA",
      "12-TENDA",
      "13-TENDA",
      "14-ENTRADA",
      "15-ENVASE",
      "16-ENVASE",
      "17-TENDA EXTERNO",
    ],
    "FÁBRICA DE AÇÚCAR": [
      "1-FÁBRICA",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-CENTRÍFUGA",
      "6-CENTRÍFUGA",
      "7-PISO 01",
      "8-PISO 01",
      "9-PISO 01",
      "10-PISO 02",
      "11-PISO 02",
      "12-PISO 02",
      "13-PISO 02",
      "14-CCM EXTERNO",
      "15-CCM EXTERNO",
      "16-CCM EXTERNO",
      "17-CCM EXTERNO",
      "18-FRENTE CCM",
    ],
    "DIFUSOR": [
      "1-HILO A",
      "2-HILO B",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-CCM EXTERNO",
      "8-CCM EXTERNO",
      "9-CCM EXTERNO",
      "10-CCM EXTERNO",
    ],
    "SUBESTAÇÃO": [
      "1-EXTERNO",
      "2-EXTERNO",
      "3-EXTERNO",
      "4-EXTERNO",
      "5-EXTERNO",
      "6-INTERNO",
      "7-INTERNO",
    ],
    "CASA DE FORÇA": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-CCM 3.1",
      "5-GERADOR DIESEL INTERNO",
      "6-SALA COMPRESSOR",
      "7-PISO 2",
      "8-PISO 2",
      "9-PISO 2",
      "10-PISO 2",
      "11-SALA CALOR",
      "12-SALA CONTROLE",
      "13-PISO 3",
      "14-PISO 3",
      "15-PISO 3",
      "16-PISO 3",
      "17-PISO 3",
      "18-PISO 3",
      "19-PISO 3",
    ],
    "CALDEIRA": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-PISO 3",
      "7-DESAERADOR",
      "8-CCM",
      "9-CCM",
      "10-CCM",
      "11-CCM",
      "12-CCM",
    ],
    "VLC": ["1-CCM", "2-ESCADA CCM", "3-CCM", "4-ESCADA CCM"],
    "EVAPORAÇÃO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-PISO 01",
      "6-PISO 01",
      "7-PISO 01",
      "8-PISO 02",
      "9-PISO 02",
      "10-PISO 02",
      "11-PISO 02",
      "12-PISO 02",
      "13-PISO 02",
      "14-CCM",
      "15-CCM",
      "16-CCM",
      "17-CCM",
    ],
    "TRATAMENTO DE CALDO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-PISO 01",
      "5-PISO 01",
      "6-PISO 01",
      "7-PISO 02",
      "8-PISO 03",
      "9-PISO 03",
      "10-PISO 03",
    ],
    "CAIEIRA": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "FERMENTAÇÃO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-PISO 01",
      "8-PISO 02",
      "9-PISO 03",
      "10-CCM",
      "11-CCM",
      "12-CCM",
    ],
    "DESTILARIA": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-PISO 01",
      "5-PISO 01",
      "6-PRODUTOS QUÍMICOS",
    ],
    "TENDA PRODUTOS QUÍMICOS": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "ETA": [
      "1-INSUMOS",
      "2-CCM TÉRREO",
      "3-CCM TÉRREO",
      "4-CCM ESCADA",
      "5-CCM ESCADA",
    ],
    "TORRE DE RESFRIAMENTO": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "CARREGAMENTO DE ETANOL": [
      "1-ESCRITÓRIO",
      "2-VIVÊNCIA",
      "3-PLATAFORMA 01",
      "4-PLATAFORMA 02",
    ],
    "OFICINA": [
      "1-ESCRITÓRIO PISO 01",
      "2-TÉRREO",
      "3-DEPÓSITO DE PNEUS",
      "4-DEPÓSITO DE PNEUS EXTERNO",
      "5-SANITÁRIO",
      "6-HIDRÁULICA",
      "7-ALMOXARIFADO",
      "8-ALMOXARIFADO",
      "9-MANUTENÇÃO",
      "10-MANUTENÇÃO",
      "11-MANUTENÇÃO",
      "12-BORRACHARIA",
      "13-SOLDA",
      "14-COMPRESSOR",
      "15-BORRACHARIA",
      "16-MANUTENÇÃO",
      "17-MANUTENÇÃO",
      "18-BORRACHARIA",
      "19-TROCA DE ÓLEO",
      "20-LAVADOR",
      "21-LAVA A JATO",
      "22-TROCA DE ÓLEO",
    ],
    "DEPÓSITO DE INSUMOS": [
      "1-INTERNO",
      "2-EXTERNO",
      "3-EXTERNO",
      "4-EXTERNO",
      "5-EXTERNO",
    ],
    "PCTS": ["1-INTERNO"],
    "BALANÇA": ["1-INTERNO"],
    "EXPEDIÇÃO": ["1-PORTARIA", "2-EXTERNO", "3-EXTERNO", "4-EXTERNO"],
    "POSTO": [
      "1-ALMOXARIFADO",
      "2-BANHEIRO",
      "3-ESCRITÓRIO",
      "4-BOMBA 03",
      "5-BOMBA 05",
      "6-BOMBA 06",
      "7-PRINCIPAL",
      "8-PRINCIPAL",
    ],
    "ANTENA": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "ETE": ["1-CAPTAÇÃO CCM", "2-CAPTAÇÃO OFICINA", "3-CAPTAÇÃO ESCRITÓRIO"],
    "VIVEIRO": ["1-MEIO AMBIENTE", "2-MEIO AMBIENTE"],
    "CENTRAL DE RESÍDUOS": ["1-CENTRAL", "2-CENTRAL"],
  },
  "BP - ITAPAGIPE": {
    "ÁREA DE VIVÊNCIA": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PARTE DE TRÁS",
      "5-PARTE DE TRÁS",
    ],
    "REFEITÓRIO": [
      "1-COZINHA",
      "2-COZINHA FUNDO",
      "3-GLP",
      "4-GLP",
      "5-INTERNO",
      "6-INTERNO",
    ],
    "SALA DE TREINAMENTO": ["1-PRINCIPAL"],
    "AMBULATÓRIO": ["1-PRINCIPAL", "2-VESTIÁRIO"],
    "ADM": ["1-RH", "2-PRINCIPAL", "3-PRINCIPAL"],
    "ALMOXARIFADO": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-1 F",
      "5-DEPÓSITO 1 C",
      "6-DEPÓSITO 1 C",
      "7-DEPÓSITO 1 C",
      "8-DEPÓSITO DE INSUMOS",
      "9-DEPÓSITO DE INSUMOS",
      "10-CALDEIRARIA",
      "11-CALDEIRARIA",
    ],
    "FÁBRICA DE AÇÚCAR": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
      "7-PRINCIPAL",
      "8-2º PISO",
      "9-2º PISO",
      "10-3º PISO",
    ],
    "OFICINA AGRÍCOLA": [
      "1-PORTARIA",
      "2-COPA",
      "3-2º PISO",
      "4-2º PISO",
      "5-OFICINA",
      "6-OFICINA",
      "7-OFICINA",
      "8-OFICINA",
      "9-OFICINA",
      "10-CALDEIRARIA",
      "11-CALDEIRARIA",
      "12-CALDEIRARIA",
      "13-CALDEIRARIA AGREGADOS",
      "14-OFICINA DE COLHEITADEIRA",
      "15-OFICINA DE COLHEITADEIRA",
      "16-LAVA A JATO",
      "17-BORRACHARIA",
      "18-LUBRIFICAÇÃO",
    ],
    "POSTO": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
    ],
    "PORTARIA": ["1-PRINCIPAL"],
    "BALANÇA": ["1-PRINCIPAL"],
    "VIVÊNCIA MOTORISTA": ["1-PRINCIPAL"],
    "LABORATÓRIO PCTS": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "VINHAÇA": [
      "1-RESÍDUOS",
      "2-RESÍDUOS 3º PISO",
      "3-CARREGAMENTO",
      "4-SANITÁRIOS",
    ],
    "CENTRAL DE RESÍDUOS": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
      "7-PRINCIPAL",
      "8-PRINCIPAL",
      "9-PRINCIPAL",
    ],
    "MOENDA": ["1-TOMBADOR", "2-PRINCIPAL", "3-PRINCIPAL", "4-PISO 2"],
    "ETA": ["1-PRINCIPAL"],
    "CALDEIRA": [
      "1-SALA BRIGADA",
      "2-LADO BAGAÇO",
      "3-LADO BAGAÇO",
      "4-LADO BAGAÇO",
    ],
    "TRATAMENTO DE CALDO": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-3º PISO",
      "4-3º PISO",
      "5-LADO BAGAÇO",
      "6-LADO BAGAÇO",
      "7-LADO BAGAÇO 3º PISO",
    ],
    "ARMAZÉM DE AÇÚCAR": [
      "1-PRINCIPAL",
      "2-CARREGAMENTO",
      "3-INTERNO",
      "4-INTERNO",
      "5-INTERNO",
      "6-INTERNO",
      "7-INTERNO",
    ],
    "COI": ["1-PRINCIPAL", "2-LABORATÓRIO"],
    "CARREGAMENTO DE ETANOL": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "FERMENTAÇÃO": ["1-PRINCIPAL", "2-PRINCIPAL", "3-PRINCIPAL", "4-PISO 3"],
    "DESTILARIA": ["1-DESCARREG. PRODUTO QUÍMICO", "2-PRINCIPAL"],
    "OFICINA INDÚSTRIA": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PISO 2",
      "4-EXTERNO",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
      "7-LUBRIFICAÇÃO",
      "8-LUBRIFICAÇÃO",
      "9-LADO LUBRIFICAÇÃO INTERNO",
    ],
    "CASA DE FORÇA": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
    ],
    "CCM ETA": ["1-PRINCIPAL", "2-PRINCIPAL", "3-SALA DO SUPERVISOR"],
    "CCM DA CALDEIRA": ["1-PRINCIPAL"],
    "CCM DA DESTILARIA": ["1-PRINCIPAL"],
    "CCM FÁBRICA DE AÇÚCAR": ["1-PRINCIPAL", "2-PRINCIPAL", "3-PRINCIPAL"],
    "CCM PREPARO DE CALDO": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "CCM VINHAÇA": ["1-PRINCIPAL"],
    "VLC": ["1-CCM", "2-CCM", "3-CCM", "4-PRINCIPAL", "5-PISO 2"],
  },
  "BP - FRUTAL": {
    "ADM": [
      "1-SEG. TRABALHO BEBEDOURO",
      "2-SEGURANÇA DO TRABALHO",
      "3-SEGURANÇA DO TRABALHO",
      "4-ESCRITÓRIO",
      "5-SANITÁRIOS",
      "6-RH",
      "7-TORRE T.I",
      "8-PRINCIPAL",
      "9-PRINCIPAL",
    ],
    "VIVÊNCIA": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "REFEITÓRIO": [
      "1-ENTRADA",
      "2-CATRACA",
      "3-COZINHA",
      "4-DEPÓSITO",
      "5-ESTAÇÃO DE GÁS",
      "6-ESTAÇÃO DE GÁS",
      "7-SAÍDA",
    ],
    "ÁREA AGRÍCOLA": [
      "1-ADM",
      "2-ADM PISO 2",
      "3-SALA DE ARQUIVOS",
      "4-SALA TREINAMENTO",
      "5-CALÇADA",
      "6-PLANEJAMENTO",
      "7-FERRAMENTARIA",
      "8-OFICINA BOX 05",
      "9-OFICINA LADO BOX 05",
      "10-OFICINA BOX 08",
      "11-OFICINA BOX 24",
      "12-OFICINA BOX 29",
      "13-CALDEIRARIA AUTOMOTIVA",
      "14-CALDEIRARIA AUTOMOTIVA",
      "15-CCM",
      "16-LAVADOR",
      "17-LAVADOR",
      "18-DEPÓSITO DE PNEUS",
      "19-BORRACHARIA",
      "20-AUTOMAÇÃO",
    ],
    "POSTO": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
    ],
    "CONTROLE": ["1-PRINCIPAL"],
    "PORTARIA": ["1-PRINCIPAL"],
    "ALMOXARIFADO": [
      "1-INTERNO",
      "2-INTERNO",
      "3-EXTERNO",
      "4-EXTERNO",
      "5-EXTERNO",
      "6-EXTERNO",
      "7-BARRACÃO",
      "8-BARRACÃO",
      "9-BARRACÃO",
      "10-DEPÓSITO DE GÁS",
      "11-DEPÓSITO DE GÁS",
    ],
    "ESCRITÓRIO INDUSTRIAL": ["1-ESCRITÓRIO", "2-LABORATÓRIO"],
    "INSTRUMENTAÇÃO / MECÂNICA": [
      "1-INSTRUMENTAÇÃO",
      "2-INSTRUMENTAÇÃO",
      "3-MECÂNICA",
      "4-MECÂNICA",
    ],
    "DIFUSOR": [
      "1-MOENDA",
      "2-TOMBADOR",
      "3-MOENDA CAVALETE",
      "4-MOENDA CAVALETE",
      "5-MOENDA CAVALETE",
      "6-MOENDA CAVALETE",
      "7-CCM",
      "8-CCM",
      "9-CCM",
      "10-PISO 02",
      "11-MOENDA BAGAÇO",
      "12-MOENDA",
      "13-CCM HILO",
      "14-MOEGA",
    ],
    "CALDEIRA": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PISO 2",
      "4-PISO 3",
      "5-CAVALETE",
      "6-CAVALETE",
      "7-CAVALETE",
      "8-CAVALETE",
      "9-CCM",
      "10-CCM",
      "11-CASA DE BRIGADA",
    ],
    "VLC": ["1-TÉRREO", "2-PISO 1"],
    "CASA DE BOMBAS": [
      "1-CCM",
      "2-CCM",
      "3-CCM",
      "4-INTERNO",
      "5-INTERNO",
      "6-INTERNO",
      "7-INTERNO",
      "8-INTERNO",
      "9-EXTERNO",
      "10-EXTERNO",
      "11-EXTERNO",
      "12-EXTERNO",
      "13-FERTIRRIGAÇÃO",
      "14-TRATAMENTO DE ESGOTO",
    ],
    "FERMENTAÇÃO": [
      "1-CCM",
      "2-CCM",
      "3-CCM",
      "4-CCM",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
      "7-PRINCIPAL",
      "8-CAVALETE",
      "9-CAVALETE",
      "10-CAVALETE",
      "11-CAVALETE",
      "12-ÚLTIMO PISO",
    ],
    "BARRACÃO DE AÇÚCAR": [
      "1-ARMAZÉM FRENTE CASA BOMBA",
      "2-ARMAZÉM FRENTE CASA BOMBA",
      "3-ARMAZÉM FRENTE FÁBRICA",
      "4-ARMAZÉM FRENTE FÁBRICA",
      "5-ARMAZÉM LE",
      "6-ARMAZÉM FRENTE LE",
      "7-ARMAZÉM LE",
      "8-ARMAZÉM LE",
      "9-ARMAZÉM FUNDO",
      "10-ARMAZÉM FUNDO",
      "11-ARMAZÉM INTERNO",
      "12-FÁBRICA CCM",
      "13-FÁBRICA CCM",
      "14-FÁBRICA CCM",
      "15-FÁBRICA CCM",
    ],
    "CARREGAMENTO DE ETANOL": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-CCM",
    ],
    "GERADOR DIESEL": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-INTERNO",
      "5-INTERNO",
      "6-INTERNO",
    ],
    "CASA DE FORÇA": [
      "1-EXTERNO",
      "2-EXTERNO",
      "3-INTERNO",
      "4-INTERNO",
      "5-INTERNO",
      "6-INTERNO",
      "7-INTERNO",
    ],
    "DESTILARIA": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-CAVALETE",
      "7-CAVALETE",
      "8-CAVALETE",
      "9-CAVALETE",
    ],
    "TRATAMENTO DE CALDO": [
      "1-CCM",
      "2-CCM",
      "3-CCM",
      "4-PRINCIPAL",
      "5-CAVALETE",
      "6-CAVALETE",
      "7-CAVALETE",
      "8-CAVALETE",
    ],
    "FÁBRICA DE AÇÚCAR": [
      "1-TÉRREO",
      "2-FRENTE DESTILARIA",
      "3-FRENTE DESTILARIA",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-TÉRREO",
      "7-TÉRREO",
      "8-PISO 02",
      "9-PISO 03",
    ],
    "INSUMOS AGRÍCOLAS": [
      "1-DEPÓSITO",
      "2-DEPÓSITO",
      "3-DEPÓSITO",
      "4-DEPÓSITO",
    ],
    "ETA": ["1-PRINCIPAL", "2-CCM", "3-CCM", "4-CCM"],
    "LABORATÓRIO PCTS": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "VIVÊNCIA MOTORISTA": ["1-PRINCIPAL"],
    "BALANÇA": ["1-PRINCIPAL"],
    "CENTRAL DE RESÍDUOS": ["1-PRINCIPAL", "2-PRINCIPAL", "3-PRINCIPAL"],
    "LGE": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
    ],
  },
  "BP - SANTA JULIANA": {
    "RH": [
      "1-PORTA EXTERNO",
      "2-INTERNO",
      "3-SANITÁRIOS",
      "4-INTERNO 2º PISO",
      "5-INTERNO 2º PISO",
      "6-INTERNO 2º PISO",
    ],
    "ALMOXARIFADO": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-INTERNO",
      "5-INTERNO PISO 01",
      "6-INTERNO",
      "7-INTERNO",
      "8-INTERNO",
      "9-EXTERNO PÁTIO",
      "10-EXTERNO PÁTIO",
      "11-EXTERNO PÁTIO",
      "12-EXTERNO PÁTIO",
      "13-EXTERNO",
    ],
    "DEPÓSITO DE LIXO": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "DEPÓSITO DE GÁS": ["1-PRINCIPAL", "2-PRINCIPAL", "3-ADM"],
    "CALDA PRONTA": [
      "1-TÉRREO",
      "2-PISO 1",
      "3-TÉRREO",
      "4-PÁTIO",
      "5-PÁTIO",
      "6-PÁTIO",
    ],
    "OFICINA MANUTENÇÃO": [
      "1-PISO 01",
      "2-TÉRREO",
      "3-MECÂNICA TÉRREO",
      "4-MECÂNICA TÉRREO",
      "5-CALDEIRARIA",
      "6-CALDEIRARIA",
      "7-EXTERNO",
    ],
    "SEGURANÇA DO TRABALHO": ["1-PRINCIPAL", "2-PRINCIPAL", "3-PRINCIPAL"],
    "VESTIÁRIO PORTARIA": [
      "1-PORTARIA EXTERNO",
      "2-SALA DE TREINAMENTO",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
    ],
    "REFEITÓRIO": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-COZINHA",
      "5-CCM",
      "6-CCM",
      "7-GLP",
      "8-GLP",
    ],
    "DOJÔ": ["1-SALINHA", "2-AGRÍCOLA", "3-AGRÍCOLA", "4-INDÚSTRIA"],
    "LABORATÓRIO PCTS": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-INTERNO",
      "5-INTERNO",
      "6-INTERNO",
      "7-EXTERNO",
      "8-EXTERNO",
    ],
    "PORTARIA": ["1-PRINCIPAL"],
    "VIVÊNCIA": ["1-PRINCIPAL"],
    "BALANÇA": ["1-PRINCIPAL", "2-INTERNO"],
    "POSTO": [
      "1-DIESEL",
      "2-DIESEL",
      "3-DIESEL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-ESCRITÓRIO",
      "7-PRINCIPAL",
      "8-PRINCIPAL",
      "9-PRINCIPAL",
      "10-PRINCIPAL",
      "11-PRINCIPAL",
      "12-PRINCIPAL",
    ],
    "TORRE DA FÁBRICA": [
      "1-CCM",
      "2-CCM",
      "3-CCM",
      "4-CCM",
      "5-CCM 2º PISO",
      "6-CCM 2º PISO",
      "7-PRINCIPAL",
      "8-PRINCIPAL",
      "9-PRINCIPAL",
      "10-PRINCIPAL",
    ],
    "CCM OFICINA": ["1-PRINCIPAL"],
    "FÁBRICA DE AÇÚCAR": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-PISO 01",
      "7-PISO 01",
      "8-PISO 01",
      "9-PISO 02",
      "10-PISO 02",
      "11-PISO 02",
      "12-PISO 02",
      "13-PISO 02",
      "14-PISO 02",
      "15-COBERTURA",
      "16-COBERTURA",
      "17-COBERTURA",
      "18-COBERTURA",
    ],
    "CCM FÁBRICA DE AÇÚCAR": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PISO 01",
      "7-PISO 01",
      "8-PISO 01",
      "9-PISO 01",
    ],
    "EVAPORAÇÃO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-PISO 02",
      "4-PISO 02",
      "5-PISO 02",
    ],
    "CARREGAMENTO DE AÇÚCAR": [
      "1-ESTEIRA",
      "2-ESTEIRA",
      "3-ESTEIRA",
      "4-ESTEIRA",
      "5-ESTEIRA",
      "6-TORRE 01",
      "7-TORRE 01 PISO 02",
      "8-TORRE 01 PISO 03",
      "9-PASSARELA",
      "10-TORRE 02 PASSARELA",
      "11-TORRE 02 PASSARELA",
      "12-TORRE 02 PISO 02",
      "13-TORRE 02 PISO 01",
      "14-PORÃO",
      "15-PORÃO",
      "16-PORÃO",
      "17-PORÃO",
      "18-CARREGAMENTO",
    ],
    "CCM MOENDA": [
      "1-MOENDA 1 E 2",
      "2-MOENDA 1 E 2",
      "3-MOENDA 1 E 2",
      "4-MOENDA 1 E 2",
      "5-MOENDA 1 E 2",
      "6-MOENDA 1 E 2",
      "7-MOENDA 1 E 2",
    ],
    "CALDEIRA CCM": ["1-PRINCIPAL", "2-PRINCIPAL", "3-PRINCIPAL"],
    "CALDEIRA 01": ["1-PRINCIPAL", "2-PISO 01", "3-PISO 02", "4-PISO 02"],
    "CALDEIRA 02": ["1-PISO 02", "2-PISO 03", "3-PISO 03"],
    "CALDEIRA 03": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PISO 2",
      "6-PISO 3",
      "7-PISO 3",
      "8-FULIGEM",
    ],
    "CARREGAMENTO DE FULIGEM": ["1-PRINCIPAL"],
    "CASA DE FORÇA": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
      "7-PRINCIPAL",
      "8-PRINCIPAL",
      "9-PISO 01",
      "10-PISO 01",
      "11-PISO 02",
      "12-PISO 02",
      "13-PISO 02",
      "14-PISO 02",
      "15-PISO 02",
      "16-PISO 02",
      "17-PISO 02",
      "18-PORÃO CCM",
      "19-PORÃO CCM",
      "20-CCM INTERNO",
      "21-CCM INTERNO",
      "22-EXTERNO",
      "23-EXTERNO",
      "24-EXTERNO",
      "25-EXTERNO",
    ],
    "TORRE 2": ["1-EXTERNO", "2-CCM", "3-CCM", "4-CCM EXTERNO"],
    "ETA": [
      "1-CCM EXTERNO",
      "2-CCM INTERNO",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
    ],
    "DESTILARIA": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO EXTERNO",
      "5-TÉRREO EXTERNO",
      "6-PISO 01",
      "7-PISO 01",
      "8-PISO 02",
      "9-02",
      "10-02 TÉRREO",
      "11-02 TÉRREO",
      "12-02 PISO 01",
      "13-02 PISO 01",
      "14-EXTERNO",
    ],
    "CCM DESTILARIA": ["1-PRINCIPAL", "2-PRINCIPAL", "3-PRINCIPAL"],
    "CARREGAMENTO DE ETANOL": ["1-PRINCIPAL", "2-PRINCIPAL", "3-PRINCIPAL"],
    "TORRE DE FERMENTAÇÃO": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
    ],
    "FERMENTAÇÃO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-PISO 01",
      "7-PISO 02",
      "8-PISO 03",
      "9-PISO 03",
    ],
    "CCM FERMENTAÇÃO": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
    ],
    "SISTEMA DE INCÊNDIO": [
      "1-CCM",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
    ],
    "SALA DO COMPRESSOR": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "TRATAMENTO DE CALDO": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-SALA COMPRESSOR",
      "6-SALA COMPRESSOR",
      "7-TÉRREO",
      "8-TÉRREO",
      "9-PISO 01",
      "10-PISO 01",
      "11-PISO 01",
    ],
    "CCM TRATAMENTO DE CALDO": ["1-PRINCIPAL", "2-PRINCIPAL"],
    "FERTIRRIGAÇÃO": [
      "1-CCM",
      "2-CCM INTERNO",
      "3-BEBEDOURO",
      "4-CASA DE BOMBA",
      "5-CCM",
    ],
    "OFICINA AGRÍCOLA": [
      "1-PISO 01",
      "2-PISO 01",
      "3-ESCRITÓRIO",
      "4-EXTERNO",
      "5-EXTERNO",
      "6-MANUTENÇÃO",
      "7-MANUTENÇÃO",
      "8-MANUTENÇÃO",
      "9-MANUTENÇÃO",
      "10-MANUTENÇÃO",
      "11-MANUTENÇÃO",
      "12-MANUTENÇÃO",
      "13-MANUTENÇÃO",
      "14-MANUTENÇÃO",
      "15-MANUTENÇÃO",
      "16-MANUTENÇÃO",
      "17-MANUTENÇÃO CALDEIRARIA",
      "18-MANUTENÇÃO",
    ],
    "BORRACHARIA / LUBRIFICAÇÃO": [
      "1-OFICINA / LUBRIFICAÇÃO",
      "2-OFICINA / LUBRIFICANTE",
      "3-LAVA JATO",
      "4-LUBRIFICAÇÃO",
      "5-BORRACHARIA",
    ],
    "SALA DE TREINAMENTO": ["1-PRINCIPAL", "2-SANITÁRIOS"],
    "ÁREA DE LIMPEZA SODEXO": ["1-ÁREA LIMPEZA", "2-ÁREA LIMPEZA"],
    "COI": [
      "1-EXTERNO",
      "2-EXTERNO",
      "3-EXTERNO",
      "4-BANHEIRO",
      "5-EXTERNO",
      "6-INTERNO",
      "7-SUPERVISOR",
      "8-INTERNO",
    ],
    "MOENDA": [
      "1-TÉRREO",
      "2-TÉRREO",
      "3-TÉRREO",
      "4-TÉRREO",
      "5-TÉRREO",
      "6-PISO SUPERIOR",
      "7-PISO SUPERIOR",
      "8-PISO 2",
      "9-TOMBADOR TÉRREO",
      "10-TOMBADOR PISO SUPERIOR",
      "11-MOINHO PISO 3",
    ],
    "MOENDA 2": [
      "1-PRINCIPAL",
      "2-PRINCIPAL",
      "3-PRINCIPAL",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
      "7-PRINCIPAL",
      "8-PRINCIPAL",
      "9-PRINCIPAL",
      "10-PRINCIPAL",
      "11-PISO 1",
      "12-PISO 1",
      "13-PISO 1",
      "14-PISO 2",
      "15-PISO 2",
      "16-PISO 2",
      "17-PISO 2",
      "18-PISO 2",
      "19-TOMBADOR",
    ],
    "SUBESTAÇÃO": [
      "1-INTERNO",
      "2-INTERNO",
      "3-INTERNO",
      "4-PRINCIPAL",
      "5-PRINCIPAL",
      "6-PRINCIPAL",
    ],
  },
};

const CATALOGO_FIXO_HIDRANTES: Record<string, string[]> = {
  "BP - TROPICAL": [
    "1-COA",
    "2-COA",
    "3-COI",
    "4-COI",
    "5-REFEITÓRIO",
    "6-REFEITÓRIO",
    "7-MECANICA",
    "8-MECANICA",
    "9-ALMOXARIFADO",
    "10-ALMOXARIFADO",
    "11-EVAPORAÇÃO",
    "12-EVAPORAÇÃO",
    "13-FABRICA DE AÇUCAR",
    "14-FABRICA DE AÇUCAR",
    "15-FABRICA DE AÇUCAR",
    "16-FABRICA DE AÇUCAR",
    "17-EVAPORAÇÃO",
    "18-EVAPORAÇÃO",
    "19-TRATAMENTO DE CALDO",
    "20-TRATAMENTO DE CALDO",
    "21-DIFUSOR 1",
    "22-DIFUSOR 1",
    "23-DIFUSOR 1",
    "24-DIFUSOR 1",
    "25-DIFUSOR 1",
    "26-DIFUSOR 1",
    "27-DIFUSOR 2",
    "28-DIFUSOR 2",
    "29-CALDEIRA",
    "30-CALDEIRA",
    "31-ETA",
    "32-ETA",
    "33-ETA FRENTE BAG",
    "34-ETA FRENTE BAG",
    "35-BOMBA BRIGADA",
    "36-BOMBA BRIGADA",
    "37-ETA",
    "38-ETA",
    "39-DESTILARIA",
    "40-DESTILARIA",
    "41-BAGAÇO INTERNO",
    "42-BAGAÇO INTERNO",
    "43-BAGAÇO",
    "44-BAGAÇO",
    "45-BAGAÇO",
    "46-CAIERA",
    "47-CAIERA",
    "48-CAIERA",
    "49-CAIERA",
    "50-ETANOL",
    "51-ETANOL",
    "52-ETANOL",
    "53-ETANOL",
    "54-ETANOL",
    "55-ETANOL",
    "56-ETANOL",
    "57-ETANOL",
    "58-ETANOL",
    "59-ETANOL",
    "60-ETANOL",
    "61-ETANOL",
    "62-ETANOL",
    "63-ETANOL",
    "64-ETANOL",
    "65-ETANOL",
    "66-ETANOL",
    "67-ETANOL",
    "68-ETANOL",
    "69-ETANOL",
    "70-BARRACÃO",
    "71-BARRACÃO",
    "72-BARRACÃO",
    "73-BARRACÃO",
    "74-BARRACÃO",
    "75-BARRACÃO",
    "76-ADM",
    "77-ADM",
    "78-OFC AGRICOLA",
    "79-OFC AGRICOLA",
    "80-OFC AGRICOLA",
    "81-OFC ALMOXARIFADO",
    "82-OFC ESCRITÓRIO",
    "83-OFICINA",
    "84-OFICINA",
    "85-CX RECAL BAGAÇO",
    "86-CX RECAL FRENT CALDEIRA",
    "87-CX RECAL FRENTE CCM"
  ],
  "BP - ITUMBIARA": [
    "01-FERMENTAÇÃO",
    "02-FERMENTAÇÃO",
    "03-EVAPORAÇÃO",
    "04-CALDEIRA",
    "05-CALDEIRA",
    "06-CCM CALDEIRA",
    "07-DIFUSOR",
    "08-FAB AÇUCAR",
    "09-COI",
    "10-OFC MANUTENÇÃO",
    "11-DESTILARIA",
    "12-DESTILARIA",
    "13-DESTILARIA",
    "14-TANQUE ETANOL",
    "15-TANQUE ETANOL",
    "16-TANQUE ETANOL",
    "17-TANQUE ETANOL",
    "18-TANQUE ETANOL",
    "19-TANQUE ETANOL",
    "20-TANQUE ETANOL",
    "21-TANQUE ETANOL",
    "22-TANQUE ETANOL",
    "23-TANQUE ETANOL",
    "24-PÁTIO DE BAGAÇO",
    "25-PÁTIO DE BAGAÇO",
    "26-PÁTIO DE BAGAÇO",
    "27-PÁTIO DE BAGAÇO",
    "28-PÁTIO DE BAGAÇO",
    "29-PÁTIO DE BAGAÇO",
    "30-DEF AGRICOLA",
    "31-OFC AUTOMOTIVA",
    "32-OFC AUTOMOTIVA",
    "33-OFC AUTOMOTIVA",
    "34-POSTO COMBUSTIVEL",
    "35-ARMAZEM DE AÇUCAR",
    "36-ARMAZEM DE AÇUCAR",
    "37-TANQUE ETANOL",
    "38-TANQUE ETANOL",
    "39-TANQUE ETANOL"
  ],
  "BP - ITUIUTABA": [
    "01-PATIO CHECK LIST",
    "02-PATIO CHECK LIST",
    "03-PATIO CHECK LIST",
    "04-PATIO CHECK LIST",
    "05-POSTO",
    "06-POSTO",
    "07-PATIO INTERNO",
    "08-PATIO INTERNO",
    "09-PATIO INTERNO",
    "10-VLC",
    "11-CALDEIRA",
    "12-CALDEIRA",
    "13-DIFUSOR",
    "14-DIFUSOR",
    "15-DIFUSOR",
    "16-FAB DE AÇUCAR",
    "17-FAB DE AÇUCAR",
    "18-FAB DE AÇUCAR",
    "19-FAB DE AÇUCAR PISO 1",
    "20-FAB DE AÇUCAR PISO 2",
    "21-ARMAZEM AÇUCAR",
    "22-ARMAZEM DE AÇUCAR",
    "23-TRATAMENTO TERREO",
    "24-EVAPORAÇÃO PISO 01",
    "25-EVAPORAÇÃO PISO 02",
    "26-EVAPORAÇÃO PISO 02",
    "27-EVAPORAÇÃO TERREO",
    "28-TRATAMENTO PISO 01",
    "29-FERMENTAÇÃO",
    "30-FERMENTAÇÃO",
    "31-FERMENTAÇÃO PISO 03",
    "32-DESTILARIA",
    "33-PRODUTOS QUIMICOS",
    "34-TORRE RESFRIAMENTO",
    "35-BAGAÇO",
    "36-BAGAÇO",
    "37-BAGAÇO",
    "38-ETANOL",
    "39-ETANOL",
    "40-ETANOL",
    "41-ETANOL",
    "42-ETANOL",
    "43-ETANOL",
    "44-ETANOL",
    "45-ETANOL",
    "46-ETANOL",
    "47-ETANOL",
    "48-ETANOL",
    "49-ETANOL",
    "50-ETANOL",
    "51-ETANOL",
    "52-ETANOL",
    "53-ETANOL",
    "54-ETANOL",
    "55-ETANOL",
    "56-ETANOL",
    "57-ETANOL",
    "58-ETANOL",
    "59-ETANOL",
    "60-ETANOL",
    "61-ETANOL",
    "62-ETANOL",
    "63-ETANOL",
    "64-ETANOL",
    "65-CALDEIRA",
    "66-CALDEIRA PISO 04",
    "67-BAGAÇO",
    "68-BAGAÇO",
    "69-BAGAÇO",
    "70-BAGAÇO",
    "71-BAGAÇO",
    "72-AUTOMOTIVA",
    "73-BORRACHARIA",
    "74-OFC AUTOMOTIVA",
    "75-PCM",
    "76-AUTOMOTIVA",
    "77-TENDA ARMAZEM",
    "78-TENDA ARMAZEM"
  ],
  "BP - ITAPAGIPE": [
    "01-AMBULATÓRIO",
    "02-ETANOL",
    "03-ETANOL",
    "04-ETANOL",
    "05-ETANOL",
    "06-ETANOL",
    "07-ETANOL",
    "08-ETANOL",
    "09-ETA",
    "10-ETA",
    "11-OFC AGRICOLA",
    "12-OFC AGRICOLA",
    "13-MOENDA",
    "14-MOENDA",
    "15-BAGAÇO",
    "16-BAGAÇO",
    "17-ARMAZEM DE AÇUCAR",
    "18-TRATAMENTO DE CALDO",
    "19-TRATAMENTO DE CALDO"
  ],
  "BP - FRUTAL": [
    "01-OFICINA AGRICOLA",
    "02-OFICINA AGRICOLA",
    "03-ALMOXARIFADO",
    "04-ETA",
    "05-LADO CCM FÁBRICA",
    "06-FERMENTAÇÃO",
    "07-FERMENTAÇÃO/DESTILARIA",
    "08-FÁBRICA AÇÚCAR",
    "09-ATRÁS DA DESTILARIA",
    "10-ETE / BAGAÇO",
    "11-ATRÁS BAGAÇO",
    "12-ATRÁS BAGAÇO",
    "13-VLC",
    "14-CALDEIRA",
    "15-CALDEIRA",
    "16-DIFUSOR",
    "17-DIFUSOR",
    "18-ETANOL",
    "19-ETANOL",
    "20-ETANOL",
    "21-ETANOL",
    "22-ETANOL",
    "23-ETANOL",
    "24-ETANOL",
    "25-ETANOL",
    "26-ETANOL",
    "27-BORRACHARIA",
    "28-ARMAZEM",
    "29-ARMAZEM FRENT VLC",
    "30-ARMAZEM",
    "31-FABRICA AÇUCAR FRENT ARMZ",
    "32-ETANOL FRENT ARMAZEM"
  ],
  "BP - SANTA JULIANA": [
    "01-POSTO COMBUSTIVEL",
    "02-POSTO COMBUSTIVEL",
    "03-REFEITÓRIO EXT",
    "04-PORTARIA",
    "05-BORRACHARIA",
    "06-OFC AGRICOLA",
    "07-PCTS",
    "08-CALDEIRA FRENTE SUBSTAÇÃO",
    "09-CALDEIRA FRENTE SUBSTAÇÃO",
    "10-BAGAÇO",
    "11-CALDEIRA 1 TERREO",
    "12-CALDEIRA 1 TERREO",
    "13-CALDEIRA 2 TERREO",
    "14-CALDEIRA 1 TERREO",
    "15-CALDEIRA 1 TERREO",
    "16-CARREGAMENTO FULIGEM",
    "17-MOENDA 01",
    "18-MOENDA 01",
    "19-TORRE FABRICA",
    "20-FUNDO DA TORRE",
    "21-TORRE FABRICA",
    "22-PATIO FERRO VELHO",
    "23-FABRICA AÇUCAR TERREO",
    "24-FABRICA AÇUCAR PISO 2",
    "25-FABRICA AÇUCAR TETO",
    "26-TRATAMENTO CALDO",
    "27-TRATAMENTO COMPRESSOR",
    "28-BARRACÃO AÇ ALMOXARIFADO",
    "29-BARRACÃO AÇ ALMOXARIFADO",
    "30-BARRACÃO AÇ ALMOXARIFADO",
    "31-TORRE DA FERMENTAÇÃO",
    "32-CARREGAMENTO ETANOL",
    "33-CARREGAMENTO ETANOL",
    "34-CARREGAMENTO ETANOL",
    "35-ETA",
    "36-FERMENTAÇÃO FRENTE ETA",
    "37-DESTILARIA EXTERNO",
    "38-TRATAMENTO CALDO FRNT BARR",
    "39-FRENTE LINHA DE TREM",
    "40-FRENTE CARREGAMENTO",
    "41-FUNDO ALMOXARIFADO",
    "42-ALMOXARIFADO INTERNO PISO 1",
    "43-MANUTENÇÃO PISO 1",
    "44-ETANOL",
    "45-ETANOL",
    "46-ETANOL",
    "47-ETANOL",
    "48-ETANOL",
    "49-ETANOL",
    "50-ETANOL",
    "51-ETANOL",
    "52-OFC AGR PISO 1"
  ]
};

const CATALOGO_FIXO_LAVA_OLHOS: Record<string, string[]> = {
  "BP - TROPICAL": [],
  "BP - ITUMBIARA": [],
  "BP - ITUIUTABA": [
    "01-POSTO COMBUSTÍVEL",
    "02-MANUTENÇÃO",
    "03-ALMOXARIFADO",
    "04-COI LABORATÓRIO",
    "05-CALDEIRA TERREO",
    "06-CALDA PRONTA",
    "07-OFC AGRICOLA",
    "08-FERMENTAÇÃO TERREO",
    "09-FERMENTAÇÃO PISO 2",
    "10-DESTILARIA FUNDO",
    "11-DESTILARIA FUNDO",
    "12-ETA CCM"
  ],
  "BP - ITAPAGIPE": [
    "01-ALMOXARIFADO",
    "02-LAB COI",
    "03-CALDEIRA",
    "04-FERMENTAÇÃO",
    "05-LAB PCTS",
    "06-TRATAMENTO DE CALDO",
    "07-ETA"
  ],
  "BP - FRUTAL": [
    "01-FERMENTAÇÃO",
    "02-FERMENTAÇÃO PISO 2",
    "03-OFIC MEC AGRICOLA",
    "04-LAB PCTS",
    "05-POSTO DE COMBUSTIVEL",
    "06-CALDEIRA",
    "07-TRATAMENTO DE CALDO",
    "08-DESTILARIA",
    "09-ETE",
    "10-LAB INDUSTRIAL"
  ],
  "BP - SANTA JULIANA": [
    "01-BORRACHARIA",
    "02-PCTS LABORATÓRIO",
    "03-OFC MANU INDUSTRIA",
    "04-CALDA PRONTA PISO 1",
    "05-CALDA PRONTA TERREO",
    "06-EVAPORAÇÃO TERREO",
    "07-DESTILARIA 1 INTERNO",
    "08-FERMENTAÇÃO TERREO",
    "09-ETA",
    "10-ALMOXARIFADO PÁTIO",
    "11-DEPÓSITO DE ÓLEO",
    "12-POSTO",
    "13-CASA DE BOMBA",
    "14-CASA DE FORÇA EXTERNO",
    "15-MOENDA 1"
  ]
};

function gerarMangueirasLegado(total: number) {
  return Array.from({ length: total }, (_item, index) =>
    `Mangueira ${String(index + 1).padStart(3, "0")}`
  );
}

const CATALOGO_FIXO_TESTE_HIDROSTATICO: Record<string, string[]> = {
  "BP - TROPICAL": gerarMangueirasLegado(407),
  "BP - ITUMBIARA": gerarMangueirasLegado(180),
  "BP - ITUIUTABA": gerarMangueirasLegado(308),
  "BP - ITAPAGIPE": gerarMangueirasLegado(88),
  "BP - FRUTAL": gerarMangueirasLegado(90),
  "BP - SANTA JULIANA": gerarMangueirasLegado(221),
};


// Inventário real de EXTINTORES extraído do main.dart do app Flutter.
// Esse mapa é usado no PDF para calcular o percentual real da área.
// Exemplo: BP - ITAPAGIPE / ÁREA DE VIVÊNCIA = 5, então 1 vistoriado = 20%, não 100%.
const TOTAL_EXTINTORES_MAIN_DART: Record<string, number> = {
  "BPFRUTAL|ADM": 9,
  "BPFRUTAL|ALMOXARIFADO": 11,
  "BPFRUTAL|AREAAGRICOLA": 20,
  "BPFRUTAL|BALANCA": 1,
  "BPFRUTAL|BARRACAODEACUCAR": 15,
  "BPFRUTAL|CALDEIRA": 11,
  "BPFRUTAL|CARREGAMENTODEETANOL": 5,
  "BPFRUTAL|CASADEBOMBAS": 14,
  "BPFRUTAL|CASADEFORCA": 7,
  "BPFRUTAL|CENTRALDERESIDUOS": 3,
  "BPFRUTAL|CONTROLE": 1,
  "BPFRUTAL|DESTILARIA": 9,
  "BPFRUTAL|DIFUSOR": 14,
  "BPFRUTAL|ESCRITORIOINDUSTRIAL": 2,
  "BPFRUTAL|ETA": 4,
  "BPFRUTAL|FABRICADEACUCAR": 9,
  "BPFRUTAL|FERMENTACAO": 12,
  "BPFRUTAL|GERADORDIESEL": 6,
  "BPFRUTAL|INSTRUMENTACAOMECANICA": 4,
  "BPFRUTAL|INSUMOSAGRICOLAS": 4,
  "BPFRUTAL|LABORATORIOPCTS": 2,
  "BPFRUTAL|LGE": 6,
  "BPFRUTAL|PORTARIA": 1,
  "BPFRUTAL|POSTO": 5,
  "BPFRUTAL|REFEITORIO": 7,
  "BPFRUTAL|TRATAMENTODECALDO": 8,
  "BPFRUTAL|VIVENCIA": 2,
  "BPFRUTAL|VIVENCIAMOTORISTA": 1,
  "BPFRUTAL|VLC": 2,
  "BPITAPAGIPE|ADM": 3,
  "BPITAPAGIPE|ALMOXARIFADO": 11,
  "BPITAPAGIPE|AMBULATORIO": 2,
  "BPITAPAGIPE|AREADEVIVENCIA": 5,
  "BPITAPAGIPE|ARMAZEMDEACUCAR": 7,
  "BPITAPAGIPE|BALANCA": 1,
  "BPITAPAGIPE|CALDEIRA": 4,
  "BPITAPAGIPE|CARREGAMENTODEETANOL": 2,
  "BPITAPAGIPE|CASADEFORCA": 6,
  "BPITAPAGIPE|CCMDACALDEIRA": 1,
  "BPITAPAGIPE|CCMDADESTILARIA": 1,
  "BPITAPAGIPE|CCMETA": 3,
  "BPITAPAGIPE|CCMFABRICADEACUCAR": 3,
  "BPITAPAGIPE|CCMPREPARODECALDO": 2,
  "BPITAPAGIPE|CCMVINHACA": 1,
  "BPITAPAGIPE|CENTRALDERESIDUOS": 9,
  "BPITAPAGIPE|COI": 2,
  "BPITAPAGIPE|DESTILARIA": 2,
  "BPITAPAGIPE|ETA": 1,
  "BPITAPAGIPE|FABRICADEACUCAR": 10,
  "BPITAPAGIPE|FERMENTACAO": 4,
  "BPITAPAGIPE|LABORATORIOPCTS": 2,
  "BPITAPAGIPE|MOENDA": 4,
  "BPITAPAGIPE|OFICINAAGRICOLA": 18,
  "BPITAPAGIPE|OFICINAINDUSTRIA": 9,
  "BPITAPAGIPE|PORTARIA": 1,
  "BPITAPAGIPE|POSTO": 5,
  "BPITAPAGIPE|REFEITORIO": 6,
  "BPITAPAGIPE|SALADETREINAMENTO": 1,
  "BPITAPAGIPE|TRATAMENTODECALDO": 7,
  "BPITAPAGIPE|VINHACA": 4,
  "BPITAPAGIPE|VIVENCIAMOTORISTA": 1,
  "BPITAPAGIPE|VLC": 5,
  "BPITUIUTABA|ADM": 11,
  "BPITUIUTABA|ALMOXARIFADO": 5,
  "BPITUIUTABA|ANTENA": 2,
  "BPITUIUTABA|AREADEVIVENCIA": 1,
  "BPITUIUTABA|BALANCA": 1,
  "BPITUIUTABA|BARRACAODEACUCAR": 17,
  "BPITUIUTABA|CAIEIRA": 2,
  "BPITUIUTABA|CALDEIRA": 12,
  "BPITUIUTABA|CARREGAMENTODEETANOL": 4,
  "BPITUIUTABA|CASADEFORCA": 19,
  "BPITUIUTABA|CENTRALDERESIDUOS": 2,
  "BPITUIUTABA|COI": 5,
  "BPITUIUTABA|CONTAINER": 1,
  "BPITUIUTABA|DEPOSITODEINSUMOS": 5,
  "BPITUIUTABA|DESTILARIA": 6,
  "BPITUIUTABA|DIFUSOR": 10,
  "BPITUIUTABA|ETA": 5,
  "BPITUIUTABA|ETE": 3,
  "BPITUIUTABA|EVAPORACAO": 17,
  "BPITUIUTABA|EXPEDICAO": 4,
  "BPITUIUTABA|FABRICADEACUCAR": 18,
  "BPITUIUTABA|FERMENTACAO": 12,
  "BPITUIUTABA|INSTRUMENTACAO": 2,
  "BPITUIUTABA|MANUTENCAO": 4,
  "BPITUIUTABA|OFICINA": 22,
  "BPITUIUTABA|PCTS": 1,
  "BPITUIUTABA|POSTO": 8,
  "BPITUIUTABA|REFEITORIO": 7,
  "BPITUIUTABA|SUBESTACAO": 7,
  "BPITUIUTABA|TENDAPRODUTOSQUIMICOS": 2,
  "BPITUIUTABA|TORREDERESFRIAMENTO": 2,
  "BPITUIUTABA|TRATAMENTODECALDO": 10,
  "BPITUIUTABA|VIVEIRO": 2,
  "BPITUIUTABA|VLC": 4,
  "BPITUMBIARA|ADM02": 12,
  "BPITUMBIARA|ADMAGRICOLA": 8,
  "BPITUMBIARA|ALMOXARIFADO": 8,
  "BPITUMBIARA|AREADEVIVENCIA": 3,
  "BPITUMBIARA|ARMAZEM": 9,
  "BPITUMBIARA|BALANCA": 2,
  "BPITUMBIARA|CALDEIRA": 21,
  "BPITUMBIARA|CARREGAMENTODEALCOOL": 2,
  "BPITUMBIARA|CASADEFORCA": 23,
  "BPITUMBIARA|CCMDACALDEIRA": 4,
  "BPITUMBIARA|CENTRALDERESIDUOS": 5,
  "BPITUMBIARA|COI": 6,
  "BPITUMBIARA|DEFENSIVOSAGRICOLAS": 13,
  "BPITUMBIARA|DESTILARIA": 8,
  "BPITUMBIARA|DIFUSOR": 20,
  "BPITUMBIARA|ETA": 10,
  "BPITUMBIARA|EVAPORACAO": 21,
  "BPITUMBIARA|EXPEDICAO": 7,
  "BPITUMBIARA|FABRICADEACUCAR": 16,
  "BPITUMBIARA|FERMENTACAO": 20,
  "BPITUMBIARA|MANUTENCAO": 6,
  "BPITUMBIARA|OFICINA": 34,
  "BPITUMBIARA|PCTS": 3,
  "BPITUMBIARA|POSTO": 15,
  "BPITUMBIARA|REFEITORIO": 13,
  "BPITUMBIARA|TANQUEDEALCOOL": 7,
  "BPITUMBIARA|TORREDERESFRIAMENTO": 8,
  "BPITUMBIARA|TRATAMENTODECALDO": 8,
  "BPITUMBIARA|VLC": 7,
  "BPSANTAJULIANA|ALMOXARIFADO": 13,
  "BPSANTAJULIANA|AREADELIMPEZASODEXO": 2,
  "BPSANTAJULIANA|BALANCA": 2,
  "BPSANTAJULIANA|BORRACHARIALUBRIFICACAO": 5,
  "BPSANTAJULIANA|CALDAPRONTA": 6,
  "BPSANTAJULIANA|CALDEIRA01": 4,
  "BPSANTAJULIANA|CALDEIRA02": 3,
  "BPSANTAJULIANA|CALDEIRA03": 8,
  "BPSANTAJULIANA|CALDEIRACCM": 3,
  "BPSANTAJULIANA|CARREGAMENTODEACUCAR": 18,
  "BPSANTAJULIANA|CARREGAMENTODEETANOL": 3,
  "BPSANTAJULIANA|CARREGAMENTODEFULIGEM": 1,
  "BPSANTAJULIANA|CASADEFORCA": 25,
  "BPSANTAJULIANA|CCMDESTILARIA": 3,
  "BPSANTAJULIANA|CCMFABRICADEACUCAR": 9,
  "BPSANTAJULIANA|CCMFERMENTACAO": 4,
  "BPSANTAJULIANA|CCMMOENDA": 7,
  "BPSANTAJULIANA|CCMOFICINA": 1,
  "BPSANTAJULIANA|CCMTRATAMENTODECALDO": 2,
  "BPSANTAJULIANA|COI": 8,
  "BPSANTAJULIANA|DEPOSITODEGAS": 3,
  "BPSANTAJULIANA|DEPOSITODELIXO": 2,
  "BPSANTAJULIANA|DESTILARIA": 14,
  "BPSANTAJULIANA|DOJO": 4,
  "BPSANTAJULIANA|ETA": 5,
  "BPSANTAJULIANA|EVAPORACAO": 5,
  "BPSANTAJULIANA|FABRICADEACUCAR": 18,
  "BPSANTAJULIANA|FERMENTACAO": 9,
  "BPSANTAJULIANA|FERTIRRIGACAO": 5,
  "BPSANTAJULIANA|LABORATORIOPCTS": 8,
  "BPSANTAJULIANA|MOENDA": 11,
  "BPSANTAJULIANA|MOENDA2": 19,
  "BPSANTAJULIANA|OFICINAAGRICOLA": 18,
  "BPSANTAJULIANA|OFICINAMANUTENCAO": 7,
  "BPSANTAJULIANA|PORTARIA": 1,
  "BPSANTAJULIANA|POSTO": 12,
  "BPSANTAJULIANA|REFEITORIO": 8,
  "BPSANTAJULIANA|RH": 6,
  "BPSANTAJULIANA|SALADETREINAMENTO": 2,
  "BPSANTAJULIANA|SALADOCOMPRESSOR": 2,
  "BPSANTAJULIANA|SEGURANCADOTRABALHO": 3,
  "BPSANTAJULIANA|SISTEMADEINCENDIO": 4,
  "BPSANTAJULIANA|SUBESTACAO": 6,
  "BPSANTAJULIANA|TORRE2": 4,
  "BPSANTAJULIANA|TORREDAFABRICA": 10,
  "BPSANTAJULIANA|TORREDEFERMENTACAO": 5,
  "BPSANTAJULIANA|TRATAMENTODECALDO": 11,
  "BPSANTAJULIANA|VESTIARIOPORTARIA": 5,
  "BPSANTAJULIANA|VIVENCIA": 1,
  "BPTROPICAL|ADMINISTRATIVORECEPCAO": 3,
  "BPTROPICAL|ALMOXARIFADO": 7,
  "BPTROPICAL|AREADEVIVENCIA": 3,
  "BPTROPICAL|BALANCA": 2,
  "BPTROPICAL|BARRACAODEACUCAR": 3,
  "BPTROPICAL|BATEEVOLTAMOTORISTA": 1,
  "BPTROPICAL|BOMBADEINCENDIO": 3,
  "BPTROPICAL|CAIEIRA": 3,
  "BPTROPICAL|CALDEIRA01": 10,
  "BPTROPICAL|CALDEIRA02": 18,
  "BPTROPICAL|CALDEIRA02CCMTERREO": 11,
  "BPTROPICAL|CARREGAMENTOETANOL": 4,
  "BPTROPICAL|CASADEFORCA": 38,
  "BPTROPICAL|CENTRALDERESIDUOS": 2,
  "BPTROPICAL|COI": 9,
  "BPTROPICAL|DEPOSITODEOXIGENIO": 2,
  "BPTROPICAL|DEPOSITOINSUMOS": 12,
  "BPTROPICAL|DESTILARIA01": 13,
  "BPTROPICAL|DESTILARIA01CCM": 4,
  "BPTROPICAL|DESTILARIA02": 8,
  "BPTROPICAL|DIFUSOR01CCM": 3,
  "BPTROPICAL|DIFUSOR01TERREO": 15,
  "BPTROPICAL|DIFUSOR02TERREOMOTORES": 18,
  "BPTROPICAL|DIFUSORCCM02": 12,
  "BPTROPICAL|ETA": 12,
  "BPTROPICAL|ETACCM": 3,
  "BPTROPICAL|EVAPORACAO": 10,
  "BPTROPICAL|EVAPORACAOCCM": 3,
  "BPTROPICAL|EXPEDICAO": 4,
  "BPTROPICAL|FABRICADEACUCAR": 10,
  "BPTROPICAL|FERMENTACAO": 9,
  "BPTROPICAL|MANUTENCAO": 3,
  "BPTROPICAL|OFICIMPLEMENTOSALAMONTAGEM": 3,
  "BPTROPICAL|OFICINAAUTOMOTIVA": 10,
  "BPTROPICAL|OFICINABORRACHARIALAVADOR": 6,
  "BPTROPICAL|PCTS": 5,
  "BPTROPICAL|PORTARIA": 4,
  "BPTROPICAL|PORTARIAINDUSTRIARH": 2,
  "BPTROPICAL|POSTO": 15,
  "BPTROPICAL|R6": 3,
  "BPTROPICAL|R6CCM": 2,
  "BPTROPICAL|R7": 4,
  "BPTROPICAL|R7CCM": 2,
  "BPTROPICAL|REFEITORIO": 10,
  "BPTROPICAL|SALAANGELIN": 2,
  "BPTROPICAL|SALACAJA": 2,
  "BPTROPICAL|SALACEDRO": 2,
  "BPTROPICAL|SALADOJOAGRICOLA": 2,
  "BPTROPICAL|SALADOJOINDUSTRIA": 2,
  "BPTROPICAL|SALAJEQUITIBA": 2,
  "BPTROPICAL|SALAJERIVA": 2,
  "BPTROPICAL|SEGURANCADOTRABALHO": 3,
  "BPTROPICAL|SUBESTACAO": 11,
  "BPTROPICAL|TORREDERESFRIAMENTOCCM": 14,
  "BPTROPICAL|TORREDERESFRIAMENTOMOTORES": 4,
  "BPTROPICAL|TRATAMENTOCALDOCCM": 3,
  "BPTROPICAL|TRATAMENTODECALDO": 6,
  "BPTROPICAL|TRATAMENTOESGOTO": 1,
  "BPTROPICAL|VISTCAMINHAOFATURAMENTO": 3,
  "BPTROPICAL|VLC": 2
};

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarChaveInventario(valor: unknown) {
  return normalizarTexto(valor).replace(/[^A-Z0-9]/g, "");
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

function converterValorEmData(valor: unknown) {
  if (!valor) return null;

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor;
  }

  const texto = String(valor).trim();

  if (!texto || texto.toLowerCase() === "null" || texto.toLowerCase() === "undefined") {
    return null;
  }

  const dataDireta = new Date(texto);

  if (!Number.isNaN(dataDireta.getTime())) {
    return dataDireta;
  }

  const formatoBrasileiro = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (formatoBrasileiro) {
    const [, dia, mes, ano, hora = "0", minuto = "0", segundo = "0"] = formatoBrasileiro;
    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo)
    );

    if (!Number.isNaN(data.getTime())) {
      return data;
    }
  }

  const formatoIsoSemTimezone = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (formatoIsoSemTimezone) {
    const [, ano, mes, dia, hora = "0", minuto = "0", segundo = "0"] = formatoIsoSemTimezone;
    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo)
    );

    if (!Number.isNaN(data.getTime())) {
      return data;
    }
  }

  return null;
}

function pegarData(linha: LinhaBanco) {
  const candidatos = [
    "data_vistoria",
    "dataVistoria",
    "data_vistoria_iso",
    "data",
    "data_local",
    "dataLocal",
    "criadoEmIso",
    "criado_em_iso",
    "criado_em",
    "created_at",
    "sincronizado_em",
    "updated_at",
    "atualizadoEmIso",
  ];

  for (const campo of candidatos) {
    const data = converterValorEmData(linha[campo]);

    if (data) {
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

function chaveDataLocal(data: Date | null) {
  if (!data) return "";

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function dataDentroDoPeriodo(
  data: Date | null,
  dataInicio: string,
  dataFim: string
) {
  if (!dataInicio && !dataFim) return true;
  if (!data) return false;

  const dataRegistro = chaveDataLocal(data);

  if (dataInicio && dataRegistro < dataInicio) {
    return false;
  }

  if (dataFim && dataRegistro > dataFim) {
    return false;
  }

  return true;
}

function tituloDaTela(tela: TelaAdmin) {
  if (tela === "dashboard") return "Dashboard Geral";
  if (tela === "vistorias") return "Vistorias";
  if (tela === "empresas") return "Empresas";
  if (tela === "catalogo") return "Catálogo";
  if (tela === "colaboradores") return "Colaboradores";
  if (tela === "dispositivos") return "Dispositivos";
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

  if (tela === "catalogo") {
    return "Cadastro de empresas, áreas, tipos e equipamentos que aparecerão no aplicativo.";
  }

  if (tela === "colaboradores") {
    return "Área preparada para produtividade e gestão de usuários.";
  }

  if (tela === "dispositivos") {
    return "Autorize, bloqueie e acompanhe os celulares que podem usar o aplicativo SafeScan.";
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
      "fotoUrl",
      "foto_url_1",
      "fotoUrl1",
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

function normalizarUrlFoto(valor: unknown) {
  const texto = String(valor ?? "").trim();

  if (!texto) return "";

  if (
    texto.startsWith("http") ||
    texto.startsWith("data:") ||
    texto.startsWith("blob:")
  ) {
    return texto;
  }

  const caminhoLimpo = texto
    .replace(/^\/+/, "")
    .replace(`${BUCKET_FOTOS}/`, "");

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminhoLimpo);

  return data.publicUrl || texto;
}

function adicionarFotoUnica(lista: LinhaBanco[], foto: LinhaBanco) {
  const url = obterUrlFoto(foto);
  if (!url) return;

  const jaExiste = lista.some((item) => obterUrlFoto(item) === url);
  if (jaExiste) return;

  lista.push(foto);
}

function obterFotosComFallback(vistoria: LinhaBanco, todasFotos: LinhaBanco[]) {
  const fotosEncontradas: LinhaBanco[] = [];

  const fotosTabela = todasFotos
    .filter((foto) => String(foto.vistoria_id) === String(vistoria.id))
    .sort((a, b) => {
      const ordemA = Number(a.ordem ?? a.posicao ?? 999);
      const ordemB = Number(b.ordem ?? b.posicao ?? 999);
      return ordemA - ordemB;
    });

  for (const foto of fotosTabela) {
    adicionarFotoUnica(fotosEncontradas, foto);
  }

  const camposDaVistoria = [
    { campo: "foto_url", origem: "vistorias.foto_url", ordem: 1 },
    { campo: "fotoUrl", origem: "vistorias.fotoUrl", ordem: 1 },
    { campo: "foto_url_1", origem: "vistorias.foto_url_1", ordem: 1 },
    { campo: "fotoUrl1", origem: "vistorias.fotoUrl1", ordem: 1 },
    { campo: "foto_url2", origem: "vistorias.foto_url2", ordem: 2 },
    { campo: "fotoUrl2", origem: "vistorias.fotoUrl2", ordem: 2 },
    { campo: "foto_url_2", origem: "vistorias.foto_url_2", ordem: 2 },
    { campo: "segunda_foto_url", origem: "vistorias.segunda_foto_url", ordem: 2 },
  ];

  for (const item of camposDaVistoria) {
    const url = normalizarUrlFoto(vistoria[item.campo]);
    if (!url) continue;

    adicionarFotoUnica(fotosEncontradas, {
      id: `${String(vistoria.id)}-${item.campo}`,
      vistoria_id: vistoria.id,
      foto_url: url,
      origem: item.origem,
      ordem: item.ordem,
    });
  }

  return fotosEncontradas.sort((a, b) => {
    const ordemA = Number(a.ordem ?? a.posicao ?? 999);
    const ordemB = Number(b.ordem ?? b.posicao ?? 999);
    return ordemA - ordemB;
  });
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
  const [dispositivos, setDispositivos] = useState<LinhaBanco[]>([]);
  const [catalogo, setCatalogo] = useState<LinhaBanco[]>([]);

  const [carregandoColaboradores, setCarregandoColaboradores] = useState(false);
  const [carregandoDispositivos, setCarregandoDispositivos] = useState(false);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false);
  const [atualizandoDispositivoId, setAtualizandoDispositivoId] = useState<string | null>(null);
  const [atualizandoColaboradorId, setAtualizandoColaboradorId] = useState<string | null>(null);
  const [atualizandoCatalogoId, setAtualizandoCatalogoId] = useState<string | null>(null);
  const [salvandoColaborador, setSalvandoColaborador] = useState(false);
  const [salvandoCatalogo, setSalvandoCatalogo] = useState(false);

  const [nomeColaborador, setNomeColaborador] = useState("");
  const [emailColaborador, setEmailColaborador] = useState("");
  const [senhaColaborador, setSenhaColaborador] = useState("");
  const [buscaColaborador, setBuscaColaborador] = useState("");
  const [buscaDispositivo, setBuscaDispositivo] = useState("");
  const [filtroStatusDispositivo, setFiltroStatusDispositivo] = useState("TODOS");

  const [catalogoEditandoId, setCatalogoEditandoId] = useState<string | null>(null);
  const [catalogoModo, setCatalogoModo] = useState<"CADASTRAR" | "INATIVAR">("CADASTRAR");
  const [catalogoEmpresaModo, setCatalogoEmpresaModo] = useState<"EXISTENTE" | "NOVO">("EXISTENTE");
  const [catalogoAreaModo, setCatalogoAreaModo] = useState<"EXISTENTE" | "NOVO">("EXISTENTE");
  const [catalogoEmpresa, setCatalogoEmpresa] = useState("");
  const [catalogoArea, setCatalogoArea] = useState("");
  const [catalogoTipo, setCatalogoTipo] = useState("EXTINTORES");
  const [catalogoEquipamento, setCatalogoEquipamento] = useState("");
  const [catalogoEquipamentoInativarId, setCatalogoEquipamentoInativarId] = useState("");
  const [catalogoStatus, setCatalogoStatus] = useState("ATIVO");
  const [catalogoOrdem, setCatalogoOrdem] = useState("0");
  const [buscaCatalogo, setBuscaCatalogo] = useState("");
  const [filtroStatusCatalogo, setFiltroStatusCatalogo] = useState("TODOS");

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
      .order("created_at", { ascending: false })
      .limit(10000);

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

  async function carregarDispositivos() {
    setCarregandoDispositivos(true);
    setErro("");

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/listar-dispositivos", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao carregar dispositivos.");
      }

      setDispositivos(resultado.dispositivos ?? []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar dispositivos."
      );
    } finally {
      setCarregandoDispositivos(false);
    }
  }


  async function carregarCatalogo() {
    setCarregandoCatalogo(true);
    setErro("");

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/listar-catalogo", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao carregar catálogo.");
      }

      setCatalogo(resultado.catalogo ?? []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar catálogo."
      );
    } finally {
      setCarregandoCatalogo(false);
    }
  }

  function limparFormularioCatalogo() {
    setCatalogoEditandoId(null);
    setCatalogoModo("CADASTRAR");
    setCatalogoEmpresaModo("EXISTENTE");
    setCatalogoAreaModo("EXISTENTE");
    setCatalogoEmpresa("");
    setCatalogoArea("");
    setCatalogoTipo("EXTINTORES");
    setCatalogoEquipamento("");
    setCatalogoEquipamentoInativarId("");
    setCatalogoStatus("ATIVO");
    setCatalogoOrdem("0");
  }

  function alterarModoCatalogo(modo: "CADASTRAR" | "INATIVAR") {
    setCatalogoModo(modo);
    setCatalogoEditandoId(null);
    setCatalogoEquipamento("");
    setCatalogoEquipamentoInativarId("");
    setCatalogoStatus(modo === "INATIVAR" ? "INATIVO" : "ATIVO");
  }

  function selecionarEmpresaCatalogo(valor: string) {
    setCatalogoArea("");
    setCatalogoEquipamento("");
    setCatalogoEquipamentoInativarId("");

    if (valor === OPCAO_NOVO_CATALOGO) {
      setCatalogoEmpresaModo("NOVO");
      setCatalogoEmpresa("");
      setCatalogoAreaModo("NOVO");
      return;
    }

    setCatalogoEmpresaModo("EXISTENTE");
    setCatalogoEmpresa(valor);
    setCatalogoAreaModo("EXISTENTE");
  }

  function selecionarAreaCatalogo(valor: string) {
    setCatalogoEquipamento("");
    setCatalogoEquipamentoInativarId("");

    if (valor === OPCAO_NOVO_CATALOGO) {
      setCatalogoAreaModo("NOVO");
      setCatalogoArea("");
      return;
    }

    setCatalogoAreaModo("EXISTENTE");
    setCatalogoArea(valor);
  }

  function obterEmpresaCatalogoSelecionada() {
    return catalogoEmpresa.trim();
  }

  function obterAreaCatalogoSelecionada() {
    return catalogoArea.trim();
  }

  function proximaOrdemCatalogo(empresa: string, area: string, tipo: string) {
    const empresaNormalizada = normalizarTexto(empresa);
    const areaNormalizada = normalizarTexto(area);
    const tipoNormalizado = normalizarTexto(tipo);

    const maiorOrdem = catalogo
      .filter(
        (item) =>
          normalizarTexto(item.empresa_nome) === empresaNormalizada &&
          normalizarTexto(item.area_nome) === areaNormalizada &&
          normalizarTexto(item.tipo) === tipoNormalizado
      )
      .reduce((maior, item) => {
        const ordem = Number(item.ordem ?? 0);
        return Number.isFinite(ordem) && ordem > maior ? ordem : maior;
      }, 0);

    return maiorOrdem + 1;
  }

  function editarItemCatalogo(item: LinhaBanco) {
    setCatalogoEditandoId(String(item.id ?? ""));
    setCatalogoModo("CADASTRAR");
    setCatalogoEmpresaModo("EXISTENTE");
    setCatalogoAreaModo("EXISTENTE");
    setCatalogoEmpresa(String(item.empresa_nome ?? ""));
    setCatalogoArea(String(item.area_nome ?? ""));
    setCatalogoTipo(String(item.tipo ?? "EXTINTORES"));
    setCatalogoEquipamento(String(item.equipamento_nome ?? ""));
    setCatalogoEquipamentoInativarId("");
    setCatalogoStatus(statusCatalogo(item.status));
    setCatalogoOrdem(String(item.ordem ?? "0"));
    setTelaAtiva("catalogo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarItemCatalogo() {
    setErro("");
    setAviso("");

    if (catalogoModo === "INATIVAR") {
      await inativarEquipamentoSelecionado();
      return;
    }

    const empresa_nome = obterEmpresaCatalogoSelecionada();
    const area_nome = obterAreaCatalogoSelecionada();
    const tipo = catalogoTipo.trim().toUpperCase();
    const equipamento_nome = catalogoEquipamento.trim();
    const status = catalogoEditandoId ? statusCatalogo(catalogoStatus) : "ATIVO";
    const ordem = catalogoEditandoId
      ? Number(catalogoOrdem || "0")
      : proximaOrdemCatalogo(empresa_nome, area_nome, tipo);

    if (!empresa_nome) {
      setErro("Informe a empresa.");
      return;
    }

    if (!area_nome) {
      setErro("Informe a área.");
      return;
    }

    if (!tipo) {
      setErro("Informe o tipo do equipamento.");
      return;
    }

    if (!equipamento_nome) {
      setErro("Informe o equipamento.");
      return;
    }

    setSalvandoCatalogo(true);

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/salvar-catalogo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: catalogoEditandoId,
          empresa_nome,
          area_nome,
          tipo,
          equipamento_nome,
          status,
          ordem: Number.isFinite(ordem) ? ordem : 0,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao salvar catálogo.");
      }

      setAviso(catalogoEditandoId ? "Equipamento atualizado com sucesso." : "Equipamento cadastrado com sucesso.");
      limparFormularioCatalogo();
      await carregarCatalogo();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao salvar catálogo."
      );
    } finally {
      setSalvandoCatalogo(false);
    }
  }

  async function atualizarStatusCatalogo(
    item: LinhaBanco,
    acao: "INATIVAR" | "REATIVAR" | "EXCLUIR"
  ) {
    setErro("");
    setAviso("");

    const id = String(item.id ?? "").trim();
    const equipamento = String(item.equipamento_nome ?? "equipamento");

    if (!id) {
      setErro("Não foi possível identificar este equipamento.");
      return;
    }

    if (acao === "EXCLUIR") {
      const confirmar = window.confirm(
        `Tem certeza que deseja excluir ${equipamento} do catálogo? As vistorias antigas continuarão preservadas.`
      );

      if (!confirmar) return;
    }

    setAtualizandoCatalogoId(`${id}-${acao}`);

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/atualizar-catalogo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, acao }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao atualizar catálogo.");
      }

      if (acao === "INATIVAR") {
        setAviso(`Equipamento ${equipamento} inativado. Ele não aparecerá no app.`);
      } else if (acao === "REATIVAR") {
        setAviso(`Equipamento ${equipamento} reativado. Ele voltará a aparecer no app.`);
      } else {
        setAviso(`Equipamento ${equipamento} excluído do catálogo.`);
      }

      await carregarCatalogo();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao atualizar catálogo."
      );
    } finally {
      setAtualizandoCatalogoId(null);
    }
  }


  async function inativarEquipamentoSelecionado() {
    setErro("");
    setAviso("");

    const item = catalogo.find(
      (equipamento) => String(equipamento.id ?? "") === catalogoEquipamentoInativarId
    );

    if (!item) {
      setErro("Selecione um equipamento ativo para inativar.");
      return;
    }

    await atualizarStatusCatalogo(item, "INATIVAR");
    setCatalogoEquipamentoInativarId("");
  }

  async function atualizarStatusDispositivo(
    id: string,
    status: "PENDENTE" | "APROVADO" | "BLOQUEADO"
  ) {
    setErro("");
    setAviso("");
    setAtualizandoDispositivoId(id);

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/atualizar-dispositivo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao atualizar dispositivo.");
      }

      setAviso(`Dispositivo atualizado para ${status}.`);
      await carregarDispositivos();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao atualizar dispositivo."
      );
    } finally {
      setAtualizandoDispositivoId(null);
    }
  }

  function formatarDataCampo(valor: unknown) {
    if (!valor) return "Não informado";

    const data = new Date(String(valor));

    if (Number.isNaN(data.getTime())) return "Não informado";

    return formatarData(data);
  }

  function statusDispositivo(valor: unknown) {
    const status = normalizarTexto(valor || "PENDENTE");

    if (status === "APROVADO") return "APROVADO";
    if (status === "BLOQUEADO") return "BLOQUEADO";

    return "PENDENTE";
  }

  function classeBadgeDispositivo(status: unknown) {
    const normalizado = statusDispositivo(status);

    if (normalizado === "APROVADO") {
      return "bg-green-100 text-green-800 hover:bg-green-100";
    }

    if (normalizado === "BLOQUEADO") {
      return "bg-red-100 text-red-900 hover:bg-red-100";
    }

    return "bg-yellow-100 text-yellow-900 hover:bg-yellow-100";
  }


  function statusCatalogo(valor: unknown) {
    const status = normalizarTexto(valor || "ATIVO");
    return status === "INATIVO" ? "INATIVO" : "ATIVO";
  }

  function classeBadgeCatalogo(status: unknown) {
    return statusCatalogo(status) === "ATIVO"
      ? "bg-green-100 text-green-800 hover:bg-green-100"
      : "bg-zinc-200 text-zinc-700 hover:bg-zinc-200";
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

  async function atualizarStatusColaborador(
    colaborador: LinhaBanco,
    acao: "INATIVAR" | "REATIVAR" | "EXCLUIR"
  ) {
    setErro("");
    setAviso("");

    const id = String(colaborador.id ?? "").trim();
    const nome = String(colaborador.nome ?? colaborador.email ?? "colaborador");

    if (!id) {
      setErro("Não foi possível identificar este colaborador.");
      return;
    }

    if (acao === "EXCLUIR") {
      const confirmar = window.confirm(
        `Tem certeza que deseja excluir ${nome}? O histórico de vistorias já realizadas será preservado, mas o colaborador sairá da lista e o login será bloqueado.`
      );

      if (!confirmar) return;
    }

    setAtualizandoColaboradorId(`${id}-${acao}`);

    try {
      const token = await obterTokenDeAcesso();

      const resposta = await fetch("/api/admin/atualizar-colaborador", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          acao,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.erro || "Erro ao atualizar colaborador.");
      }

      if (acao === "INATIVAR") {
        setAviso(`Colaborador ${nome} inativado com sucesso.`);
      } else if (acao === "REATIVAR") {
        setAviso(`Colaborador ${nome} reativado com sucesso.`);
      } else {
        setAviso(`Colaborador ${nome} excluído com sucesso.`);
      }

      await carregarColaboradores();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao atualizar colaborador."
      );
    } finally {
      setAtualizandoColaboradorId(null);
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
    setDispositivos([]);
    setCatalogo([]);
    setEmail("");
    setSenha("");
    setNomeColaborador("");
    setEmailColaborador("");
    setSenhaColaborador("");
    setBuscaColaborador("");
    setBuscaDispositivo("");
    setFiltroStatusDispositivo("TODOS");
    limparFormularioCatalogo();
    setBuscaCatalogo("");
    setFiltroStatusCatalogo("TODOS");
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
      carregarDispositivos();
      carregarCatalogo();
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

        if (!dataDentroDoPeriodo(data, filtroDataInicio, filtroDataFim)) {
          return false;
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

    return obterFotosComFallback(vistoriaSelecionada, fotos);
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

  const dispositivosFiltrados = useMemo(() => {
    const busca = normalizarTexto(buscaDispositivo);

    return dispositivos
      .filter((dispositivo) => {
        const status = statusDispositivo(dispositivo.status);

        if (filtroStatusDispositivo !== "TODOS" && status !== filtroStatusDispositivo) {
          return false;
        }

        if (!busca) return true;

        const texto = normalizarTexto(
          [
            dispositivo.usuario_email,
            dispositivo.dispositivo_nome,
            dispositivo.dispositivo_id,
            dispositivo.plataforma,
            dispositivo.status,
            dispositivo.usuario_id,
          ].join(" ")
        );

        return texto.includes(busca);
      })
      .sort((a, b) => {
        const dataA = pegarData(a)?.getTime() ?? 0;
        const dataB = pegarData(b)?.getTime() ?? 0;
        return dataB - dataA;
      });
  }, [dispositivos, buscaDispositivo, filtroStatusDispositivo]);


  const empresasCatalogoDisponiveis = useMemo(() => {
    return Array.from(
      new Set(
        catalogo
          .map((item) => String(item.empresa_nome ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [catalogo]);

  const areasCatalogoDisponiveis = useMemo(() => {
    const empresaSelecionada = normalizarTexto(catalogoEmpresa);

    if (!empresaSelecionada) return [];

    return Array.from(
      new Set(
        catalogo
          .filter(
            (item) => normalizarTexto(item.empresa_nome) === empresaSelecionada
          )
          .map((item) => String(item.area_nome ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [catalogo, catalogoEmpresa]);

  const equipamentosAtivosCatalogoDisponiveis = useMemo(() => {
    const empresaSelecionada = normalizarTexto(catalogoEmpresa);
    const areaSelecionada = normalizarTexto(catalogoArea);
    const tipoSelecionado = normalizarTexto(catalogoTipo);

    if (!empresaSelecionada || !areaSelecionada || !tipoSelecionado) return [];

    return catalogo
      .filter(
        (item) =>
          normalizarTexto(item.empresa_nome) === empresaSelecionada &&
          normalizarTexto(item.area_nome) === areaSelecionada &&
          normalizarTexto(item.tipo) === tipoSelecionado &&
          statusCatalogo(item.status) === "ATIVO"
      )
      .sort((a, b) => {
        const ordemA = Number(a.ordem ?? 0);
        const ordemB = Number(b.ordem ?? 0);
        if (ordemA !== ordemB) return ordemA - ordemB;
        return String(a.equipamento_nome ?? "").localeCompare(String(b.equipamento_nome ?? ""));
      });
  }, [catalogo, catalogoEmpresa, catalogoArea, catalogoTipo]);

  const catalogoFiltrado = useMemo(() => {
    const busca = normalizarTexto(buscaCatalogo);

    return catalogo
      .filter((item) => {
        const status = statusCatalogo(item.status);

        if (filtroStatusCatalogo !== "TODOS" && status !== filtroStatusCatalogo) {
          return false;
        }

        if (!busca) return true;

        const texto = normalizarTexto(
          [
            item.empresa_nome,
            item.area_nome,
            item.tipo,
            item.equipamento_nome,
            item.status,
            item.id,
          ].join(" ")
        );

        return texto.includes(busca);
      })
      .sort((a, b) => {
        const empresaA = String(a.empresa_nome ?? "").localeCompare(String(b.empresa_nome ?? ""));
        if (empresaA !== 0) return empresaA;

        const areaA = String(a.area_nome ?? "").localeCompare(String(b.area_nome ?? ""));
        if (areaA !== 0) return areaA;

        const tipoA = String(a.tipo ?? "").localeCompare(String(b.tipo ?? ""));
        if (tipoA !== 0) return tipoA;

        const ordemA = Number(a.ordem ?? 0);
        const ordemB = Number(b.ordem ?? 0);
        if (ordemA !== ordemB) return ordemA - ordemB;

        return String(a.equipamento_nome ?? "").localeCompare(String(b.equipamento_nome ?? ""));
      });
  }, [catalogo, buscaCatalogo, filtroStatusCatalogo]);

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

      if (!dataDentroDoPeriodo(data, mapaDataInicio, mapaDataFim)) {
        return false;
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

        if (!dataDentroDoPeriodo(data, relDataInicio, relDataFim)) {
          return false;
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

  function textoObservacaoValido(valor: unknown) {
    const texto = String(valor ?? "").trim();
    const normalizado = normalizarTexto(texto);

    if (!texto) return "";

    const valoresIgnorados = [
      "-",
      "--",
      "N/A",
      "NA",
      "NAO",
      "NÃO",
      "SIM",
      "NULL",
      "UNDEFINED",
      "SEM OBS",
      "SEM OBSERVACAO",
      "SEM OBSERVACOES",
      "SEM OBSERVAÇÃO",
      "SEM OBSERVAÇÕES",
      "NENHUMA",
      "NENHUM",
    ];

    if (valoresIgnorados.includes(normalizado)) {
      return "";
    }

    return texto;
  }

  function respostaEhObservacao(resposta: LinhaBanco) {
    const pergunta = normalizarTexto(resposta.pergunta);

    return (
      pergunta.includes("OBS") ||
      pergunta.includes("OBSERV") ||
      pergunta.includes("COMENT") ||
      pergunta.includes("ANOT")
    );
  }

  function obterObservacoesRelatorio(vistoria: LinhaBanco, checklist: LinhaBanco[]) {
    const camposObservacao = [
      "observacoes",
      "observacao",
      "observações",
      "observação",
      "obs",
      "observacoes_gerais",
      "observacao_geral",
      "observacoesGerais",
      "observacaoGeral",
      "comentario",
      "comentarios",
      "comentário",
      "comentários",
      "comentario_geral",
      "comentarios_gerais",
      "nota",
      "notas",
      "anotacao",
      "anotacoes",
      "anotação",
      "anotações",
      "descricao_observacao",
      "descricaoObservacao",
    ];

    const observacaoDaVistoria = textoObservacaoValido(
      pegarCampo(vistoria, camposObservacao)
    );

    if (observacaoDaVistoria) {
      return observacaoDaVistoria;
    }

    for (const resposta of checklist) {
      if (!respostaEhObservacao(resposta)) continue;

      const detalhe = textoObservacaoValido(resposta.detalhe);
      if (detalhe) return detalhe;

      const respostaExibida = textoObservacaoValido(obterRespostaExibida(resposta));
      if (respostaExibida) return respostaExibida;
    }

    return "";
  }

  function obterFotosDaVistoriaParaRelatorio(vistoria: LinhaBanco) {
    return obterFotosComFallback(vistoria, fotos);
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


  function normalizarTipoParaComparacao(valor: unknown) {
    const tipo = normalizarTexto(valor);

    if (tipo.includes("EXTINTOR")) return "EXTINTORES";
    if (tipo.includes("HIDRANTE")) return "HIDRANTES";
    if (tipo.includes("LAVA")) return "LAVA_OLHOS";
    if (tipo.includes("TESTE") || tipo.includes("HIDROSTATICO")) return "TESTE_HIDROSTATICO";

    return tipo;
  }

  function chaveGrupoAreaRelatorio(vistoria: LinhaBanco) {
    return [
      normalizarTexto(obterEmpresaRelatorio(vistoria)),
      normalizarTexto(obterAreaRelatorio(vistoria)),
      normalizarTipoParaComparacao(obterTipo(vistoria)),
    ].join("|");
  }

  function agruparVistoriasPorAreaRelatorio(lista: LinhaBanco[]) {
    const grupos = new Map<
      string,
      {
        empresa: string;
        area: string;
        tipo: string;
        itens: LinhaBanco[];
      }
    >();

    for (const vistoria of lista) {
      const chave = chaveGrupoAreaRelatorio(vistoria);
      const empresa = obterEmpresaRelatorio(vistoria);
      const area = obterAreaRelatorio(vistoria);
      const tipo = obterTipo(vistoria);

      if (!grupos.has(chave)) {
        grupos.set(chave, {
          empresa,
          area,
          tipo,
          itens: [],
        });
      }

      grupos.get(chave)?.itens.push(vistoria);
    }

    return Array.from(grupos.values()).sort((a, b) => {
      const empresaA = a.empresa.localeCompare(b.empresa);
      if (empresaA !== 0) return empresaA;

      const areaA = a.area.localeCompare(b.area);
      if (areaA !== 0) return areaA;

      return a.tipo.localeCompare(b.tipo);
    });
  }

  function obterEquipamentosCadastradosDaArea({
    empresa,
    area,
    tipo,
  }: {
    empresa: string;
    area: string;
    tipo: string;
  }) {
    const empresaNormalizada = normalizarChaveInventario(empresa);
    const areaNormalizada = normalizarChaveInventario(area);
    const tipoNormalizado = normalizarTipoParaComparacao(tipo);
    const equipamentos = new Set<string>();

    for (const item of catalogo) {
      if (statusCatalogo(item.status) !== "ATIVO") continue;

      if (normalizarChaveInventario(item.empresa_nome) !== empresaNormalizada) continue;
      if (normalizarChaveInventario(item.area_nome) !== areaNormalizada) continue;
      if (normalizarTipoParaComparacao(item.tipo) !== tipoNormalizado) continue;

      const equipamento = normalizarTexto(item.equipamento_nome);
      if (equipamento) equipamentos.add(equipamento);
    }

    return equipamentos;
  }

  function obterEquipamentosCatalogoFixoDaArea({
    empresa,
    area,
    tipo,
  }: {
    empresa: string;
    area: string;
    tipo: string;
  }) {
    const empresaNormalizada = normalizarChaveInventario(empresa);
    const areaNormalizada = normalizarChaveInventario(area);
    const tipoNormalizado = normalizarTipoParaComparacao(tipo);
    const equipamentos = new Set<string>();

    function encontrarEmpresa<T>(mapa: Record<string, T>) {
      return Object.entries(mapa).find(
        ([nomeEmpresa]) => normalizarChaveInventario(nomeEmpresa) === empresaNormalizada
      )?.[1];
    }

    if (tipoNormalizado === "EXTINTORES") {
      const areasDaEmpresa = encontrarEmpresa(CATALOGO_FIXO_EXTINTORES);

      if (areasDaEmpresa) {
        const equipamentosDaArea = Object.entries(areasDaEmpresa).find(
          ([nomeArea]) => normalizarChaveInventario(nomeArea) === areaNormalizada
        )?.[1];

        for (const equipamento of equipamentosDaArea ?? []) {
          const normalizado = normalizarTexto(equipamento);
          if (normalizado) equipamentos.add(normalizado);
        }
      }
    }

    if (tipoNormalizado === "HIDRANTES") {
      const equipamentosDaEmpresa = encontrarEmpresa(CATALOGO_FIXO_HIDRANTES) ?? [];

      for (const equipamento of equipamentosDaEmpresa) {
        const normalizado = normalizarTexto(equipamento);
        if (normalizado) equipamentos.add(normalizado);
      }
    }

    if (tipoNormalizado === "LAVA_OLHOS") {
      const equipamentosDaEmpresa = encontrarEmpresa(CATALOGO_FIXO_LAVA_OLHOS) ?? [];

      for (const equipamento of equipamentosDaEmpresa) {
        const normalizado = normalizarTexto(equipamento);
        if (normalizado) equipamentos.add(normalizado);
      }
    }

    if (tipoNormalizado === "TESTE_HIDROSTATICO") {
      const equipamentosDaEmpresa = encontrarEmpresa(CATALOGO_FIXO_TESTE_HIDROSTATICO) ?? [];

      for (const equipamento of equipamentosDaEmpresa) {
        const normalizado = normalizarTexto(equipamento);
        if (normalizado) equipamentos.add(normalizado);
      }
    }

    return equipamentos;
  }

  function obterEquipamentosConhecidosNoHistoricoDaArea({
    empresa,
    area,
    tipo,
  }: {
    empresa: string;
    area: string;
    tipo: string;
  }) {
    const empresaNormalizada = normalizarChaveInventario(empresa);
    const areaNormalizada = normalizarChaveInventario(area);
    const tipoNormalizado = normalizarTipoParaComparacao(tipo);
    const equipamentos = new Set<string>();

    // Importante: usa TODAS as vistorias carregadas do Supabase, não apenas o período filtrado.
    // Assim o dashboard não calcula 100% quando o filtro do relatório trouxe apenas 1 vistoria do dia.
    for (const vistoria of vistorias) {
      if (normalizarChaveInventario(obterEmpresaRelatorio(vistoria)) !== empresaNormalizada) continue;
      if (normalizarChaveInventario(obterAreaRelatorio(vistoria)) !== areaNormalizada) continue;
      if (normalizarTipoParaComparacao(obterTipo(vistoria)) !== tipoNormalizado) continue;

      const equipamento = normalizarTexto(obterEquipamento(vistoria));
      if (equipamento) equipamentos.add(equipamento);
    }

    return equipamentos;
  }

  function calcularResumoAreaRelatorio(grupo: {
    empresa: string;
    area: string;
    tipo: string;
    itens: LinhaBanco[];
  }) {
    const vistoriadosUnicos = new Set(
      grupo.itens.map((vistoria) => normalizarTexto(obterEquipamento(vistoria))).filter(Boolean)
    );

    const equipamentosCatalogo = obterEquipamentosCadastradosDaArea({
      empresa: grupo.empresa,
      area: grupo.area,
      tipo: grupo.tipo,
    });

    const equipamentosHistoricoGeral = obterEquipamentosConhecidosNoHistoricoDaArea({
      empresa: grupo.empresa,
      area: grupo.area,
      tipo: grupo.tipo,
    });

    const equipamentosCatalogoFixo = obterEquipamentosCatalogoFixoDaArea({
      empresa: grupo.empresa,
      area: grupo.area,
      tipo: grupo.tipo,
    });

    // Inventário conhecido = catálogo fixo original do app + equipamentos ativos cadastrados no painel.
    // Isso evita o erro de calcular 1 de 1 = 100% quando a área tem vários extintores no inventário original.
    const equipamentosInventarioConhecido = new Set([
      ...Array.from(equipamentosCatalogoFixo),
      ...Array.from(equipamentosCatalogo),
    ]);

    const totalCatalogo = equipamentosCatalogo.size;
    const totalCatalogoFixo = equipamentosCatalogoFixo.size;
    const chaveTotalMain = `${normalizarChaveInventario(grupo.empresa)}|${normalizarChaveInventario(grupo.area)}`;
    const totalMainDart = normalizarTipoParaComparacao(grupo.tipo) === "EXTINTORES"
      ? (TOTAL_EXTINTORES_MAIN_DART[chaveTotalMain] ?? 0)
      : 0;
    const totalInventarioConhecido = Math.max(
      totalMainDart,
      equipamentosInventarioConhecido.size
    );
    const totalHistoricoGeral = equipamentosHistoricoGeral.size;
    const vistoriados = vistoriadosUnicos.size;

    // Ordem de confiança para o total da área:
    // 1) Total real do main.dart do app Flutter, por empresa + área.
    // 2) Inventário conhecido do app/painel: catálogo fixo original + catálogo ativo do painel.
    // 3) Histórico geral do Supabase para a mesma empresa/área/tipo, fora do filtro de data.
    // 4) Quantidade vistoriada no relatório, apenas como último fallback.
    const totalBase = totalMainDart > 0
      ? totalMainDart
      : totalInventarioConhecido > 0
        ? totalInventarioConhecido
        : totalHistoricoGeral > 0
          ? totalHistoricoGeral
          : vistoriados;

    const total = Math.max(totalBase, vistoriados);
    const naoVistoriados = Math.max(total - vistoriados, 0);
    const percentual = total === 0 ? 0 : Math.round((vistoriados / total) * 100);

    let origemTotal = "Histórico filtrado";

    if (totalMainDart > 0) {
      origemTotal = "INVENTÁRIO REAL DO MAIN.DART";
    } else if (totalInventarioConhecido > 0) {
      origemTotal = "Estrutura fixa do main.dart + Catálogo do painel";
    } else if (totalHistoricoGeral > 0) {
      origemTotal = "Histórico geral da área";
    }

    return {
      empresa: grupo.empresa,
      area: grupo.area,
      tipo: grupo.tipo,
      total,
      totalCatalogo,
      totalCatalogoFixo,
      totalMainDart,
      totalInventarioConhecido,
      totalHistoricoGeral,
      vistoriados,
      naoVistoriados,
      percentual,
      origemTotal,
    };
  }

  function gerarGraficoPizzaAreaDataUrl({
    percentual,
    vistoriados,
    total,
  }: {
    percentual: number;
    vistoriados: number;
    total: number;
  }) {
    const tamanho = 520;
    const canvas = document.createElement("canvas");
    canvas.width = tamanho;
    canvas.height = tamanho;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const centro = tamanho / 2;
    const raio = 205;
    const inicio = -Math.PI / 2;
    const fimVistoriado = inicio + (Math.PI * 2 * Math.max(0, Math.min(100, percentual))) / 100;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tamanho, tamanho);

    ctx.beginPath();
    ctx.moveTo(centro, centro);
    ctx.arc(centro, centro, raio, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#dc2626";
    ctx.fill();

    if (percentual > 0) {
      ctx.beginPath();
      ctx.moveTo(centro, centro);
      ctx.arc(centro, centro, raio, inicio, fimVistoriado);
      ctx.closePath();
      ctx.fillStyle = "#16a34a";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(centro, centro, 116, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = "#7f1d1d";
    ctx.font = "bold 62px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${percentual}%`, centro, centro - 10);

    ctx.fillStyle = "#52525b";
    ctx.font = "bold 28px Arial";
    ctx.fillText(`${vistoriados}/${total}`, centro, centro + 52);

    return canvas.toDataURL("image/png");
  }

  function escreverDashboardAreaPdf(
    doc: any,
    resumo: ReturnType<typeof calcularResumoAreaRelatorio>,
    posicaoY: number
  ) {
    const margemX = 40;
    const larguraTotal = 515;
    const alturaBloco = 214;

    posicaoY = garantirEspacoNoPdf(doc, posicaoY, alturaBloco + 18);

    const graficoDataUrl = gerarGraficoPizzaAreaDataUrl({
      percentual: resumo.percentual,
      vistoriados: resumo.vistoriados,
      total: resumo.total,
    });

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(196, 201, 209);
    doc.roundedRect(margemX, posicaoY - 10, larguraTotal, alturaBloco, 12, 12, "FD");

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margemX + 10, posicaoY, larguraTotal - 20, 32, 9, 9, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(127, 29, 29);
    doc.text("DASHBOARD DA ÁREA", margemX + 20, posicaoY + 21);

    if (graficoDataUrl) {
      doc.addImage(graficoDataUrl, "PNG", margemX + 22, posicaoY + 48, 138, 138);
    }

    const infoX = margemX + 184;
    let y = posicaoY + 58;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(39, 39, 42);
    doc.text(`${resumo.percentual}% vistoriado`, infoX, y);

    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(82, 82, 91);
    doc.text(`Empresa: ${resumo.empresa}`, infoX, y);
    y += 15;
    doc.text(`Área: ${resumo.area}`, infoX, y);
    y += 15;
    doc.text(`Tipo: ${resumo.tipo}`, infoX, y);
    y += 22;

    const larguraCard = 92;
    const alturaCard = 46;
    const cards = [
      { titulo: "TOTAL", valor: resumo.total, cor: [39, 39, 42] },
      { titulo: "VISTORIADOS", valor: resumo.vistoriados, cor: [22, 163, 74] },
      { titulo: "NÃO VIST.", valor: resumo.naoVistoriados, cor: [220, 38, 38] },
    ];

    cards.forEach((card, index) => {
      const x = infoX + index * (larguraCard + 10);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, y, larguraCard, alturaCard, 8, 8, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text(card.titulo, x + 9, y + 14);
      doc.setFontSize(16);
      doc.setTextColor(card.cor[0], card.cor[1], card.cor[2]);
      doc.text(String(card.valor), x + 9, y + 35);
    });

    y += 68;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(82, 82, 91);
    doc.text(
      `Base real: ${resumo.origemTotal}. Main.dart: ${resumo.totalMainDart} | Estrutura fixa: ${resumo.totalCatalogoFixo} | Painel: ${resumo.totalCatalogo} | Histórico: ${resumo.totalHistoricoGeral}.`,
      infoX,
      y
    );

    doc.setFillColor(22, 163, 74);
    doc.rect(margemX + 24, posicaoY + 178, 10, 10, "F");
    doc.setTextColor(82, 82, 91);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("Vistoriados", margemX + 40, posicaoY + 187);

    doc.setFillColor(220, 38, 38);
    doc.rect(margemX + 118, posicaoY + 178, 10, 10, "F");
    doc.text("Não vistoriados", margemX + 134, posicaoY + 187);

    return posicaoY + alturaBloco + 18;
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
    indice?: number,
    respostasExternas?: LinhaBanco[]
  ) {
    const margemX = 40;
    const larguraTotal = 515;
    const checklist = respostasExternas ?? obterRespostasUnicasDaVistoria(vistoria.id);
    const fotosRelatorio = obterFotosDaVistoriaParaRelatorio(vistoria).slice(0, 2);
    const quantidadeFotos = fotosRelatorio.length;

    // Layout novo: identificação no topo e as fotos grandes lado a lado no espaço abaixo.
    // Isso evita foto pequena empilhada e aproveita melhor a largura da página.
    const alturaBlocoTopo = quantidadeFotos > 1 ? 318 : 285;
    const alturaFoto = quantidadeFotos > 1 ? 148 : 160;
    const espacoEntreFotos = 14;
    const larguraFoto = quantidadeFotos > 1
      ? (larguraTotal - 36 - espacoEntreFotos) / 2
      : 300;

    // CORREÇÃO SAFESCAN:
    // Primeiro garante espaço/pula página.
    // Só depois calcula a posição das fotos.
    // Isso evita que as fotos das páginas seguintes sejam desenhadas usando o Y antigo.
    posicaoY = garantirEspacoNoPdf(doc, posicaoY, alturaBlocoTopo + 32);

    const inicioFotosY = posicaoY + 116;
    const inicioFotosX = quantidadeFotos > 1
      ? margemX + 18
      : margemX + (larguraTotal - larguraFoto) / 2;

    const linhasInfo = [
      `Equipamento: ${obterEquipamento(vistoria)}`,
      `Tipo: ${obterTipo(vistoria)}`,
      `Empresa: ${obterEmpresaRelatorio(vistoria)}`,
      `Área: ${obterAreaRelatorio(vistoria)}`,
      `Data: ${formatarData(pegarData(vistoria))}`,
      `Vistoria realizada por: ${obterColaboradorExibido(vistoria)}`,
      `GPS: ${String(vistoria.gps ?? "Não informado")}`,
    ];

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(196, 201, 209);
    doc.roundedRect(margemX, posicaoY - 14, larguraTotal, alturaBlocoTopo, 10, 10, "FD");

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margemX + 8, posicaoY - 6, larguraTotal - 16, 24, 8, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(127, 29, 29);
    doc.text(
      `${indice ? `${indice}. ` : ""}${obterEquipamento(vistoria)}`,
      margemX + 18,
      posicaoY + 12
    );

    let cursorInfoY = posicaoY + 34;
    const larguraInfo = larguraTotal - 36;

    for (const linha of linhasInfo) {
      const [rotulo, ...restante] = linha.split(":");
      const valor = restante.join(":").trim();
      const textoCompleto = `${rotulo}: ${valor}`;
      const linhasQuebradas = doc.splitTextToSize(textoCompleto, larguraInfo) as string[];

      for (const parte of linhasQuebradas) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.6);
        doc.setTextColor(39, 39, 42);
        doc.text(parte, margemX + 18, cursorInfoY);
        cursorInfoY += 10;
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(127, 29, 29);
    doc.text(quantidadeFotos > 1 ? "Fotos da vistoria" : "Foto da vistoria", margemX + 18, inicioFotosY - 8);

    if (quantidadeFotos > 0) {
      for (const [indiceFoto, foto] of fotosRelatorio.entries()) {
        const urlFoto = obterUrlFoto(foto);
        const fotoX = inicioFotosX + indiceFoto * (larguraFoto + espacoEntreFotos);
        const fotoY = inicioFotosY;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(150, 155, 165);
        doc.roundedRect(fotoX, fotoY, larguraFoto, alturaFoto, 8, 8, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(127, 29, 29);
        doc.text(`Foto ${indiceFoto + 1}`, fotoX + 10, fotoY + 12);

        const dataUrl = await carregarImagemComoDataUrl(urlFoto);

        if (dataUrl) {
          try {
            const dimensoes = await obterDimensoesImagem(dataUrl);
            const areaImagemLargura = larguraFoto - 20;
            const areaImagemAltura = alturaFoto - 26;
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
              fotoX + 10 + ajuste.xOffset,
              fotoY + 18 + ajuste.yOffset,
              ajuste.largura,
              ajuste.altura
            );
          } catch {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text("Foto não pôde ser renderizada.", fotoX + 12, fotoY + 62);
          }
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text("Foto indisponível.", fotoX + 12, fotoY + 62);
        }
      }
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(150, 155, 165);
      doc.roundedRect(inicioFotosX, inicioFotosY, larguraFoto, alturaFoto, 8, 8, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Sem foto sincronizada.", inicioFotosX + 12, inicioFotosY + 62);
    }

    posicaoY += alturaBlocoTopo + 8;
    posicaoY = garantirEspacoNoPdf(doc, posicaoY, 42);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(127, 29, 29);
    doc.text("Checklist da vistoria", margemX, posicaoY);

    posicaoY += 13;

    if (checklist.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(82, 82, 91);
      doc.text("Checklist não sincronizado.", margemX, posicaoY);
      posicaoY += 14;
    } else {
      for (const item of checklist) {
        const linha = montarLinhaChecklistRelatorio(item);
        const linhas = doc.splitTextToSize(linha, larguraTotal - 8) as string[];
        const alturaLinha = linhas.length * 9 + 5;

        posicaoY = garantirEspacoNoPdf(doc, posicaoY, alturaLinha + 5);

        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(235, 235, 235);
        doc.roundedRect(margemX, posicaoY - 8, larguraTotal, alturaLinha, 4, 4, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.3);
        doc.setTextColor(39, 39, 42);

        let linhaY = posicaoY + 1;
        for (const parte of linhas) {
          doc.text(parte, margemX + 8, linhaY);
          linhaY += 9;
        }

        posicaoY += alturaLinha + 3;
      }
    }

    const observacoesRelatorio = obterObservacoesRelatorio(vistoria, checklist);
    const textoObservacoesPdf = observacoesRelatorio || "Sem observações anotadas.";
    const linhasObservacoes = doc.splitTextToSize(
      textoObservacoesPdf,
      larguraTotal - 18
    ) as string[];
    const alturaObservacao = Math.max(38, linhasObservacoes.length * 9 + 28);

    posicaoY = garantirEspacoNoPdf(doc, posicaoY, alturaObservacao + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(127, 29, 29);
    doc.text("Observações", margemX, posicaoY + 2);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(225, 225, 225);
    doc.roundedRect(
      margemX,
      posicaoY + 7,
      larguraTotal,
      alturaObservacao - 10,
      4,
      4,
      "FD"
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.setTextColor(
      observacoesRelatorio ? 39 : 120,
      observacoesRelatorio ? 39 : 120,
      observacoesRelatorio ? 42 : 120
    );

    let observacaoLinhaY = posicaoY + 23;
    for (const linhaObservacao of linhasObservacoes) {
      doc.text(linhaObservacao, margemX + 8, observacaoLinhaY);
      observacaoLinhaY += 9;
    }

    posicaoY += alturaObservacao;

    posicaoY += 8;
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

  async function buscarRespostasDaVistoriaParaRelatorio(vistoriaId: unknown) {
    const id = String(vistoriaId ?? "").trim();

    if (!id) {
      return obterRespostasUnicasDaVistoria(vistoriaId);
    }

    const { data, error } = await supabase
      .from("vistoria_respostas")
      .select("id, vistoria_id, pergunta, resposta, detalhe, ordem, created_at")
      .eq("vistoria_id", id)
      .order("ordem", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar checklist da vistoria: ${error.message}`);
    }

    const respostasDoBanco = (data ?? []) as LinhaBanco[];

    if (respostasDoBanco.length > 0) {
      return respostasDoBanco;
    }

    return obterRespostasUnicasDaVistoria(vistoriaId);
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
      const checklistRelatorio = await buscarRespostasDaVistoriaParaRelatorio(vistoria.id);
      posicaoY = await escreverBlocoVistoriaTexto(
        doc,
        vistoria,
        posicaoY,
        1,
        checklistRelatorio
      );

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

    const gruposPorArea = agruparVistoriasPorAreaRelatorio(itensUnicos);

    setGerandoRelatorioId(`GERAL-${acao}`);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "pt", "a4");

      for (const [indiceGrupo, grupo] of gruposPorArea.entries()) {
        if (indiceGrupo > 0) {
          doc.addPage();
        }

        const resumoArea = calcularResumoAreaRelatorio(grupo);
        const titulo = `RELATÓRIO GERAL - ${grupo.empresa} / ${grupo.area} / ${grupo.tipo}`;
        const subtitulo = `${grupo.itens.length} de ${resumoArea.total} equipamento(s) vistoriado(s) | ${resumoArea.percentual}% da área | Período: ${relDataInicio || "início"} até ${relDataFim || "hoje"}`;

        let posicaoY = escreverCabecalhoRelatorio(doc, titulo, subtitulo);
        posicaoY = escreverDashboardAreaPdf(doc, resumoArea, posicaoY);

        // O dashboard fica sozinho na primeira página da área.
        // As vistorias detalhadas sempre começam na página seguinte.
        doc.addPage();
        posicaoY = escreverCabecalhoRelatorio(
          doc,
          titulo,
          `Página 2 - Detalhamento das vistorias | ${grupo.itens.length} equipamento(s) vistoriado(s) no filtro aplicado`
        );

        for (const [indice, vistoria] of grupo.itens.entries()) {
          const checklistRelatorio = await buscarRespostasDaVistoriaParaRelatorio(vistoria.id);

          posicaoY = await escreverBlocoVistoriaTexto(
            doc,
            vistoria,
            posicaoY,
            indice + 1,
            checklistRelatorio
          );
        }
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
      setAviso(
        "Nenhum filtro selecionado. Mostrando todas as vistorias sincronizadas carregadas no painel."
      );
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
      id: "catalogo" as TelaAdmin,
      label: "Catálogo",
      icon: ClipboardCheck,
    },
    {
      id: "colaboradores" as TelaAdmin,
      label: "Colaboradores",
      icon: Users,
    },
    {
      id: "dispositivos" as TelaAdmin,
      label: "Dispositivos",
      icon: ShieldCheck,
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


  function renderizarCatalogo() {
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

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Total no catálogo
              </p>
              <p className="mt-2 text-3xl font-black text-red-950">
                {formatarNumero(catalogo.length)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                equipamentos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Ativos
              </p>
              <p className="mt-2 text-3xl font-black text-green-700">
                {formatarNumero(catalogo.filter((item) => statusCatalogo(item.status) === "ATIVO").length)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                aparecerão no app
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Inativos
              </p>
              <p className="mt-2 text-3xl font-black text-zinc-700">
                {formatarNumero(catalogo.filter((item) => statusCatalogo(item.status) === "INATIVO").length)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                ocultos no app
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black text-zinc-800">
              <Building2 className="h-5 w-5 text-red-900" />
              {catalogoEditandoId
                ? "Editar equipamento"
                : catalogoModo === "INATIVAR"
                  ? "Inativar equipamento do catálogo"
                  : "Cadastrar equipamento no catálogo"}
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Escolha uma empresa já cadastrada ou crie uma nova. Depois selecione a área, o tipo e cadastre ou inative o equipamento.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-2xl bg-red-50 p-2">
              <button
                type="button"
                onClick={() => alterarModoCatalogo("CADASTRAR")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  catalogoModo === "CADASTRAR"
                    ? "bg-red-900 text-white"
                    : "bg-white text-red-900 hover:bg-red-100"
                }`}
              >
                Cadastrar novo
              </button>

              <button
                type="button"
                onClick={() => alterarModoCatalogo("INATIVAR")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  catalogoModo === "INATIVAR"
                    ? "bg-red-900 text-white"
                    : "bg-white text-red-900 hover:bg-red-100"
                }`}
              >
                Inativar existente
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="text-sm font-bold text-red-950">Empresa</label>
                <select
                  value={catalogoEmpresaModo === "NOVO" ? OPCAO_NOVO_CATALOGO : catalogoEmpresa}
                  onChange={(event) => selecionarEmpresaCatalogo(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="">Selecione a empresa</option>
                  {catalogoModo === "CADASTRAR" ? (
                    <option value={OPCAO_NOVO_CATALOGO}>+ Nova empresa</option>
                  ) : null}
                  {empresasCatalogoDisponiveis.map((empresa) => (
                    <option key={empresa} value={empresa}>
                      {empresa}
                    </option>
                  ))}
                </select>

                {catalogoEmpresaModo === "NOVO" ? (
                  <Input
                    value={catalogoEmpresa}
                    onChange={(event) => setCatalogoEmpresa(event.target.value)}
                    placeholder="Nome da nova empresa"
                    className="mt-2 h-11 rounded-xl"
                  />
                ) : null}
              </div>

              <div>
                <label className="text-sm font-bold text-red-950">Área</label>
                {catalogoEmpresaModo === "NOVO" ? (
                  <Input
                    value={catalogoArea}
                    onChange={(event) => setCatalogoArea(event.target.value)}
                    placeholder="Nome da nova área"
                    className="mt-2 h-11 rounded-xl"
                  />
                ) : (
                  <>
                    <select
                      value={catalogoAreaModo === "NOVO" ? OPCAO_NOVO_CATALOGO : catalogoArea}
                      onChange={(event) => selecionarAreaCatalogo(event.target.value)}
                      disabled={!catalogoEmpresa}
                      className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm disabled:bg-zinc-100 disabled:text-zinc-400"
                    >
                      <option value="">Selecione a área</option>
                      {catalogoModo === "CADASTRAR" ? (
                        <option value={OPCAO_NOVO_CATALOGO}>+ Nova área</option>
                      ) : null}
                      {areasCatalogoDisponiveis.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>

                    {catalogoAreaModo === "NOVO" ? (
                      <Input
                        value={catalogoArea}
                        onChange={(event) => setCatalogoArea(event.target.value)}
                        placeholder="Nome da nova área"
                        className="mt-2 h-11 rounded-xl"
                      />
                    ) : null}
                  </>
                )}
              </div>

              <div>
                <label className="text-sm font-bold text-red-950">Tipo</label>
                <select
                  value={catalogoTipo}
                  onChange={(event) => {
                    setCatalogoTipo(event.target.value);
                    setCatalogoEquipamentoInativarId("");
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  {TIPOS_CATALOGO.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-red-950">Status</label>
                <div className="mt-2 flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-black text-zinc-700">
                  {catalogoModo === "INATIVAR" ? "INATIVO" : "ATIVO"}
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {catalogoModo === "INATIVAR"
                    ? "O equipamento selecionado será ocultado no app."
                    : "Novos equipamentos entram ativos automaticamente."}
                </p>
              </div>
            </div>

            {catalogoModo === "INATIVAR" ? (
              <div>
                <label className="text-sm font-bold text-red-950">Equipamento ativo para inativar</label>
                <select
                  value={catalogoEquipamentoInativarId}
                  onChange={(event) => setCatalogoEquipamentoInativarId(event.target.value)}
                  disabled={!catalogoEmpresa || !catalogoArea || equipamentosAtivosCatalogoDisponiveis.length === 0}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  <option value="">
                    {equipamentosAtivosCatalogoDisponiveis.length === 0
                      ? "Nenhum equipamento ativo para este caminho"
                      : "Selecione o equipamento ativo"}
                  </option>
                  {equipamentosAtivosCatalogoDisponiveis.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {String(item.equipamento_nome ?? "Equipamento sem nome")}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-bold text-red-950">Equipamento</label>
                <Input
                  value={catalogoEquipamento}
                  onChange={(event) => setCatalogoEquipamento(event.target.value)}
                  placeholder="Ex: 15-POSTO D. LUBRIFICANTES BC 50KG"
                  className="mt-2 h-11 rounded-xl"
                />
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  A sequência é definida automaticamente conforme empresa, área e tipo.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={salvarItemCatalogo}
                disabled={
                  salvandoCatalogo ||
                  Boolean(atualizandoCatalogoId) ||
                  (catalogoModo === "INATIVAR" && !catalogoEquipamentoInativarId)
                }
                className="h-11 rounded-xl bg-red-900 px-6 font-black text-white hover:bg-red-950"
              >
                {salvandoCatalogo || atualizandoCatalogoId ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {catalogoEditandoId
                  ? "Salvar alterações"
                  : catalogoModo === "INATIVAR"
                    ? "Inativar equipamento"
                    : "Cadastrar equipamento"}
              </Button>

              <Button
                variant="outline"
                onClick={limparFormularioCatalogo}
                className="h-11 rounded-xl border-red-200 font-bold text-red-900"
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg font-black text-zinc-800">
                  Catálogo cadastrado
                </CardTitle>
                <p className="text-sm text-zinc-500">
                  Lista carregada da tabela public.catalogo_equipamentos.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input
                    value={buscaCatalogo}
                    onChange={(event) => setBuscaCatalogo(event.target.value)}
                    placeholder="Buscar empresa, área, tipo ou equipamento"
                    className="h-11 rounded-xl pl-9 sm:w-96"
                  />
                </div>

                <select
                  value={filtroStatusCatalogo}
                  onChange={(event) => setFiltroStatusCatalogo(event.target.value)}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODOS">Todos</option>
                  <option value="ATIVO">Ativos</option>
                  <option value="INATIVO">Inativos</option>
                </select>

                <Button
                  variant="outline"
                  onClick={carregarCatalogo}
                  disabled={carregandoCatalogo}
                  className="h-11 rounded-xl border-red-200 font-bold text-red-900"
                >
                  {carregandoCatalogo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {carregandoCatalogo ? (
              <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-5 text-sm font-bold text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin text-red-900" />
                Carregando catálogo...
              </div>
            ) : catalogoFiltrado.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-5 text-sm font-semibold text-zinc-500">
                Nenhum equipamento encontrado no catálogo.
              </div>
            ) : (
              <div className="grid gap-3">
                {catalogoFiltrado.map((item, index) => {
                  const id = String(item.id ?? index);
                  const status = statusCatalogo(item.status);

                  return (
                    <div
                      key={id}
                      className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 xl:grid-cols-[1.05fr_0.9fr_0.75fr_1.5fr_0.55fr_1.3fr]"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Empresa</p>
                        <p className="mt-1 font-black text-red-950">{String(item.empresa_nome ?? "-")}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Área</p>
                        <p className="mt-1 font-semibold text-zinc-800">{String(item.area_nome ?? "-")}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Tipo</p>
                        <p className="mt-1 font-semibold text-zinc-800">{String(item.tipo ?? "-")}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Equipamento</p>
                        <p className="mt-1 font-black text-zinc-900">{String(item.equipamento_nome ?? "-")}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Status</p>
                        <Badge className={`mt-1 ${classeBadgeCatalogo(status)}`}>{status}</Badge>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Ações</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={Boolean(atualizandoCatalogoId)}
                            onClick={() => editarItemCatalogo(item)}
                            className="rounded-xl border-red-200 text-red-900 hover:bg-red-50"
                          >
                            Editar
                          </Button>

                          {status === "ATIVO" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(atualizandoCatalogoId)}
                              onClick={() => atualizarStatusCatalogo(item, "INATIVAR")}
                              className="rounded-xl border-yellow-200 text-yellow-800 hover:bg-yellow-50"
                            >
                              {atualizandoCatalogoId === `${id}-INATIVAR` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Inativar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(atualizandoCatalogoId)}
                              onClick={() => atualizarStatusCatalogo(item, "REATIVAR")}
                              className="rounded-xl border-green-200 text-green-800 hover:bg-green-50"
                            >
                              {atualizandoCatalogoId === `${id}-REATIVAR` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Reativar
                            </Button>
                          )}

                          <Button
                            size="sm"
                            disabled={Boolean(atualizandoCatalogoId)}
                            onClick={() => atualizarStatusCatalogo(item, "EXCLUIR")}
                            className="rounded-xl bg-red-900 text-white hover:bg-red-950"
                          >
                            {atualizandoCatalogoId === `${id}-EXCLUIR` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Excluir
                          </Button>
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
                      className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1.35fr_1.45fr_0.8fr_0.9fr_1.25fr]"
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

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Ações
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {ativo ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(atualizandoColaboradorId)}
                              onClick={() => atualizarStatusColaborador(colaborador, "INATIVAR")}
                              className="rounded-xl border-yellow-200 text-yellow-800 hover:bg-yellow-50"
                            >
                              {atualizandoColaboradorId === `${String(colaborador.id)}-INATIVAR` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Inativar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(atualizandoColaboradorId)}
                              onClick={() => atualizarStatusColaborador(colaborador, "REATIVAR")}
                              className="rounded-xl border-green-200 text-green-800 hover:bg-green-50"
                            >
                              {atualizandoColaboradorId === `${String(colaborador.id)}-REATIVAR` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Reativar
                            </Button>
                          )}

                          <Button
                            size="sm"
                            disabled={Boolean(atualizandoColaboradorId)}
                            onClick={() => atualizarStatusColaborador(colaborador, "EXCLUIR")}
                            className="rounded-xl bg-red-900 text-white hover:bg-red-950"
                          >
                            {atualizandoColaboradorId === `${String(colaborador.id)}-EXCLUIR` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Excluir
                          </Button>
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

  function renderizarDispositivos() {
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

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Pendentes
              </p>
              <p className="mt-2 text-3xl font-black text-yellow-700">
                {formatarNumero(dispositivos.filter((item) => statusDispositivo(item.status) === "PENDENTE").length)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                aguardando autorização
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Aprovados
              </p>
              <p className="mt-2 text-3xl font-black text-green-700">
                {formatarNumero(dispositivos.filter((item) => statusDispositivo(item.status) === "APROVADO").length)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                liberados para usar o app
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Bloqueados
              </p>
              <p className="mt-2 text-3xl font-black text-red-800">
                {formatarNumero(dispositivos.filter((item) => statusDispositivo(item.status) === "BLOQUEADO").length)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                impedidos de acessar
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black text-zinc-800">
              <ShieldCheck className="h-5 w-5 text-red-900" />
              Dispositivos autorizados
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Aprove ou bloqueie os celulares que solicitaram acesso ao aplicativo SafeScan.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Buscar
                </label>
                <Input
                  value={buscaDispositivo}
                  onChange={(event) => setBuscaDispositivo(event.target.value)}
                  placeholder="E-mail, aparelho, ID ou plataforma"
                  className="mt-2 h-10 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Status
                </label>
                <select
                  value={filtroStatusDispositivo}
                  onChange={(event) => setFiltroStatusDispositivo(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PENDENTE">Pendentes</option>
                  <option value="APROVADO">Aprovados</option>
                  <option value="BLOQUEADO">Bloqueados</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={carregarDispositivos}
                  disabled={carregandoDispositivos}
                  className="h-10 rounded-xl border-red-200 font-bold text-red-900"
                >
                  {carregandoDispositivos ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Atualizar
                </Button>
              </div>
            </div>

            {carregandoDispositivos ? (
              <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-5 text-sm font-bold text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin text-red-900" />
                Carregando dispositivos...
              </div>
            ) : dispositivosFiltrados.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-5 text-sm font-semibold text-zinc-500">
                Nenhum dispositivo encontrado. Quando o aplicativo pedir autorização, ele aparecerá aqui.
              </div>
            ) : (
              <div className="grid gap-3">
                {dispositivosFiltrados.map((dispositivo, index) => {
                  const id = String(dispositivo.id ?? "");
                  const status = statusDispositivo(dispositivo.status);
                  const carregandoAcao = atualizandoDispositivoId === id;

                  return (
                    <div
                      key={id || `${String(dispositivo.dispositivo_id ?? "sem-id")}-${index}`}
                      className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 xl:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_1.2fr]"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Usuário
                        </p>
                        <p className="mt-1 break-all font-black text-red-950">
                          {String(dispositivo.usuario_email ?? "E-mail não informado")}
                        </p>
                        <p className="mt-1 break-all text-xs font-semibold text-zinc-500">
                          {String(dispositivo.usuario_id ?? "")}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Dispositivo
                        </p>
                        <p className="mt-1 font-black text-zinc-900">
                          {String(dispositivo.dispositivo_nome ?? "Aparelho não informado")}
                        </p>
                        <p className="mt-1 break-all text-xs font-semibold text-zinc-500">
                          {String(dispositivo.dispositivo_id ?? "ID não informado")}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Plataforma
                        </p>
                        <p className="mt-1 font-black text-zinc-900">
                          {String(dispositivo.plataforma ?? "android")}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Status
                        </p>
                        <Badge className={`mt-1 ${classeBadgeDispositivo(status)}`}>
                          {status}
                        </Badge>
                        <p className="mt-2 text-xs font-medium text-zinc-500">
                          Criado: {formatarDataCampo(dispositivo.created_at)}
                        </p>
                        <p className="text-xs font-medium text-zinc-500">
                          Último acesso: {formatarDataCampo(dispositivo.ultimo_acesso_em)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                        <Button
                          size="sm"
                          disabled={carregandoAcao || status === "APROVADO" || !id}
                          onClick={() => atualizarStatusDispositivo(id, "APROVADO")}
                          className="rounded-xl bg-green-700 text-white hover:bg-green-800"
                        >
                          {carregandoAcao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Aprovar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={carregandoAcao || status === "PENDENTE" || !id}
                          onClick={() => atualizarStatusDispositivo(id, "PENDENTE")}
                          className="rounded-xl border-yellow-200 text-yellow-900 hover:bg-yellow-50"
                        >
                          Pendente
                        </Button>

                        <Button
                          size="sm"
                          disabled={carregandoAcao || status === "BLOQUEADO" || !id}
                          onClick={() => atualizarStatusDispositivo(id, "BLOQUEADO")}
                          className="rounded-xl bg-red-900 text-white hover:bg-red-950"
                        >
                          Bloquear
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
    if (telaAtiva === "catalogo") return renderizarCatalogo();
    if (telaAtiva === "colaboradores") return renderizarColaboradores();
    if (telaAtiva === "dispositivos") return renderizarDispositivos();
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