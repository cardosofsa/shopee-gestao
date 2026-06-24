import type { ModuleKey } from '../config/modules';
import { useTenant } from '../contexts/TenantContext';

export function useModule(key: ModuleKey): boolean {
  const { isModuleEnabled } = useTenant();
  return isModuleEnabled(key);
}
