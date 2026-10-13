import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AllocationStatus,
  ConfirmationStatus,
  DispatchStatus,
  InventoryLocationType,
  MovementDirection,
  Prisma,
  ReturnStatus,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { CreateFairPriceShopDto } from './dto/create-fps.dto';
import { UpdateFairPriceShopDto } from './dto/update-fps.dto';
import { CreateCommodityDto } from './dto/create-commodity.dto';
import { UpdateCommodityDto } from './dto/update-commodity.dto';
import { StockReceiptDto } from './dto/stock-receipt.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { ConfirmReceiptDto } from './dto/confirm-receipt.dto';
import { CreateStockReturnDto } from './dto/create-return.dto';
import { ConfirmStockReturnDto } from './dto/confirm-return.dto';
import { CreateStockAdjustmentDto } from './dto/create-adjustment.dto';

export interface CommodityLedgerBreakdown {
  commodityCode: string;
  inbound: Prisma.Decimal;
  outbound: Prisma.Decimal;
  adjustmentsAdd: Prisma.Decimal;
  adjustmentsSubtract: Prisma.Decimal;
  expectedBalance: Prisma.Decimal;
  actualBalance: Prisma.Decimal;
  drift: Prisma.Decimal;
  isReconciled: boolean;
  movementCount: number;
}

export interface ReconciliationReport {
  locationType: InventoryLocationType;
  locationCode: string;
  status: 'RECONCILED' | 'DISCREPANCY_DETECTED';
  totalCommoditiesTracked: number;
  timestamp: string;
  formula: string;
  commodities: CommodityLedgerBreakdown[];
  batchesCount: number;
  movementsCount: number;
}

function generateRef(prefix: string): string {
  const ts = Date.now();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ts}-${rand}`;
}

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedBaselineRegistry();
  }

  // ---------------------------------------------------------------------------
  // Baseline Seed / Idempotent Bootstrap
  // ---------------------------------------------------------------------------
  async seedBaselineRegistry(): Promise<void> {
    try {
      // 1. Districts
      const district = await this.prisma.district.upsert({
        where: { code: 'DIST-BLR-URBAN' },
        update: {},
        create: {
          code: 'DIST-BLR-URBAN',
          name: 'Bangalore Urban',
          state: 'Karnataka',
          isActive: true,
        },
      });

      await this.prisma.district.upsert({
        where: { code: 'DIST-PATNA' },
        update: {},
        create: {
          code: 'DIST-PATNA',
          name: 'Patna Central',
          state: 'Bihar',
          isActive: true,
        },
      });

      await this.prisma.district.upsert({
        where: { code: 'DIST-CENTRAL' },
        update: {},
        create: {
          code: 'DIST-CENTRAL',
          name: 'Central District',
          state: 'Karnataka',
          isActive: true,
        },
      });

      // 2. Warehouses
      const warehouse = await this.prisma.warehouse.upsert({
        where: { code: 'WH-KA-BLR-01' },
        update: {},
        create: {
          code: 'WH-KA-BLR-01',
          name: 'Central Warehouse Bangalore 01',
          districtId: district.id,
          districtCode: district.code,
          address: 'Plot 14, Yeshwanthpur Industrial Area, Bangalore',
          capacityMtl: new Prisma.Decimal(5000),
          isActive: true,
        },
      });

      // 3. Fair Price Shops
      await this.prisma.fairPriceShop.upsert({
        where: { code: 'FPS-KA-BLR-042' },
        update: {},
        create: {
          code: 'FPS-KA-BLR-042',
          name: 'Fair Price Shop 42 Indiranagar',
          districtId: district.id,
          districtCode: district.code,
          warehouseId: warehouse.id,
          warehouseCode: warehouse.code,
          address: '12th Main, 4th Cross, Indiranagar, Bangalore',
          isActive: true,
        },
      });

      // 4. Baseline Commodities
      const baselineCommodities = [
        {
          code: 'COMMODITY:RICE',
          name: 'Common Sona Masoori Rice',
          unit: 'KG',
          description: 'FCI Grade A Common Rice',
        },
        {
          code: 'COMMODITY:WHEAT',
          name: 'Atta Whole Wheat',
          unit: 'KG',
          description: 'Standard milling wheat flour',
        },
        {
          code: 'COMMODITY:SUGAR',
          name: 'Refined Crystal Sugar',
          unit: 'KG',
          description: 'Grade S-30 crystalline sugar',
        },
        {
          code: 'COMMODITY:KEROSENE',
          name: 'Subsidized Kerosene',
          unit: 'L',
          description: 'Domestic subsidized fuel',
        },
      ];

      for (const c of baselineCommodities) {
        await this.prisma.commodity.upsert({
          where: { code: c.code },
          update: {},
          create: {
            code: c.code,
            name: c.name,
            unit: c.unit,
            description: c.description,
            isActive: true,
          },
        });
      }

      this.logger.log('Baseline registry seeded successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Baseline registry seeding warning: ${msg}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Districts
  // ---------------------------------------------------------------------------
  async listDistricts() {
    return this.prisma.district.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            warehouses: true,
            shops: true,
          },
        },
      },
    });
  }

  async getDistrict(code: string) {
    const district = await this.prisma.district.findUnique({
      where: { code },
      include: {
        warehouses: true,
        shops: true,
      },
    });
    if (!district) {
      throw new NotFoundException(`District '${code}' not found`);
    }
    return district;
  }

  async createDistrict(dto: CreateDistrictDto) {
    const existing = await this.prisma.district.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`District with code '${dto.code}' already exists`);
    }
    return this.prisma.district.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        state: dto.state?.trim() || 'Karnataka',
        isActive: true,
      },
    });
  }

  async updateDistrict(code: string, dto: UpdateDistrictDto) {
    await this.getDistrict(code);
    return this.prisma.district.update({
      where: { code },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.state ? { state: dto.state.trim() } : {}),
        ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Warehouses
  // ---------------------------------------------------------------------------
  async listWarehouses(districtCode?: string) {
    return this.prisma.warehouse.findMany({
      where: districtCode ? { districtCode } : undefined,
      orderBy: { code: 'asc' },
      include: {
        district: { select: { code: true, name: true } },
        _count: { select: { servicedShops: true, batches: true } },
      },
    });
  }

  async getWarehouse(code: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { code },
      include: {
        district: true,
        servicedShops: true,
        batches: {
          include: { commodity: true },
        },
      },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse '${code}' not found`);
    }
    return warehouse;
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Warehouse '${dto.code}' already exists`);
    }
    const district = await this.getDistrict(dto.districtCode);

    return this.prisma.warehouse.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        districtId: district.id,
        districtCode: district.code,
        address: dto.address?.trim() || null,
        capacityMtl: dto.capacityMtl ? new Prisma.Decimal(dto.capacityMtl) : null,
        isActive: true,
      },
    });
  }

  async updateWarehouse(code: string, dto: UpdateWarehouseDto) {
    await this.getWarehouse(code);
    return this.prisma.warehouse.update({
      where: { code },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.capacityMtl !== undefined
          ? { capacityMtl: dto.capacityMtl ? new Prisma.Decimal(dto.capacityMtl) : null }
          : {}),
        ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Fair Price Shops (FPS)
  // ---------------------------------------------------------------------------
  async listFairPriceShops(districtCode?: string, warehouseCode?: string) {
    return this.prisma.fairPriceShop.findMany({
      where: {
        ...(districtCode ? { districtCode } : {}),
        ...(warehouseCode ? { warehouseCode } : {}),
      },
      orderBy: { code: 'asc' },
      include: {
        district: { select: { code: true, name: true } },
        designatedWarehouse: { select: { code: true, name: true } },
        _count: { select: { batches: true } },
      },
    });
  }

  async getFairPriceShop(code: string) {
    const fps = await this.prisma.fairPriceShop.findUnique({
      where: { code },
      include: {
        district: true,
        designatedWarehouse: true,
        batches: {
          include: { commodity: true },
        },
      },
    });
    if (!fps) {
      throw new NotFoundException(`Fair Price Shop '${code}' not found`);
    }
    return fps;
  }

  async createFairPriceShop(dto: CreateFairPriceShopDto) {
    const existing = await this.prisma.fairPriceShop.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Fair Price Shop '${dto.code}' already exists`);
    }
    const district = await this.getDistrict(dto.districtCode);

    let warehouseId: string | null = null;
    let warehouseCode: string | null = null;
    if (dto.warehouseCode) {
      const warehouse = await this.getWarehouse(dto.warehouseCode);
      warehouseId = warehouse.id;
      warehouseCode = warehouse.code;
    }

    return this.prisma.fairPriceShop.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        districtId: district.id,
        districtCode: district.code,
        warehouseId,
        warehouseCode,
        address: dto.address?.trim() || null,
        isActive: true,
      },
    });
  }

  async updateFairPriceShop(code: string, dto: UpdateFairPriceShopDto) {
    await this.getFairPriceShop(code);

    let warehouseId: string | null | undefined = undefined;
    let warehouseCode: string | null | undefined = undefined;
    if (dto.warehouseCode !== undefined) {
      if (dto.warehouseCode === null || dto.warehouseCode === '') {
        warehouseId = null;
        warehouseCode = null;
      } else {
        const wh = await this.getWarehouse(dto.warehouseCode);
        warehouseId = wh.id;
        warehouseCode = wh.code;
      }
    }

    return this.prisma.fairPriceShop.update({
      where: { code },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(warehouseId !== undefined ? { warehouseId, warehouseCode } : {}),
        ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Commodities
  // ---------------------------------------------------------------------------
  async listCommodities() {
    return this.prisma.commodity.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { batches: true, movements: true } },
      },
    });
  }

  async getCommodity(code: string) {
    const commodity = await this.prisma.commodity.findUnique({
      where: { code },
    });
    if (!commodity) {
      throw new NotFoundException(`Commodity '${code}' not found`);
    }
    return commodity;
  }

  async createCommodity(dto: CreateCommodityDto) {
    const existing = await this.prisma.commodity.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Commodity '${dto.code}' already exists`);
    }

    return this.prisma.commodity.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        unit: dto.unit.trim().toUpperCase(),
        description: dto.description?.trim() || null,
        isActive: true,
      },
    });
  }

  async updateCommodity(code: string, dto: UpdateCommodityDto) {
    await this.getCommodity(code);
    return this.prisma.commodity.update({
      where: { code },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.unit ? { unit: dto.unit.trim().toUpperCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Batches
  // ---------------------------------------------------------------------------
  async listBatches(
    locationType?: InventoryLocationType,
    locationCode?: string,
    commodityCode?: string,
  ) {
    return this.prisma.inventoryBatch.findMany({
      where: {
        ...(locationType ? { locationType } : {}),
        ...(locationCode ? { locationCode } : {}),
        ...(commodityCode ? { commodityCode } : {}),
      },
      include: {
        commodity: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBatch(id: string) {
    const batch = await this.prisma.inventoryBatch.findUnique({
      where: { id },
      include: {
        commodity: true,
        warehouse: true,
        fps: true,
      },
    });
    if (!batch) {
      throw new NotFoundException(`Batch '${id}' not found`);
    }
    return batch;
  }

  // ---------------------------------------------------------------------------
  // Stock Inward Receipt (at Warehouse)
  // ---------------------------------------------------------------------------
  async receiveInwardStock(actorUserId: string, dto: StockReceiptDto) {
    const warehouse = await this.getWarehouse(dto.warehouseCode);
    const commodity = await this.getCommodity(dto.commodityCode);
    const qtyDecimal = new Prisma.Decimal(dto.quantity);
    const receiptRef = dto.receiptRef?.trim() || generateRef('REC');

    return this.prisma.$transaction(async (tx) => {
      // Find or create batch
      let batch = await tx.inventoryBatch.findUnique({
        where: {
          locationType_locationCode_commodityId_batchNumber: {
            locationType: InventoryLocationType.WAREHOUSE,
            locationCode: warehouse.code,
            commodityId: commodity.id,
            batchNumber: dto.batchNumber.trim(),
          },
        },
      });

      if (batch) {
        batch = await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            currentQuantity: { increment: qtyDecimal },
            status: 'ACTIVE',
          },
        });
      } else {
        batch = await tx.inventoryBatch.create({
          data: {
            batchNumber: dto.batchNumber.trim(),
            commodityId: commodity.id,
            commodityCode: commodity.code,
            locationType: InventoryLocationType.WAREHOUSE,
            locationCode: warehouse.code,
            warehouseId: warehouse.id,
            initialQuantity: qtyDecimal,
            currentQuantity: qtyDecimal,
            unit: commodity.unit,
            receiptRef,
            status: 'ACTIVE',
          },
        });
      }

      // Append immutable stock movement
      const movement = await tx.stockMovement.create({
        data: {
          movementRef: generateRef('MOV-REC'),
          movementType: StockMovementType.RECEIPT_INWARD,
          locationType: InventoryLocationType.WAREHOUSE,
          locationCode: warehouse.code,
          commodityId: commodity.id,
          commodityCode: commodity.code,
          batchNumber: batch.batchNumber,
          quantity: qtyDecimal,
          direction: MovementDirection.IN,
          balanceAfter: batch.currentQuantity,
          sourceDocumentRef: receiptRef,
          actorUserId,
        },
      });

      return {
        batch,
        movement,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Stock Allocations
  // ---------------------------------------------------------------------------
  async listAllocations(warehouseCode?: string, fpsCode?: string, status?: AllocationStatus) {
    return this.prisma.stockAllocation.findMany({
      where: {
        ...(warehouseCode ? { sourceWarehouseCode: warehouseCode } : {}),
        ...(fpsCode ? { destinationFpsCode: fpsCode } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        commodity: true,
        sourceWarehouse: { select: { code: true, name: true } },
        destinationFps: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAllocation(actorUserId: string, dto: CreateAllocationDto) {
    const warehouse = await this.getWarehouse(dto.sourceWarehouseCode);
    const fps = await this.getFairPriceShop(dto.destinationFpsCode);
    const commodity = await this.getCommodity(dto.commodityCode);
    const allocatedDecimal = new Prisma.Decimal(dto.allocatedQuantity);

    // Verify warehouse has sufficient stock across batches
    const warehouseBatches = await this.prisma.inventoryBatch.findMany({
      where: {
        locationType: InventoryLocationType.WAREHOUSE,
        locationCode: warehouse.code,
        commodityId: commodity.id,
      },
    });

    const totalStock = warehouseBatches.reduce(
      (sum, b) => sum.add(b.currentQuantity),
      new Prisma.Decimal(0),
    );

    if (totalStock.lessThan(allocatedDecimal)) {
      throw new BadRequestException(
        `Insufficient warehouse stock: available ${totalStock.toString()} ${commodity.unit}, requested allocation ${dto.allocatedQuantity} ${commodity.unit}`,
      );
    }

    const allocationRef = dto.allocationRef?.trim() || generateRef('ALC');

    return this.prisma.stockAllocation.create({
      data: {
        allocationRef,
        sourceWarehouseId: warehouse.id,
        sourceWarehouseCode: warehouse.code,
        destinationFpsId: fps.id,
        destinationFpsCode: fps.code,
        commodityId: commodity.id,
        commodityCode: commodity.code,
        allocatedQuantity: allocatedDecimal,
        remainingQuantity: allocatedDecimal,
        period: dto.period || Number(new Date().toISOString().slice(0, 7).replace('-', '')),
        status: AllocationStatus.PENDING,
        createdById: actorUserId,
        approvedById: actorUserId,
        approvedAt: new Date(),
      },
      include: {
        commodity: true,
        sourceWarehouse: true,
        destinationFps: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Stock Dispatches (Atomic Concurrency Protected)
  // ---------------------------------------------------------------------------
  async listDispatches(warehouseCode?: string, fpsCode?: string, status?: DispatchStatus) {
    return this.prisma.stockDispatch.findMany({
      where: {
        ...(warehouseCode ? { sourceWarehouseCode: warehouseCode } : {}),
        ...(fpsCode ? { destinationFpsCode: fpsCode } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        commodity: true,
        sourceWarehouse: { select: { code: true, name: true } },
        destinationFps: { select: { code: true, name: true } },
        confirmations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDispatch(actorUserId: string, dto: CreateDispatchDto) {
    const warehouse = await this.getWarehouse(dto.sourceWarehouseCode);
    const fps = await this.getFairPriceShop(dto.destinationFpsCode);
    const commodity = await this.getCommodity(dto.commodityCode);
    const dispatchQtyDecimal = new Prisma.Decimal(dto.dispatchedQuantity);
    const dispatchRef = dto.dispatchRef?.trim() || generateRef('DSP');

    return this.prisma.$transaction(async (tx) => {
      // Find source batch at warehouse
      const batch = await tx.inventoryBatch.findUnique({
        where: {
          locationType_locationCode_commodityId_batchNumber: {
            locationType: InventoryLocationType.WAREHOUSE,
            locationCode: warehouse.code,
            commodityId: commodity.id,
            batchNumber: dto.batchNumber.trim(),
          },
        },
      });

      if (!batch) {
        throw new NotFoundException(
          `Batch '${dto.batchNumber}' not found at warehouse '${warehouse.code}'`,
        );
      }

      if (batch.currentQuantity.lessThan(dispatchQtyDecimal)) {
        throw new BadRequestException(
          `Insufficient batch stock: batch has ${batch.currentQuantity.toString()} ${commodity.unit}, requested dispatch ${dto.dispatchedQuantity}`,
        );
      }

      // Atomic conditional decrement to protect against negative balance & race conditions
      const updatedBatch = await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: { decrement: dispatchQtyDecimal },
        },
      });

      if (updatedBatch.currentQuantity.isNegative()) {
        throw new BadRequestException(
          'Negative balance constraint violated during concurrent dispatch',
        );
      }

      // If allocationId provided, update allocation tracking
      if (dto.allocationId) {
        const allocation = await tx.stockAllocation.findUnique({
          where: { id: dto.allocationId },
        });

        if (allocation) {
          const newDispatched = allocation.dispatchedQuantity.add(dispatchQtyDecimal);
          const newRemaining = Prisma.Decimal.max(
            new Prisma.Decimal(0),
            allocation.allocatedQuantity.sub(newDispatched),
          );
          const newStatus = newRemaining.isZero()
            ? AllocationStatus.COMPLETED
            : AllocationStatus.PARTIALLY_DISPATCHED;

          await tx.stockAllocation.update({
            where: { id: allocation.id },
            data: {
              dispatchedQuantity: newDispatched,
              remainingQuantity: newRemaining,
              status: newStatus,
            },
          });
        }
      }

      // Create StockDispatch
      const dispatch = await tx.stockDispatch.create({
        data: {
          dispatchRef,
          allocationId: dto.allocationId || null,
          sourceWarehouseId: warehouse.id,
          sourceWarehouseCode: warehouse.code,
          destinationFpsId: fps.id,
          destinationFpsCode: fps.code,
          commodityId: commodity.id,
          commodityCode: commodity.code,
          batchNumber: batch.batchNumber,
          dispatchedQuantity: dispatchQtyDecimal,
          status: DispatchStatus.DISPATCHED,
          dispatchedById: actorUserId,
        },
      });

      // Append immutable outward stock movement
      const movement = await tx.stockMovement.create({
        data: {
          movementRef: generateRef('MOV-DSP'),
          movementType: StockMovementType.DISPATCH_OUTWARD,
          locationType: InventoryLocationType.WAREHOUSE,
          locationCode: warehouse.code,
          commodityId: commodity.id,
          commodityCode: commodity.code,
          batchNumber: batch.batchNumber,
          quantity: dispatchQtyDecimal,
          direction: MovementDirection.OUT,
          balanceAfter: updatedBatch.currentQuantity,
          sourceDocumentRef: dispatchRef,
          actorUserId,
        },
      });

      return {
        dispatch,
        updatedBatch,
        movement,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Receipt Confirmation (at Fair Price Shop)
  // ---------------------------------------------------------------------------
  async listReceiptConfirmations(fpsCode?: string) {
    return this.prisma.receiptConfirmation.findMany({
      where: fpsCode ? { destinationFpsCode: fpsCode } : undefined,
      include: {
        destinationFps: { select: { code: true, name: true } },
        dispatch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmReceipt(actorUserId: string, dispatchId: string, dto: ConfirmReceiptDto) {
    const confirmationRef = dto.confirmationRef?.trim() || generateRef('CFM');
    const receivedQty = new Prisma.Decimal(dto.receivedQuantity);
    const shortageQty = new Prisma.Decimal(dto.shortageQuantity ?? 0);
    const excessQty = new Prisma.Decimal(dto.excessQuantity ?? 0);
    const damagedQty = new Prisma.Decimal(dto.damagedQuantity ?? 0);

    return this.prisma.$transaction(async (tx) => {
      const dispatch = await tx.stockDispatch.findUnique({
        where: { id: dispatchId },
        include: { destinationFps: true, commodity: true },
      });

      if (!dispatch) {
        throw new NotFoundException(`Stock dispatch '${dispatchId}' not found`);
      }

      if (dispatch.status === DispatchStatus.DELIVERED) {
        throw new BadRequestException('Dispatch has already been confirmed and delivered');
      }

      // Check sum equality: received + shortage + damaged == dispatched (or allow recorded excess)
      const totalAccounted = receivedQty.add(shortageQty).add(damagedQty);
      if (!totalAccounted.equals(dispatch.dispatchedQuantity) && excessQty.isZero()) {
        throw new BadRequestException(
          `Accounting mismatch: Received (${receivedQty}) + Shortage (${shortageQty}) + Damaged (${damagedQty}) must equal Dispatched (${dispatch.dispatchedQuantity})`,
        );
      }

      const hasDiscrepancy = !shortageQty.isZero() || !damagedQty.isZero() || !excessQty.isZero();
      const status = hasDiscrepancy
        ? ConfirmationStatus.DISCREPANCY_FLAGGED
        : ConfirmationStatus.CONFIRMED;

      // Create ReceiptConfirmation
      const confirmation = await tx.receiptConfirmation.create({
        data: {
          confirmationRef,
          dispatchId: dispatch.id,
          dispatchRef: dispatch.dispatchRef,
          destinationFpsId: dispatch.destinationFpsId,
          destinationFpsCode: dispatch.destinationFpsCode,
          commodityId: dispatch.commodityId,
          commodityCode: dispatch.commodityCode,
          batchNumber: dispatch.batchNumber,
          receivedQuantity: receivedQty,
          shortageQuantity: shortageQty,
          excessQuantity: excessQty,
          damagedQuantity: damagedQty,
          discrepancyReason: dto.discrepancyReason?.trim() || null,
          status,
          confirmedById: actorUserId,
        },
      });

      // Update dispatch status
      await tx.stockDispatch.update({
        where: { id: dispatch.id },
        data: {
          receivedQuantity: receivedQty,
          status: DispatchStatus.DELIVERED,
        },
      });

      // Upsert batch at FPS
      const batchNumber = dispatch.batchNumber || 'BATCH-GENERAL';
      let fpsBatch = await tx.inventoryBatch.findUnique({
        where: {
          locationType_locationCode_commodityId_batchNumber: {
            locationType: InventoryLocationType.FPS,
            locationCode: dispatch.destinationFpsCode,
            commodityId: dispatch.commodityId,
            batchNumber,
          },
        },
      });

      if (fpsBatch) {
        fpsBatch = await tx.inventoryBatch.update({
          where: { id: fpsBatch.id },
          data: {
            currentQuantity: { increment: receivedQty },
            status: 'ACTIVE',
          },
        });
      } else {
        fpsBatch = await tx.inventoryBatch.create({
          data: {
            batchNumber,
            commodityId: dispatch.commodityId,
            commodityCode: dispatch.commodityCode,
            locationType: InventoryLocationType.FPS,
            locationCode: dispatch.destinationFpsCode,
            fpsId: dispatch.destinationFpsId,
            initialQuantity: receivedQty,
            currentQuantity: receivedQty,
            unit: dispatch.commodity.unit,
            receiptRef: confirmationRef,
            status: 'ACTIVE',
          },
        });
      }

      // Append immutable stock movement for FPS inward confirmation
      const movement = await tx.stockMovement.create({
        data: {
          movementRef: generateRef('MOV-CFM'),
          movementType: StockMovementType.RECEIPT_CONFIRMATION,
          locationType: InventoryLocationType.FPS,
          locationCode: dispatch.destinationFpsCode,
          commodityId: dispatch.commodityId,
          commodityCode: dispatch.commodityCode,
          batchNumber,
          quantity: receivedQty,
          direction: MovementDirection.IN,
          balanceAfter: fpsBatch.currentQuantity,
          sourceDocumentRef: confirmationRef,
          actorUserId,
        },
      });

      return {
        confirmation,
        fpsBatch,
        movement,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Stock Returns (FPS -> Warehouse)
  // ---------------------------------------------------------------------------
  async listReturns(fpsCode?: string, warehouseCode?: string, status?: ReturnStatus) {
    return this.prisma.stockReturn.findMany({
      where: {
        ...(fpsCode ? { sourceFpsCode: fpsCode } : {}),
        ...(warehouseCode ? { destinationWarehouseCode: warehouseCode } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        commodity: true,
        sourceFps: { select: { code: true, name: true } },
        destinationWarehouse: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStockReturn(actorUserId: string, dto: CreateStockReturnDto) {
    const fps = await this.getFairPriceShop(dto.sourceFpsCode);
    const warehouse = await this.getWarehouse(dto.destinationWarehouseCode);
    const commodity = await this.getCommodity(dto.commodityCode);
    const returnQtyDecimal = new Prisma.Decimal(dto.returnQuantity);
    const returnRef = dto.returnRef?.trim() || generateRef('RET');

    return this.prisma.$transaction(async (tx) => {
      // Find FPS batch: either specified batchNumber or first active batch with sufficient balance
      let fpsBatch = null;
      if (dto.batchNumber?.trim()) {
        fpsBatch = await tx.inventoryBatch.findUnique({
          where: {
            locationType_locationCode_commodityId_batchNumber: {
              locationType: InventoryLocationType.FPS,
              locationCode: fps.code,
              commodityId: commodity.id,
              batchNumber: dto.batchNumber.trim(),
            },
          },
        });
      } else {
        fpsBatch = await tx.inventoryBatch.findFirst({
          where: {
            locationType: InventoryLocationType.FPS,
            locationCode: fps.code,
            commodityId: commodity.id,
            currentQuantity: { gte: returnQtyDecimal },
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!fpsBatch) {
          fpsBatch = await tx.inventoryBatch.findFirst({
            where: {
              locationType: InventoryLocationType.FPS,
              locationCode: fps.code,
              commodityId: commodity.id,
              status: 'ACTIVE',
            },
            orderBy: { currentQuantity: 'desc' },
          });
        }
      }

      if (!fpsBatch || fpsBatch.currentQuantity.lessThan(returnQtyDecimal)) {
        throw new BadRequestException(
          `Insufficient stock at FPS '${fps.code}' to return ${dto.returnQuantity} ${commodity.unit}`,
        );
      }

      const batchNumber = fpsBatch.batchNumber;

      // Deduct from FPS batch
      const updatedFpsBatch = await tx.inventoryBatch.update({
        where: { id: fpsBatch.id },
        data: {
          currentQuantity: { decrement: returnQtyDecimal },
        },
      });

      // Create StockReturn as PENDING
      const stockReturn = await tx.stockReturn.create({
        data: {
          returnRef,
          sourceFpsId: fps.id,
          sourceFpsCode: fps.code,
          destinationWarehouseId: warehouse.id,
          destinationWarehouseCode: warehouse.code,
          commodityId: commodity.id,
          commodityCode: commodity.code,
          batchNumber,
          returnQuantity: returnQtyDecimal,
          reason: dto.reason.trim(),
          status: ReturnStatus.PENDING,
          returnedById: actorUserId,
        },
      });

      // Append immutable outward movement for FPS
      const movement = await tx.stockMovement.create({
        data: {
          movementRef: generateRef('MOV-RET-OUT'),
          movementType: StockMovementType.RETURN_OUTWARD,
          locationType: InventoryLocationType.FPS,
          locationCode: fps.code,
          commodityId: commodity.id,
          commodityCode: commodity.code,
          batchNumber,
          quantity: returnQtyDecimal,
          direction: MovementDirection.OUT,
          balanceAfter: updatedFpsBatch.currentQuantity,
          sourceDocumentRef: returnRef,
          actorUserId,
        },
      });

      return {
        stockReturn,
        updatedFpsBatch,
        movement,
      };
    });
  }

  async confirmStockReturn(actorUserId: string, returnId: string, dto: ConfirmStockReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const stockReturn = await tx.stockReturn.findUnique({
        where: { id: returnId },
        include: { destinationWarehouse: true, commodity: true },
      });

      if (!stockReturn) {
        throw new NotFoundException(`Stock return '${returnId}' not found`);
      }

      if (stockReturn.status !== ReturnStatus.PENDING) {
        throw new BadRequestException(
          `Stock return status is already '${stockReturn.status}', cannot confirm`,
        );
      }

      if (dto.status === 'REJECTED') {
        const updated = await tx.stockReturn.update({
          where: { id: returnId },
          data: {
            status: ReturnStatus.REJECTED,
            confirmedById: actorUserId,
            confirmedAt: new Date(),
          },
        });
        return { stockReturn: updated };
      }

      // If ACCEPTED (CONFIRMED), increment warehouse stock
      const batchNumber = stockReturn.batchNumber || 'BATCH-GENERAL';
      let whBatch = await tx.inventoryBatch.findUnique({
        where: {
          locationType_locationCode_commodityId_batchNumber: {
            locationType: InventoryLocationType.WAREHOUSE,
            locationCode: stockReturn.destinationWarehouseCode,
            commodityId: stockReturn.commodityId,
            batchNumber,
          },
        },
      });

      if (whBatch) {
        whBatch = await tx.inventoryBatch.update({
          where: { id: whBatch.id },
          data: {
            currentQuantity: { increment: stockReturn.returnQuantity },
          },
        });
      } else {
        whBatch = await tx.inventoryBatch.create({
          data: {
            batchNumber,
            commodityId: stockReturn.commodityId,
            commodityCode: stockReturn.commodityCode,
            locationType: InventoryLocationType.WAREHOUSE,
            locationCode: stockReturn.destinationWarehouseCode,
            warehouseId: stockReturn.destinationWarehouseId,
            initialQuantity: stockReturn.returnQuantity,
            currentQuantity: stockReturn.returnQuantity,
            unit: stockReturn.commodity.unit,
            receiptRef: stockReturn.returnRef,
            status: 'ACTIVE',
          },
        });
      }

      // Append immutable inward movement for Warehouse
      const movement = await tx.stockMovement.create({
        data: {
          movementRef: generateRef('MOV-RET-IN'),
          movementType: StockMovementType.RETURN_INWARD,
          locationType: InventoryLocationType.WAREHOUSE,
          locationCode: stockReturn.destinationWarehouseCode,
          commodityId: stockReturn.commodityId,
          commodityCode: stockReturn.commodityCode,
          batchNumber,
          quantity: stockReturn.returnQuantity,
          direction: MovementDirection.IN,
          balanceAfter: whBatch.currentQuantity,
          sourceDocumentRef: stockReturn.returnRef,
          actorUserId,
        },
      });

      const updated = await tx.stockReturn.update({
        where: { id: returnId },
        data: {
          status: ReturnStatus.CONFIRMED,
          confirmedById: actorUserId,
          confirmedAt: new Date(),
        },
      });

      return {
        stockReturn: updated,
        whBatch,
        movement,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Stock Adjustments
  // ---------------------------------------------------------------------------
  async listAdjustments(
    locationType?: InventoryLocationType,
    locationCode?: string,
    commodityCode?: string,
  ) {
    return this.prisma.stockAdjustment.findMany({
      where: {
        ...(locationType ? { locationType } : {}),
        ...(locationCode ? { locationCode } : {}),
        ...(commodityCode ? { commodityCode } : {}),
      },
      include: {
        commodity: true,
        actorUser: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStockAdjustment(actorUserId: string, dto: CreateStockAdjustmentDto) {
    const commodity = await this.getCommodity(dto.commodityCode);
    const locType = dto.locationType as InventoryLocationType;
    const batchNumber = dto.batchNumber?.trim() || 'BATCH-GENERAL';
    const changeDecimal = new Prisma.Decimal(dto.quantityChange);
    const adjustmentRef = dto.adjustmentRef?.trim() || generateRef('ADJ');

    return this.prisma.$transaction(async (tx) => {
      // Find batch
      let batch = await tx.inventoryBatch.findUnique({
        where: {
          locationType_locationCode_commodityId_batchNumber: {
            locationType: locType,
            locationCode: dto.locationCode,
            commodityId: commodity.id,
            batchNumber,
          },
        },
      });

      const previousBalance = batch ? batch.currentQuantity : new Prisma.Decimal(0);
      let resultingBalance: Prisma.Decimal;

      if (dto.adjustmentType === 'INCREASE') {
        resultingBalance = previousBalance.add(changeDecimal);
      } else {
        resultingBalance = previousBalance.sub(changeDecimal);
        if (resultingBalance.isNegative()) {
          throw new BadRequestException(
            `Adjustment cannot result in negative stock balance (current: ${previousBalance}, requested deduction: ${changeDecimal})`,
          );
        }
      }

      if (batch) {
        batch = await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { currentQuantity: resultingBalance },
        });
      } else {
        batch = await tx.inventoryBatch.create({
          data: {
            batchNumber,
            commodityId: commodity.id,
            commodityCode: commodity.code,
            locationType: locType,
            locationCode: dto.locationCode,
            initialQuantity: resultingBalance,
            currentQuantity: resultingBalance,
            unit: commodity.unit,
            receiptRef: adjustmentRef,
            status: 'ACTIVE',
          },
        });
      }

      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentRef,
          locationType: locType,
          locationCode: dto.locationCode,
          commodityId: commodity.id,
          commodityCode: commodity.code,
          batchNumber,
          adjustmentType: dto.adjustmentType,
          quantityChange: changeDecimal,
          previousBalance,
          resultingBalance,
          reasonCode: dto.reasonCode.trim(),
          explanation: dto.explanation.trim(),
          actorUserId,
        },
      });

      const movementType =
        dto.adjustmentType === 'INCREASE'
          ? StockMovementType.ADJUSTMENT_ADD
          : StockMovementType.ADJUSTMENT_SUBTRACT;
      const direction =
        dto.adjustmentType === 'INCREASE' ? MovementDirection.IN : MovementDirection.OUT;

      const movement = await tx.stockMovement.create({
        data: {
          movementRef: generateRef('MOV-ADJ'),
          movementType,
          locationType: locType,
          locationCode: dto.locationCode,
          commodityId: commodity.id,
          commodityCode: commodity.code,
          batchNumber,
          quantity: changeDecimal,
          direction,
          balanceAfter: resultingBalance,
          sourceDocumentRef: adjustmentRef,
          actorUserId,
        },
      });

      return {
        adjustment,
        batch,
        movement,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Stock Movements Ledger
  // ---------------------------------------------------------------------------
  async listStockMovements(
    locationType?: InventoryLocationType,
    locationCode?: string,
    commodityCode?: string,
    limit = 100,
  ) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(locationType ? { locationType } : {}),
        ...(locationCode ? { locationCode } : {}),
        ...(commodityCode ? { commodityCode } : {}),
      },
      include: {
        commodity: true,
        actorUser: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }

  // ---------------------------------------------------------------------------
  // Mathematical Stock Reconciliation Engine
  // ---------------------------------------------------------------------------
  async reconcileStock(
    locationType: InventoryLocationType,
    locationCode: string,
    commodityCode?: string,
  ): Promise<ReconciliationReport> {
    // 1. Physical Balance from Inventory Batches
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        locationType,
        locationCode,
        ...(commodityCode ? { commodityCode } : {}),
      },
      include: { commodity: true },
    });

    const physicalStockByCommodity = new Map<string, Prisma.Decimal>();
    for (const b of batches) {
      const cur = physicalStockByCommodity.get(b.commodityCode) ?? new Prisma.Decimal(0);
      physicalStockByCommodity.set(b.commodityCode, cur.add(b.currentQuantity));
    }

    // 2. Movements Ledger Analysis
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        locationType,
        locationCode,
        ...(commodityCode ? { commodityCode } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    const breakdownMap = new Map<string, CommodityLedgerBreakdown>();

    for (const m of movements) {
      if (!breakdownMap.has(m.commodityCode)) {
        breakdownMap.set(m.commodityCode, {
          commodityCode: m.commodityCode,
          inbound: new Prisma.Decimal(0),
          outbound: new Prisma.Decimal(0),
          adjustmentsAdd: new Prisma.Decimal(0),
          adjustmentsSubtract: new Prisma.Decimal(0),
          expectedBalance: new Prisma.Decimal(0),
          actualBalance: new Prisma.Decimal(0),
          drift: new Prisma.Decimal(0),
          isReconciled: true,
          movementCount: 0,
        });
      }

      const item = breakdownMap.get(m.commodityCode)!;
      item.movementCount += 1;

      switch (m.movementType) {
        case StockMovementType.RECEIPT_INWARD:
        case StockMovementType.RECEIPT_CONFIRMATION:
        case StockMovementType.RETURN_INWARD:
          item.inbound = item.inbound.add(m.quantity);
          break;
        case StockMovementType.DISPATCH_OUTWARD:
        case StockMovementType.RETURN_OUTWARD:
        case StockMovementType.DISTRIBUTION_DISPENSE:
          item.outbound = item.outbound.add(m.quantity);
          break;
        case StockMovementType.ADJUSTMENT_ADD:
          item.adjustmentsAdd = item.adjustmentsAdd.add(m.quantity);
          break;
        case StockMovementType.ADJUSTMENT_SUBTRACT:
          item.adjustmentsSubtract = item.adjustmentsSubtract.add(m.quantity);
          break;
      }
    }

    // Also include any commodities that have batches but no movements
    for (const [commCode, actualQty] of physicalStockByCommodity.entries()) {
      if (!breakdownMap.has(commCode)) {
        breakdownMap.set(commCode, {
          commodityCode: commCode,
          inbound: new Prisma.Decimal(0),
          outbound: new Prisma.Decimal(0),
          adjustmentsAdd: new Prisma.Decimal(0),
          adjustmentsSubtract: new Prisma.Decimal(0),
          expectedBalance: new Prisma.Decimal(0),
          actualBalance: actualQty,
          drift: actualQty,
          isReconciled: actualQty.isZero(),
          movementCount: 0,
        });
      }
    }

    const commodityReports: CommodityLedgerBreakdown[] = [];
    let overallReconciled = true;

    for (const [commCode, item] of breakdownMap.entries()) {
      const actualBalance = physicalStockByCommodity.get(commCode) ?? new Prisma.Decimal(0);
      item.actualBalance = actualBalance;

      // Formula: Expected = Inbound - Outbound + AdjustmentsAdd - AdjustmentsSubtract
      item.expectedBalance = item.inbound
        .sub(item.outbound)
        .add(item.adjustmentsAdd)
        .sub(item.adjustmentsSubtract);

      item.drift = item.actualBalance.sub(item.expectedBalance);
      item.isReconciled = item.drift.abs().lessThan(0.0001);

      if (!item.isReconciled) {
        overallReconciled = false;
      }

      commodityReports.push(item);
    }

    return {
      locationType,
      locationCode,
      status: overallReconciled ? 'RECONCILED' : 'DISCREPANCY_DETECTED',
      totalCommoditiesTracked: commodityReports.length,
      timestamp: new Date().toISOString(),
      formula: 'Expected balance = Inbound - Outbound + Adjustments(Add - Subtract)',
      commodities: commodityReports,
      batchesCount: batches.length,
      movementsCount: movements.length,
    };
  }
}
