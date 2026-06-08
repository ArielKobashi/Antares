export const erpModules = [
  "dashboard",
  "estoque",
  "compras",
  "vendas",
  "financeiro",
  "caixa",
  "fiscal",
  "producao",
  "almoxarifado",
  "rh",
  "patrimonio",
  "manutencao",
  "crm",
  "logistica",
  "documentos",
  "relatorios",
  "administracao",
  "inteligencia-artificial"
] as const;

export type ErpModule = (typeof erpModules)[number];

export const moduleLabels: Record<ErpModule, string> = {
  dashboard: "Dashboard",
  estoque: "Estoque",
  compras: "Compras",
  vendas: "Vendas",
  financeiro: "Financeiro",
  caixa: "Caixa",
  fiscal: "Fiscal",
  producao: "Producao",
  almoxarifado: "Almoxarifado",
  rh: "RH",
  patrimonio: "Patrimonio",
  manutencao: "Manutencao",
  crm: "CRM",
  logistica: "Logistica",
  documentos: "Documentos",
  relatorios: "Relatorios",
  administracao: "Administracao",
  "inteligencia-artificial": "Antares IA"
};

