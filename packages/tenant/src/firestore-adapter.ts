import { documentCapabilities, type Capabilities, type ParameterBinding, type PlanStep } from '@coltanedb/compiler';
import type { TenantContext } from './context.js';
import type { StoreAdapter } from './store-adapter.js';

export interface FirestoreDocumentRef {
  set(data: Record<string, unknown>): Promise<void>;
  get(): Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
  delete(): Promise<void>;
}

export interface FirestoreCollectionRef {
  doc(id: string): FirestoreDocumentRef;
  get(): Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>;
}

export interface FirestoreClient {
  collection(path: string): FirestoreCollectionRef;
}

export class InMemoryFirestoreClient implements FirestoreClient {
  private readonly docs = new Map<string, Record<string, unknown>>();

  collection(path: string): FirestoreCollectionRef {
    return {
      doc: (id: string): FirestoreDocumentRef => {
        const fullPath = `${path}/${id}`;
        return {
          set: async (data: Record<string, unknown>) => {
            this.docs.set(fullPath, structuredClone(data));
          },
          get: async () => {
            const data = this.docs.get(fullPath);
            return {
              exists: data !== undefined,
              data: () => (data ? structuredClone(data) : undefined),
            };
          },
          delete: async () => {
            this.docs.delete(fullPath);
          },
        };
      },
      get: async () => {
        const prefix = `${path}/`;
        const matched: Array<{ id: string; data: () => Record<string, unknown> }> = [];
        for (const [k, v] of this.docs.entries()) {
          if (k.startsWith(prefix)) {
            const id = k.slice(prefix.length);
            matched.push({ id, data: () => structuredClone(v) });
          }
        }
        return { docs: matched };
      },
    };
  }
}

export class FirestoreStoreAdapter implements StoreAdapter {
  readonly capabilities: Readonly<Capabilities>;

  constructor(
    private readonly client: FirestoreClient,
    capabilities: Readonly<Capabilities> = documentCapabilities,
  ) {
    this.capabilities = capabilities;
  }

  private collectionPath(tenantId: string, collection: string): string {
    return `tenants/${tenantId}/c/${collection}/d`;
  }

  async connect(context: TenantContext): Promise<void> {
    void context;
  }

  async healthCheck(context: TenantContext): Promise<boolean> {
    void context;
    try {
      this.client.collection('healthcheck');
      return true;
    } catch {
      return false;
    }
  }

  async execute(
    step: PlanStep,
    context: TenantContext,
    parameters?: Readonly<Record<string, unknown>>,
  ): Promise<unknown> {
    if (step.backend !== ('firestore' as string)) {
      throw new Error(`Unsupported backend ${step.backend} for FirestoreStoreAdapter`);
    }

    const colPath = this.collectionPath(context.tenantId, step.collection);
    const colRef = this.client.collection(colPath);

    switch (step.operation) {
      case 'record.put':
      case 'record.create': {
        const id = this.resolveKey(step, parameters);
        const payload = this.resolvePayload(step, parameters);
        const docRef = colRef.doc(id);
        await docRef.set({ ...payload, id });
        return { created: true, id, record: payload };
      }

      case 'record.delete': {
        const id = this.resolveKey(step, parameters);
        const docRef = colRef.doc(id);
        await docRef.delete();
        return { deleted: 1 };
      }

      case 'query': {
        const snapshot = await colRef.get();
        return snapshot.docs.map((d) => d.data());
      }

      default:
        throw new Error(`Unsupported operation '${step.operation}' for FirestoreStoreAdapter`);
    }
  }

  async apply(change: unknown, context: TenantContext): Promise<void> {
    void change;
    void context;
  }

  async rebuild(collection: string, context: TenantContext): Promise<void> {
    void collection;
    void context;
  }

  async usage(context: TenantContext): Promise<{ rows: number; bytes: number }> {
    void context;
    return { rows: 0, bytes: 0 };
  }

  private resolveKey(step: PlanStep, parameters?: Readonly<Record<string, unknown>>): string {
    const paramBinding = step.params?.find((p) => p.name === 'id' || p.name === 'key');
    if (paramBinding?.name && parameters?.[paramBinding.name] !== undefined) {
      return String(parameters[paramBinding.name]);
    }
    if (paramBinding?.value !== undefined) {
      return String(paramBinding.value);
    }
    return 'default';
  }

  private resolvePayload(step: PlanStep, parameters?: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const binding of step.params ?? []) {
      if (binding.kind === 'parameter' && binding.name && parameters?.[binding.name] !== undefined) {
        result[binding.name] = parameters[binding.name];
      } else if (binding.value !== undefined) {
        result[binding.name ?? 'val'] = binding.value;
      }
    }
    return result;
  }
}
