import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

const modules = [
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
];

const actions = ["view", "create", "update", "delete", "approve", "export", "admin"];

async function main() {
  for (const module of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { code: `${module}:${action}` },
        update: {},
        create: {
          code: `${module}:${action}`,
          module,
          action,
          description: `${action} em ${module}`
        }
      });
    }
  }

  const company = await prisma.company.upsert({
    where: { document: "00000000000100" },
    update: {},
    create: {
      name: "Empresa Demonstracao",
      document: "00000000000100"
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "Administrador" } },
    update: {},
    create: {
      companyId: company.id,
      name: "Administrador"
    }
  });

  const permissions = await prisma.permission.findMany();
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    });
  }

  const user = await prisma.user.upsert({
    where: { email: "admin@antares.local" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@antares.local",
      passwordHash: hashPassword("admin123")
    }
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { roleId: adminRole.id },
    create: {
      userId: user.id,
      companyId: company.id,
      roleId: adminRole.id
    }
  });

  const unit = await prisma.unit.upsert({
    where: { companyId_code: { companyId: company.id, code: "UN" } },
    update: {},
    create: {
      companyId: company.id,
      code: "UN",
      name: "Unidade"
    }
  });

  const category =
    (await prisma.category.findFirst({
      where: { companyId: company.id, name: "Geral", parentId: null }
    })) ??
    (await prisma.category.create({
      data: {
        companyId: company.id,
        name: "Geral"
      }
    }));

  const demoProduct = await prisma.product.upsert({
    where: { companyId_internalCode: { companyId: company.id, internalCode: "15.365.2" } },
    update: {},
    create: {
      companyId: company.id,
      internalCode: "15.365.2",
      description: "Produto demonstracao",
      categoryId: category.id,
      unitId: unit.id,
      minimumStock: 10,
      salePrice: 25
    }
  });

  const gloves = await prisma.product.upsert({
    where: { companyId_internalCode: { companyId: company.id, internalCode: "EPI-LUVA-P" } },
    update: {},
    create: {
      companyId: company.id,
      internalCode: "EPI-LUVA-P",
      description: "Luva nitrilica P",
      categoryId: category.id,
      unitId: unit.id,
      minimumStock: 50,
      averageCost: 2.5,
      salePrice: 4.9
    }
  });

  const mask = await prisma.product.upsert({
    where: { companyId_internalCode: { companyId: company.id, internalCode: "EPI-MASC-01" } },
    update: {},
    create: {
      companyId: company.id,
      internalCode: "EPI-MASC-01",
      description: "Mascara descartavel",
      categoryId: category.id,
      unitId: unit.id,
      minimumStock: 100,
      averageCost: 0.8,
      salePrice: 1.5
    }
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "ALM" } },
    update: {},
    create: {
      companyId: company.id,
      code: "ALM",
      name: "Almoxarifado Central"
    }
  });

  for (const item of [
    { productId: demoProduct.id, quantity: 20 },
    { productId: gloves.id, quantity: 180 },
    { productId: mask.id, quantity: 320 }
  ]) {
    const existing = await prisma.stockBalance.findFirst({
      where: { productId: item.productId, warehouseId: warehouse.id, locationId: null, batchId: null }
    });
    if (existing) {
      await prisma.stockBalance.update({ where: { id: existing.id }, data: { quantity: item.quantity } });
    } else {
      await prisma.stockBalance.create({
        data: {
          companyId: company.id,
          productId: item.productId,
          warehouseId: warehouse.id,
          quantity: item.quantity
        }
      });
    }
  }

  await prisma.supplier.upsert({
    where: { companyId_document: { companyId: company.id, document: "11222333000144" } },
    update: {},
    create: {
      companyId: company.id,
      document: "11222333000144",
      legalName: "Fornecedor Industrial Demo",
      contacts: "compras@fornecedor.demo",
      rating: 5
    }
  });

  const customer = await prisma.customer.upsert({
    where: { companyId_document: { companyId: company.id, document: "12345678000190" } },
    update: {},
    create: {
      companyId: company.id,
      document: "12345678000190",
      name: "Cliente Demonstracao",
      contacts: "financeiro@cliente.demo",
      creditLimit: 5000
    }
  });

  await prisma.cashRegister.create({
    data: {
      companyId: company.id,
      name: "Caixa Principal"
    }
  });

  await prisma.accountPayable.create({
    data: {
      companyId: company.id,
      supplierName: "Fornecedor Industrial Demo",
      category: "Compras",
      amount: 450,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.accountReceivable.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      customerName: customer.name,
      amount: 275,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      history: "Titulo demonstrativo"
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
