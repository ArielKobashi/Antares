export type UUID = string;

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
};

export type Page<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type AuditFields = {
  createdAt: string;
  createdBy?: UUID | null;
  updatedAt?: string | null;
  updatedBy?: UUID | null;
  deletedAt?: string | null;
  deletedBy?: UUID | null;
};

export type CompanyScoped = {
  companyId: UUID;
};

export type StockMovementType =
  | "ENTRADA"
  | "SAIDA"
  | "TRANSFERENCIA"
  | "AJUSTE"
  | "PRODUCAO"
  | "CONSUMO_INTERNO"
  | "PERDA"
  | "AVARIA";

export type Money = number;

