import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { SessionAuthGuard } from '../rbac/session-auth.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentUser, Roles } from '../rbac/decorators';
import { AuthenticatedPrincipal, CanonicalRole } from '../rbac/rbac.types';
import { RegisterCommodityDto } from './dto/register-commodity.dto';
import { RegisterBeneficiaryDto } from './dto/register-beneficiary.dto';
import { SetEntitlementDto } from './dto/set-entitlement.dto';
import { WarehouseReceiptDto } from './dto/warehouse-receipt.dto';
import { WarehouseTransferDto } from './dto/warehouse-transfer.dto';
import { RecordDistributionDto } from './dto/record-distribution.dto';

@Controller('distribution')
@UseGuards(SessionAuthGuard, RolesGuard)
export class DistributionController {
  constructor(private readonly blockchainService: BlockchainService) {}

  // ---------------------------------------------------------------------------
  // Commodities
  // ---------------------------------------------------------------------------
  @Get('commodities')
  async listCommodities() {
    const commodities = await this.blockchainService.listCommodities();
    return { commodities };
  }

  @Post('commodities')
  @Roles(CanonicalRole.ADMIN)
  async registerCommodity(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: RegisterCommodityDto,
  ) {
    return this.blockchainService.registerCommodity(
      principal.userId,
      dto.commodityId,
      dto.name,
      dto.unit,
    );
  }

  // ---------------------------------------------------------------------------
  // Beneficiaries
  // ---------------------------------------------------------------------------
  @Get('beneficiaries/:ref')
  async getBeneficiary(@Param('ref') ref: string) {
    const beneficiary = await this.blockchainService.getBeneficiary(ref);
    return { beneficiary };
  }

  @Post('beneficiaries')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER)
  async registerBeneficiary(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: RegisterBeneficiaryDto,
  ) {
    // If district officer, enforce assigned district
    if (!principal.roles.includes(CanonicalRole.ADMIN)) {
      const authorizedDistricts = principal.assignments
        .filter((a) => a.role === CanonicalRole.DISTRICT_OFFICER && a.districtCode)
        .map((a) => a.districtCode);
      if (!authorizedDistricts.includes(dto.districtCode)) {
        throw new ForbiddenException(
          `You are not authorized for district scope: ${dto.districtCode}`,
        );
      }
    }

    return this.blockchainService.registerBeneficiary(
      principal.userId,
      dto.beneficiaryRef,
      dto.districtCode,
    );
  }

  // ---------------------------------------------------------------------------
  // Monthly Entitlements
  // ---------------------------------------------------------------------------
  @Get('entitlements')
  async getEntitlement(
    @Query('ref') ref: string,
    @Query('period') periodStr: string,
    @Query('commodityId') commodityId: string,
  ) {
    const period = Number(periodStr) || 202610;
    const entitlement = await this.blockchainService.getEntitlement(
      ref,
      period,
      commodityId || 'COMMODITY:RICE',
    );
    return { entitlement };
  }

  @Post('entitlements')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.DISTRICT_OFFICER)
  async setEntitlement(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: SetEntitlementDto,
  ) {
    return this.blockchainService.setMonthlyEntitlement(
      principal.userId,
      dto.beneficiaryRef,
      dto.period,
      dto.commodityId,
      dto.allocatedQuantity,
    );
  }

  // ---------------------------------------------------------------------------
  // Warehouse Inventory
  // ---------------------------------------------------------------------------
  @Get('inventory/warehouse/:warehouseId')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.WAREHOUSE_MANAGER)
  async getWarehouseStock(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('warehouseId') warehouseId: string,
    @Query('commodityId') commodityId = 'COMMODITY:RICE',
  ) {
    this.assertWarehouseScope(principal, warehouseId);
    const stock = await this.blockchainService.getWarehouseStock(warehouseId, commodityId);
    return { warehouseId, commodityId, stock };
  }

  @Post('inventory/warehouse/receipt')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.WAREHOUSE_MANAGER)
  async receiveWarehouseStock(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: WarehouseReceiptDto,
  ) {
    this.assertWarehouseScope(principal, dto.warehouseId);
    return this.blockchainService.receiveWarehouseStock(
      principal.userId,
      dto.warehouseId,
      dto.commodityId,
      dto.quantity,
      dto.batchReference,
    );
  }

  @Post('inventory/warehouse/transfer')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.WAREHOUSE_MANAGER)
  async transferStockToFps(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: WarehouseTransferDto,
  ) {
    this.assertWarehouseScope(principal, dto.warehouseId);
    return this.blockchainService.transferStockToFps(
      principal.userId,
      dto.warehouseId,
      dto.fpsId,
      dto.commodityId,
      dto.quantity,
      dto.transferReference,
    );
  }

  // ---------------------------------------------------------------------------
  // FPS Inventory & Ration Distribution
  // ---------------------------------------------------------------------------
  @Get('inventory/fps/:fpsId')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.FPS_OPERATOR)
  async getFpsStock(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('fpsId') fpsId: string,
    @Query('commodityId') commodityId = 'COMMODITY:RICE',
  ) {
    this.assertFpsScope(principal, fpsId);
    const stock = await this.blockchainService.getFpsStock(fpsId, commodityId);
    return { fpsId, commodityId, stock };
  }

  @Post('distribute')
  @Roles(CanonicalRole.ADMIN, CanonicalRole.FPS_OPERATOR)
  async recordDistribution(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: RecordDistributionDto,
  ) {
    this.assertFpsScope(principal, dto.fpsId);
    return this.blockchainService.recordDistribution(
      principal.userId,
      dto.fpsId,
      dto.beneficiaryRef,
      dto.period,
      dto.commodityId,
      dto.quantity,
      dto.claimRef,
    );
  }

  // ---------------------------------------------------------------------------
  // Ledger & Transactions History
  // ---------------------------------------------------------------------------
  @Get('transactions')
  async listTransactions(@Query('entityId') entityId?: string) {
    const transactions = await this.blockchainService.getTransactions(50, entityId);
    return { transactions };
  }

  // ---------------------------------------------------------------------------
  // Private Scope Helpers
  // ---------------------------------------------------------------------------
  private assertWarehouseScope(principal: AuthenticatedPrincipal, warehouseId: string): void {
    if (principal.roles.includes(CanonicalRole.ADMIN)) return;

    const authorized = principal.assignments.some(
      (a) => a.role === CanonicalRole.WAREHOUSE_MANAGER && a.warehouseCode === warehouseId,
    );
    if (!authorized) {
      throw new ForbiddenException(
        `User is not authorized for warehouse assignment: ${warehouseId}`,
      );
    }
  }

  private assertFpsScope(principal: AuthenticatedPrincipal, fpsId: string): void {
    if (principal.roles.includes(CanonicalRole.ADMIN)) return;

    const authorized = principal.assignments.some(
      (a) => a.role === CanonicalRole.FPS_OPERATOR && a.shopCode === fpsId,
    );
    if (!authorized) {
      throw new ForbiddenException(`User is not authorized for FPS shop assignment: ${fpsId}`);
    }
  }
}
