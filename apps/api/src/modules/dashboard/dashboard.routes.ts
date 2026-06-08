import { prisma } from "@antares/database";
import { Router } from "express";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { asyncHandler } from "../../support/async-handler.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requirePermission("dashboard:view"));

dashboardRouter.get(
  "/summary",
  asyncHandler(async (request, response) => {
    const companyId = request.auth!.companyId;
    const [
      products,
      productRows,
      expiredBatches,
      payableOpen,
      receivableOpen,
      recentMovements,
      suppliers,
      customers,
      warehouses,
      purchaseOrders,
      salesOrders,
      cashSessions,
      warehouseRequisitions,
      productionOpen,
      maintenanceOpen,
      toolLoansOpen,
      pendingRequisitions,
      openCashSessions,
      industrialAlerts
    ] =
      await Promise.all([
        prisma.product.count({ where: { companyId, deletedAt: null } }),
        prisma.product.findMany({
          where: { companyId, deletedAt: null },
          select: { minimumStock: true, stockBalances: { select: { quantity: true } } }
        }),
        prisma.batch.count({
          where: {
            product: { companyId },
            expiresAt: { lt: new Date() },
            deletedAt: null
          }
        }),
        prisma.accountPayable.aggregate({
          where: { companyId, status: "OPEN", deletedAt: null },
          _sum: { amount: true }
        }),
        prisma.accountReceivable.aggregate({
          where: { companyId, status: "OPEN", deletedAt: null },
          _sum: { amount: true }
        }),
        prisma.stockMovement.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { items: { include: { product: true } } }
        }),
        prisma.supplier.count({ where: { companyId, deletedAt: null } }),
        prisma.customer.count({ where: { companyId, deletedAt: null } }),
        prisma.warehouse.count({ where: { companyId, deletedAt: null } }),
        prisma.purchaseOrder.count({ where: { companyId, deletedAt: null } }),
        prisma.salesOrder.count({ where: { companyId, deletedAt: null } }),
        prisma.cashSession.count({ where: { register: { companyId } } }),
        prisma.warehouseRequisition.count({ where: { companyId, deletedAt: null } }),
        prisma.productionOrder.count({ where: { companyId, status: "OPEN", deletedAt: null } }),
        prisma.maintenanceOrder.count({ where: { companyId, status: { not: "CLOSED" }, deletedAt: null } }),
        prisma.toolLoan.count({ where: { companyId, status: "OPEN" } }),
        prisma.warehouseRequisition.count({ where: { companyId, status: { in: ["PENDING_APPROVAL", "APPROVED"] }, deletedAt: null } }),
        prisma.cashSession.count({ where: { status: "OPEN", register: { companyId } } }),
        Promise.all([
          prisma.productionOrder.findMany({
            where: { companyId, status: "OPEN", deletedAt: null },
            include: { finishedProduct: true },
            orderBy: { createdAt: "desc" },
            take: 3
          }),
          prisma.maintenanceOrder.findMany({
            where: { companyId, status: { not: "CLOSED" }, deletedAt: null },
            include: { asset: true },
            orderBy: { createdAt: "desc" },
            take: 3
          }),
          prisma.toolLoan.findMany({
            where: { companyId, status: "OPEN" },
            include: { tool: true },
            orderBy: { loanedAt: "desc" },
            take: 3
          }),
          prisma.warehouseRequisition.findMany({
            where: { companyId, status: { in: ["PENDING_APPROVAL", "APPROVED"] }, deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 3
          })
        ])
      ]);

    const lowStock = productRows.filter((product) => {
      const total = product.stockBalances.reduce((sum, balance) => sum + Number(balance.quantity), 0);
      return total <= Number(product.minimumStock);
    }).length;

    response.json({
      products,
      lowStock,
      expiredBatches,
      payableOpen: payableOpen._sum.amount ?? 0,
      receivableOpen: receivableOpen._sum.amount ?? 0,
      modules: [
        { key: "catalog", label: "Cadastros", count: suppliers + customers },
        { key: "inventory", label: "Estoque", count: warehouses },
        { key: "purchasing", label: "Compras", count: purchaseOrders },
        { key: "sales", label: "Vendas", count: salesOrders },
        { key: "cash", label: "Caixa", count: cashSessions },
        { key: "warehouse", label: "Almoxarifado", count: warehouseRequisitions },
        { key: "production", label: "Producao", count: productionOpen },
        { key: "maintenance", label: "Manutencao", count: maintenanceOpen },
        { key: "finance", label: "Financeiro", count: Number(payableOpen._sum.amount ?? 0) + Number(receivableOpen._sum.amount ?? 0) }
      ],
      industrial: {
        productionOpen,
        maintenanceOpen,
        toolLoansOpen,
        pendingRequisitions,
        openCashSessions,
        alerts: [
          ...industrialAlerts[0].map((order) => ({ type: "Producao", label: `${order.number} - ${order.finishedProduct.description}`, status: order.status })),
          ...industrialAlerts[1].map((order) => ({ type: "Manutencao", label: `${order.number} - ${order.asset.name}`, status: order.status })),
          ...industrialAlerts[2].map((loan) => ({ type: "Ferramenta", label: `${loan.tool.code} - ${loan.borrower}`, status: loan.status })),
          ...industrialAlerts[3].map((requisition) => ({ type: "Almoxarifado", label: `${requisition.requester} - ${requisition.department}`, status: requisition.status }))
        ]
      },
      recentMovements
    });
  })
);
