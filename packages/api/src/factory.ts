import { postgresCapabilities } from '../../compiler/src/index.js';
import {
  createTenantContext,
  InMemoryStoreAdapter,
  InMemoryTenantRepository,
  parseTenantId,
  type StoreAdapter,
  TenantGuard,
  TenantManager,
  type TenantRepository,
} from '../../tenant/src/index.js';
import { AuthService } from './auth.js';
import { QueryExecutionService } from './executor.js';
import { KillSwitch } from './kill-switch.js';
import { UsageTracker } from './limits.js';
import { ProjectService } from './project-service.js';
import { ApiRouter } from './router.js';

export interface ColtaneApiSystem {
  authService: AuthService;
  tenantRepository: TenantRepository;
  tenantManager: TenantManager;
  projectService: ProjectService;
  storeAdapter: StoreAdapter;
  tenantGuard: TenantGuard;
  killSwitch: KillSwitch;
  usageTracker: UsageTracker;
  executionService: QueryExecutionService;
  router: ApiRouter;
}

export function createColtaneApi(options: {
  storeAdapter?: StoreAdapter;
  tenantRepository?: TenantRepository;
  initialKillSwitch?: boolean;
} = {}): ColtaneApiSystem {
  const authService = new AuthService();
  const tenantRepository = options.tenantRepository ?? new InMemoryTenantRepository();
  const storeAdapter = options.storeAdapter ?? new InMemoryStoreAdapter(postgresCapabilities);

  const tenantManager = new TenantManager(
    tenantRepository,
    {
      provision: async (ctx) => {
        await storeAdapter.connect(ctx);
      },
    },
  );

  const projectService = new ProjectService(tenantManager, authService);

  const tenantGuard = new TenantGuard(storeAdapter, async (tenantId) => {
    const record = await tenantRepository.find(parseTenantId(tenantId));
    if (!record) return undefined;
    return createTenantContext(record.tenantId, record.state);
  });

  const killSwitch = new KillSwitch(options.initialKillSwitch ?? false);
  const usageTracker = new UsageTracker();
  const executionService = new QueryExecutionService(tenantGuard, killSwitch, usageTracker);

  const router = new ApiRouter(
    authService,
    projectService,
    executionService,
    killSwitch,
    usageTracker,
  );

  return {
    authService,
    tenantRepository,
    tenantManager,
    projectService,
    storeAdapter,
    tenantGuard,
    killSwitch,
    usageTracker,
    executionService,
    router,
  };
}
