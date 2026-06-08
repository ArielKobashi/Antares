import cors from "cors";
import express from "express";
import morgan from "morgan";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { cashRouter } from "./modules/cash/cash.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { companyRouter } from "./modules/companies/company.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { financeRouter } from "./modules/finance/finance.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { maintenanceRouter } from "./modules/maintenance/maintenance.routes.js";
import { productionRouter } from "./modules/production/production.routes.js";
import { purchasingRouter } from "./modules/purchasing/purchasing.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { salesRouter } from "./modules/sales/sales.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { warehouseRouter } from "./modules/warehouse/warehouse.routes.js";
import { errorHandler } from "./support/error-handler.js";
import { env } from "./support/env.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "antares-api" });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/audit", auditRouter);
  app.use("/api/v1/cash", cashRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/companies", companyRouter);
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/catalog", catalogRouter);
  app.use("/api/v1/inventory", inventoryRouter);
  app.use("/api/v1/maintenance", maintenanceRouter);
  app.use("/api/v1/production", productionRouter);
  app.use("/api/v1/purchasing", purchasingRouter);
  app.use("/api/v1/sales", salesRouter);
  app.use("/api/v1/warehouse", warehouseRouter);
  app.use("/api/v1/finance", financeRouter);
  app.use("/api/v1/reports", reportsRouter);

  app.use(errorHandler);

  return app;
}
