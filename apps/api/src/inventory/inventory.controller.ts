import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { SessionAuthGuard } from '../rbac/session-auth.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentUser, Roles } from '../rbac/decorators';
import { AuthenticatedPrincipal, CanonicalRole } from '../rbac/rbac.types';
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
import { ReconcileQueryDto } from './dto/reconcile-query.dto';
import {
  AllocationStatus,
  DispatchStatus,
  InventoryLocationType,
  ReturnStatus,
} from '@prisma/client';

@Controller('inventory')
@UseGuards(SessionAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ---------------------------------------------------------------------------
  // Districts
  // ---------------------------------------------------------------------------
  @Get('districts')
  async listDistricts() {
    const districts = await this.inventoryService.listDistricts();
    return { districts };
  }

  @Get('districts/:code')
  async getDistrict(@Param('code') code: string) {
    const district = await this.inventoryService.getDistrict(code);
    return { district };
  }

  @Post('districts')
  @Roles(CanonicalRole.ADMIN)
  async createDistrict(@Body() dto: CreateDistrictDto) {
    const district = await this.inventoryService.createDistrict(dto);
    return { district };
  }

  @Put('districts/:code')
  @Roles(CanonicalRole.ADMIN)
  async updateDistrict(@Param('code') code: string, @Body() dto: UpdateDistrictDto) {
    const district = await this.inventoryService.updateDistrict(code, dto);
    return { district };
  }

  // ---------------------------------------------------------------------------
  // Warehouses
  // ---------------------------------------------------------------------------
  @Get('warehouses')
  async listWarehouses(@Query('districtCode') districtCode?: string) {
    const warehouses = await this.inventoryService.listWarehouses(districtCode);
    return { warehouses };
  }

  @Get('warehouses/:code')
  async getWarehouse(@Param('code') code: string) {
    const warehouse = await this.inventoryService.getWarehouse(code);
    return { warehouse };
  }

  @Post('warehouses')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER)
  async createWarehouse(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateWarehouseDto,
  ) {
    this.assertDistrictScope(principal, dto.districtCode);
    const warehouse = await this.inventoryService.createWarehouse(dto);
    return { warehouse };
  }

  @Put('warehouses/:code')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER)
  async updateWarehouse(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('code') code: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    const existing = await this.inventoryService.getWarehouse(code);
    this.assertDistrictScope(principal, existing.districtCode);
    const warehouse = await this.inventoryService.updateWarehouse(code, dto);
    return { warehouse };
  }

  // ---------------------------------------------------------------------------
  // Fair Price Shops (FPS)
  // ---------------------------------------------------------------------------
  @Get('fps')
  async listFairPriceShops(
    @Query('districtCode') districtCode?: string,
    @Query('warehouseCode') warehouseCode?: string,
  ) {
    const shops = await this.inventoryService.listFairPriceShops(districtCode, warehouseCode);
    return { shops };
  }

  @Get('fps/:code')
  async getFairPriceShop(@Param('code') code: string) {
    const shop = await this.inventoryService.getFairPriceShop(code);
    return { shop };
  }

  @Post('fps')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER)
  async createFairPriceShop(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateFairPriceShopDto,
  ) {
    this.assertDistrictScope(principal, dto.districtCode);
    const shop = await this.inventoryService.createFairPriceShop(dto);
    return { shop };
  }

  @Put('fps/:code')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER)
  async updateFairPriceShop(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('code') code: string,
    @Body() dto: UpdateFairPriceShopDto,
  ) {
    const existing = await this.inventoryService.getFairPriceShop(code);
    this.assertDistrictScope(principal, existing.districtCode);
    const shop = await this.inventoryService.updateFairPriceShop(code, dto);
    return { shop };
  }

  // ---------------------------------------------------------------------------
  // Commodities
  // ---------------------------------------------------------------------------
  @Get('commodities')
  async listCommodities() {
    const commodities = await this.inventoryService.listCommodities();
    return { commodities };
  }

  @Get('commodities/:code')
  async getCommodity(@Param('code') code: string) {
    const commodity = await this.inventoryService.getCommodity(code);
    return { commodity };
  }

  @Post('commodities')
  @Roles(CanonicalRole.ADMIN)
  async createCommodity(@Body() dto: CreateCommodityDto) {
    const commodity = await this.inventoryService.createCommodity(dto);
    return { commodity };
  }

  @Put('commodities/:code')
  @Roles(CanonicalRole.ADMIN)
  async updateCommodity(@Param('code') code: string, @Body() dto: UpdateCommodityDto) {
    const commodity = await this.inventoryService.updateCommodity(code, dto);
    return { commodity };
  }

  // ---------------------------------------------------------------------------
  // Batches
  // ---------------------------------------------------------------------------
  @Get('batches')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async listBatches(
    @Query('locationType') locationType?: InventoryLocationType,
    @Query('locationCode') locationCode?: string,
    @Query('commodityCode') commodityCode?: string,
  ) {
    const batches = await this.inventoryService.listBatches(
      locationType,
      locationCode,
      commodityCode,
    );
    return { batches };
  }

  @Get('batches/:id')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async getBatch(@Param('id') id: string) {
    const batch = await this.inventoryService.getBatch(id);
    return { batch };
  }

  // ---------------------------------------------------------------------------
  // Inward Stock Receipts (at Warehouse)
  // ---------------------------------------------------------------------------
  @Post('receipts')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.WAREHOUSE_MANAGER)
  async receiveInwardStock(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: StockReceiptDto,
  ) {
    this.assertWarehouseScope(principal, dto.warehouseCode);
    const result = await this.inventoryService.receiveInwardStock(principal.userId, dto);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Stock Allocations
  // ---------------------------------------------------------------------------
  @Get('allocations')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async listAllocations(
    @Query('warehouseCode') warehouseCode?: string,
    @Query('fpsCode') fpsCode?: string,
    @Query('status') status?: AllocationStatus,
  ) {
    const allocations = await this.inventoryService.listAllocations(warehouseCode, fpsCode, status);
    return { allocations };
  }

  @Post('allocations')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER)
  async createAllocation(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateAllocationDto,
  ) {
    const allocation = await this.inventoryService.createAllocation(principal.userId, dto);
    return { allocation };
  }

  // ---------------------------------------------------------------------------
  // Dispatches
  // ---------------------------------------------------------------------------
  @Get('dispatches')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async listDispatches(
    @Query('warehouseCode') warehouseCode?: string,
    @Query('fpsCode') fpsCode?: string,
    @Query('status') status?: DispatchStatus,
  ) {
    const dispatches = await this.inventoryService.listDispatches(warehouseCode, fpsCode, status);
    return { dispatches };
  }

  @Post('dispatches')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.WAREHOUSE_MANAGER)
  async createDispatch(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateDispatchDto,
  ) {
    this.assertWarehouseScope(principal, dto.sourceWarehouseCode);
    const result = await this.inventoryService.createDispatch(principal.userId, dto);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Receipt Confirmation (at FPS)
  // ---------------------------------------------------------------------------
  @Get('confirmations')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async listReceiptConfirmations(@Query('fpsCode') fpsCode?: string) {
    const confirmations = await this.inventoryService.listReceiptConfirmations(fpsCode);
    return { confirmations };
  }

  @Post('confirmations/:dispatchId')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.FPS_OPERATOR)
  async confirmReceipt(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('dispatchId') dispatchId: string,
    @Body() dto: ConfirmReceiptDto,
  ) {
    // Look up dispatch destination FPS to check scope
    const dispatches = await this.inventoryService.listDispatches();
    const dispatch = dispatches.find((d) => d.id === dispatchId);
    if (dispatch) {
      this.assertFpsScope(principal, dispatch.destinationFpsCode);
    }
    const result = await this.inventoryService.confirmReceipt(principal.userId, dispatchId, dto);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Stock Returns (FPS -> Warehouse)
  // ---------------------------------------------------------------------------
  @Get('returns')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async listReturns(
    @Query('fpsCode') fpsCode?: string,
    @Query('warehouseCode') warehouseCode?: string,
    @Query('status') status?: ReturnStatus,
  ) {
    const returns = await this.inventoryService.listReturns(fpsCode, warehouseCode, status);
    return { returns };
  }

  @Post('returns')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.FPS_OPERATOR)
  async createStockReturn(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateStockReturnDto,
  ) {
    this.assertFpsScope(principal, dto.sourceFpsCode);
    const result = await this.inventoryService.createStockReturn(principal.userId, dto);
    return result;
  }

  @Post('returns/:returnId/confirm')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.WAREHOUSE_MANAGER)
  async confirmStockReturn(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('returnId') returnId: string,
    @Body() dto: ConfirmStockReturnDto,
  ) {
    const returns = await this.inventoryService.listReturns();
    const ret = returns.find((r) => r.id === returnId);
    if (ret) {
      this.assertWarehouseScope(principal, ret.destinationWarehouseCode);
    }
    const result = await this.inventoryService.confirmStockReturn(principal.userId, returnId, dto);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Stock Adjustments
  // ---------------------------------------------------------------------------
  @Get('adjustments')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async listAdjustments(
    @Query('locationType') locationType?: InventoryLocationType,
    @Query('locationCode') locationCode?: string,
    @Query('commodityCode') commodityCode?: string,
  ) {
    const adjustments = await this.inventoryService.listAdjustments(
      locationType,
      locationCode,
      commodityCode,
    );
    return { adjustments };
  }

  @Post('adjustments')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER, CanonicalRole.WAREHOUSE_MANAGER)
  async createAdjustment(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    if (dto.locationType === 'WAREHOUSE') {
      this.assertWarehouseScope(principal, dto.locationCode);
    } else if (dto.locationType === 'FPS') {
      this.assertFpsScope(principal, dto.locationCode);
    }
    const result = await this.inventoryService.createStockAdjustment(principal.userId, dto);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Stock Movements Ledger
  // ---------------------------------------------------------------------------
  @Get('movements')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async listMovements(
    @Query('locationType') locationType?: InventoryLocationType,
    @Query('locationCode') locationCode?: string,
    @Query('commodityCode') commodityCode?: string,
    @Query('limit') limit?: string,
  ) {
    const movements = await this.inventoryService.listStockMovements(
      locationType,
      locationCode,
      commodityCode,
      limit ? parseInt(limit, 10) : 100,
    );
    return { movements };
  }

  // ---------------------------------------------------------------------------
  // Mathematical Stock Reconciliation Engine
  // ---------------------------------------------------------------------------
  @Get('reconciliation')
  @Roles(
    CanonicalRole.ADMIN,
    CanonicalRole.DISTRICT_OFFICER,
    CanonicalRole.WAREHOUSE_MANAGER,
    CanonicalRole.FPS_OPERATOR,
  )
  async reconcileStock(@Query() query: ReconcileQueryDto) {
    const report = await this.inventoryService.reconcileStock(
      query.locationType as InventoryLocationType,
      query.locationCode,
      query.commodityCode,
    );
    return { report };
  }

  // ---------------------------------------------------------------------------
  // Scope Enforcement Helpers
  // ---------------------------------------------------------------------------
  private assertDistrictScope(principal: AuthenticatedPrincipal, districtCode: string): void {
    if (principal.roles.includes(CanonicalRole.ADMIN)) return;

    const authorized = principal.assignments.some(
      (a) => a.role === CanonicalRole.DISTRICT_OFFICER && a.districtCode === districtCode,
    );
    if (!authorized) {
      throw new ForbiddenException(`User is not authorized for district scope: ${districtCode}`);
    }
  }

  private assertWarehouseScope(principal: AuthenticatedPrincipal, warehouseCode: string): void {
    if (principal.roles.includes(CanonicalRole.ADMIN)) return;

    const authorized = principal.assignments.some(
      (a) => a.role === CanonicalRole.WAREHOUSE_MANAGER && a.warehouseCode === warehouseCode,
    );
    if (!authorized) {
      throw new ForbiddenException(
        `User is not authorized for warehouse assignment: ${warehouseCode}`,
      );
    }
  }

  private assertFpsScope(principal: AuthenticatedPrincipal, fpsCode: string): void {
    if (principal.roles.includes(CanonicalRole.ADMIN)) return;

    const authorized = principal.assignments.some(
      (a) => a.role === CanonicalRole.FPS_OPERATOR && a.shopCode === fpsCode,
    );
    if (!authorized) {
      throw new ForbiddenException(
        `User is not authorized for Fair Price Shop assignment: ${fpsCode}`,
      );
    }
  }
}
