import { prisma } from "@antares/database";
import { Router } from "express";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { asyncHandler } from "../../support/async-handler.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get(
  "/operations",
  requirePermission("relatorios:view"),
  asyncHandler(async (request, response) => {
    const [operations, industrial] = await Promise.all([
      buildOperationsReport(request.auth!.companyId),
      buildIndustrialReport(request.auth!.companyId)
    ]);
    response.json({ ...operations, industrial });
  })
);

reportsRouter.get(
  "/operations.csv",
  requirePermission("relatorios:export"),
  asyncHandler(async (request, response) => {
    const [operations, industrial] = await Promise.all([
      buildOperationsReport(request.auth!.companyId),
      buildIndustrialReport(request.auth!.companyId)
    ]);
    const report = { ...operations, industrial };
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=antares-relatorio-operacional.csv");
    response.send(toOperationsCsv(report));
  })
);

async function buildOperationsReport(companyId: string) {
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [balances, movements, expiringBatches, payable, receivable] = await Promise.all([
    prisma.stockBalance.findMany({
      where: { companyId },
      include: { product: true, warehouse: true, batch: true },
      orderBy: { updatedAt: "desc" },
      take: 50
    }),
    prisma.stockMovement.findMany({
      where: { companyId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.batch.findMany({
      where: {
        product: { companyId },
        deletedAt: null,
        expiresAt: { gte: now, lte: in90Days }
      },
      include: { product: true },
      orderBy: { expiresAt: "asc" },
      take: 25
    }),
    prisma.accountPayable.aggregate({
      where: { companyId, status: "OPEN", deletedAt: null },
      _sum: { amount: true },
      _count: true
    }),
    prisma.accountReceivable.aggregate({
      where: { companyId, status: "OPEN", deletedAt: null },
      _sum: { amount: true },
      _count: true
    })
  ]);

  const stockValue = balances.reduce((total, balance) => {
    return total + Number(balance.quantity) * Number(balance.product.averageCost);
  }, 0);

  return {
    generatedAt: new Date().toISOString(),
    stock: {
      totalItems: balances.length,
      estimatedValue: stockValue,
      balances
    },
    expirations: expiringBatches,
    finance: {
      payableOpen: payable._sum.amount ?? 0,
      payableCount: payable._count,
      receivableOpen: receivable._sum.amount ?? 0,
      receivableCount: receivable._count
    },
    movements
  };
}

async function buildIndustrialReport(companyId: string) {
  const [
    assets,
    maintenanceOpen,
    maintenanceOrders,
    toolLoansOpen,
    toolLoans,
    ppeDeliveries,
    productionOpen,
    productionOrders,
    pendingRequisitions
  ] = await Promise.all([
    prisma.asset.count({ where: { companyId, deletedAt: null } }),
    prisma.maintenanceOrder.count({ where: { companyId, status: { not: "CLOSED" }, deletedAt: null } }),
    prisma.maintenanceOrder.findMany({
      where: { companyId, deletedAt: null },
      include: { asset: true, parts: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.toolLoan.count({ where: { companyId, status: "OPEN" } }),
    prisma.toolLoan.findMany({
      where: { companyId },
      include: { tool: true, employee: true },
      orderBy: { loanedAt: "desc" },
      take: 25
    }),
    prisma.employeePpeDelivery.findMany({
      where: { employee: { companyId, deletedAt: null } },
      include: { employee: true },
      orderBy: { deliveredAt: "desc" },
      take: 25
    }),
    prisma.productionOrder.count({ where: { companyId, status: "OPEN", deletedAt: null } }),
    prisma.productionOrder.findMany({
      where: { companyId, deletedAt: null },
      include: { finishedProduct: true, warehouse: true },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.warehouseRequisition.count({
      where: { companyId, status: { in: ["PENDING_APPROVAL", "APPROVED"] }, deletedAt: null }
    })
  ]);

  const ppeProductIds = ppeDeliveries.map((delivery) => delivery.productId).filter((id): id is string => Boolean(id));
  const ppeProducts = await prisma.product.findMany({
    where: { id: { in: ppeProductIds }, companyId },
    select: { id: true, internalCode: true, description: true }
  });
  const productById = new Map(ppeProducts.map((product) => [product.id, product]));

  return {
    assets,
    maintenanceOpen,
    toolLoansOpen,
    productionOpen,
    pendingRequisitions,
    maintenanceOrders,
    toolLoans,
    ppeDeliveries: ppeDeliveries.map((delivery) => ({
      ...delivery,
      product: delivery.productId ? productById.get(delivery.productId) ?? null : null
    })),
    productionOrders
  };
}

function toOperationsCsv(report: Awaited<ReturnType<typeof buildOperationsReport>> & { industrial: Awaited<ReturnType<typeof buildIndustrialReport>> }) {
  const rows = [
    ["secao", "codigo", "descricao", "estoque", "quantidade", "valor", "data"],
    ...report.stock.balances.map((balance) => [
      "saldo",
      balance.product.internalCode,
      balance.product.description,
      balance.warehouse.name,
      Number(balance.quantity).toString(),
      (Number(balance.quantity) * Number(balance.product.averageCost)).toFixed(2),
      balance.updatedAt.toISOString()
    ]),
    ...report.expirations.map((batch) => [
      "validade",
      batch.number,
      batch.product.description,
      "",
      "",
      "",
      batch.expiresAt?.toISOString() ?? ""
    ]),
    ["financeiro", "contas_a_pagar", "", "", report.finance.payableCount.toString(), Number(report.finance.payableOpen).toFixed(2), report.generatedAt],
    ["financeiro", "contas_a_receber", "", "", report.finance.receivableCount.toString(), Number(report.finance.receivableOpen).toFixed(2), report.generatedAt],
    ...report.industrial.maintenanceOrders.map((order) => [
      "manutencao",
      order.number,
      `${order.asset.name} - ${order.description}`,
      "",
      order.parts.length.toString(),
      "",
      order.createdAt.toISOString()
    ]),
    ...report.industrial.productionOrders.map((order) => [
      "producao",
      order.number,
      order.finishedProduct.description,
      order.warehouse.name,
      Number(order.plannedQuantity).toString(),
      "",
      order.createdAt.toISOString()
    ]),
    ...report.industrial.toolLoans.map((loan) => [
      "ferramentas",
      loan.tool.code,
      `${loan.tool.name} - ${loan.borrower}`,
      "",
      loan.status,
      "",
      loan.loanedAt.toISOString()
    ]),
    ...report.industrial.ppeDeliveries.map((delivery) => [
      "epi",
      delivery.caNumber,
      `${delivery.employee.name} - ${delivery.product?.description ?? ""}`,
      "",
      Number(delivery.quantity).toString(),
      "",
      delivery.deliveredAt.toISOString()
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
