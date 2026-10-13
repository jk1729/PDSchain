import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccountStatus, AuthenticatedPrincipal, CanonicalRole } from './rbac.types';

export interface WarehouseScopeTarget {
  warehouseCode: string;
  districtCode?: string | null;
}

export interface ShopScopeTarget {
  shopCode: string;
  districtCode?: string | null;
}

@Injectable()
export class RbacPolicyService {
  isAccountActiveAndVerified(principal: AuthenticatedPrincipal | null | undefined): boolean {
    if (!principal) {
      return false;
    }
    return principal.status === AccountStatus.ACTIVE && principal.emailVerified;
  }

  hasRole(principal: AuthenticatedPrincipal | null | undefined, role: CanonicalRole): boolean {
    if (!this.isAccountActiveAndVerified(principal) || !principal) {
      return false;
    }
    return principal.assignments.some((a) => a.role === role);
  }

  hasAnyRole(
    principal: AuthenticatedPrincipal | null | undefined,
    allowedRoles: readonly CanonicalRole[],
  ): boolean {
    if (!this.isAccountActiveAndVerified(principal) || !principal) {
      return false;
    }
    if (allowedRoles.length === 0) {
      return false;
    }
    return principal.assignments.some((a) => allowedRoles.includes(a.role));
  }

  canAccessDistrict(
    principal: AuthenticatedPrincipal | null | undefined,
    districtCode: string,
  ): boolean {
    if (!this.isAccountActiveAndVerified(principal) || !principal) {
      return false;
    }
    const targetDistrict = districtCode.trim().toUpperCase();
    if (!targetDistrict) {
      return false;
    }

    return principal.assignments.some((assignment) => {
      if (assignment.role === CanonicalRole.ADMIN) {
        return true;
      }
      if (assignment.role === CanonicalRole.DISTRICT_OFFICER) {
        return assignment.districtCode?.toUpperCase() === targetDistrict;
      }
      return false;
    });
  }

  canAccessWarehouse(
    principal: AuthenticatedPrincipal | null | undefined,
    target: WarehouseScopeTarget,
  ): boolean {
    if (!this.isAccountActiveAndVerified(principal) || !principal) {
      return false;
    }
    const targetWarehouse = target.warehouseCode.trim().toUpperCase();
    const targetDistrict = target.districtCode ? target.districtCode.trim().toUpperCase() : null;
    if (!targetWarehouse) {
      return false;
    }

    return principal.assignments.some((assignment) => {
      if (assignment.role === CanonicalRole.ADMIN) {
        return true;
      }
      if (assignment.role === CanonicalRole.WAREHOUSE_MANAGER) {
        const warehouseMatches = assignment.warehouseCode?.toUpperCase() === targetWarehouse;
        const districtMatches =
          !targetDistrict || assignment.districtCode?.toUpperCase() === targetDistrict;
        return warehouseMatches && districtMatches;
      }
      if (assignment.role === CanonicalRole.DISTRICT_OFFICER && targetDistrict) {
        return assignment.districtCode?.toUpperCase() === targetDistrict;
      }
      return false;
    });
  }

  canAccessShop(
    principal: AuthenticatedPrincipal | null | undefined,
    target: ShopScopeTarget,
  ): boolean {
    if (!this.isAccountActiveAndVerified(principal) || !principal) {
      return false;
    }
    const targetShop = target.shopCode.trim().toUpperCase();
    const targetDistrict = target.districtCode ? target.districtCode.trim().toUpperCase() : null;
    if (!targetShop) {
      return false;
    }

    return principal.assignments.some((assignment) => {
      if (assignment.role === CanonicalRole.ADMIN) {
        return true;
      }
      if (assignment.role === CanonicalRole.FPS_OPERATOR) {
        const shopMatches = assignment.shopCode?.toUpperCase() === targetShop;
        const districtMatches =
          !targetDistrict || assignment.districtCode?.toUpperCase() === targetDistrict;
        return shopMatches && districtMatches;
      }
      if (assignment.role === CanonicalRole.DISTRICT_OFFICER && targetDistrict) {
        return assignment.districtCode?.toUpperCase() === targetDistrict;
      }
      return false;
    });
  }

  assertDistrictAccess(principal: AuthenticatedPrincipal, districtCode: string): void {
    if (!this.canAccessDistrict(principal, districtCode)) {
      throw new ForbiddenException({
        code: 'SCOPE_ACCESS_DENIED',
        message: `You are not authorized to access district scope ${districtCode}.`,
      });
    }
  }

  assertWarehouseAccess(principal: AuthenticatedPrincipal, target: WarehouseScopeTarget): void {
    if (!this.canAccessWarehouse(principal, target)) {
      throw new ForbiddenException({
        code: 'SCOPE_ACCESS_DENIED',
        message: `You are not authorized to access warehouse scope ${target.warehouseCode}.`,
      });
    }
  }

  assertShopAccess(principal: AuthenticatedPrincipal, target: ShopScopeTarget): void {
    if (!this.canAccessShop(principal, target)) {
      throw new ForbiddenException({
        code: 'SCOPE_ACCESS_DENIED',
        message: `You are not authorized to access fair price shop scope ${target.shopCode}.`,
      });
    }
  }
}
