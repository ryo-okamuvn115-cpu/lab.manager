import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  getPasswordResetRedirectUrl,
  getSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { buildInventoryLocation } from '@/lib/types';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryItemDraft,
  InventoryLocationFieldValue,
  InventorySupplier,
  LabSnapshot,
  Order,
  OrderDraft,
  OrderItem,
  OrderStatus,
  Protocol,
  ProtocolDifficulty,
  ProtocolDraft,
  ProtocolStep,
  SnapshotEvent,
  StorageLocation,
  StorageLocationDetailField,
  StorageLocationDraft,
  WorkspaceAccess,
  WorkspaceRole,
} from '@/lib/types';

interface InventoryRow {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  min_quantity: number;
  expiry_date: string | null;
  supplier: InventorySupplier;
  location: string;
  location_preset?: string | null;
  location_field_values?: unknown;
  location_detail?: string | null;
  location_image_path?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  items: unknown;
  total_amount: number;
  status: OrderStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ProtocolRow {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: unknown;
  estimated_time: string;
  difficulty: ProtocolDifficulty;
  created_at: string;
  updated_at: string;
}

interface StorageLocationRow {
  id: string;
  name: string;
  details: string;
  detail_fields?: unknown;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkspaceMemberRow {
  email: string;
  role: WorkspaceRole | null;
}

interface AuthCredentials {
  email: string;
  password: string;
}

interface SignUpResult {
  session: Session | null;
  user: User | null;
  needsEmailConfirmation: boolean;
  isExistingUser: boolean;
}

const INVENTORY_LOCATION_IMAGE_BUCKET = 'inventory-location-images';

function getClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase の接続情報が未設定です。`.env.local` に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。',
    );
  }

  return getSupabaseClient();
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getFileExtension(fileName: string) {
  const parts = fileName.split('.');
  const extension = parts.at(-1)?.trim().toLowerCase();
  return extension && extension !== fileName.toLowerCase() ? extension : 'jpg';
}

function getInventoryLocationImageUrl(path: string) {
  const client = getClient();
  const { data } = client.storage.from(INVENTORY_LOCATION_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : fallback;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';

  if (message.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }

  if (message.includes('Email not confirmed')) {
    return 'メール確認がまだ完了していません。確認メールのリンクを開いてからログインしてください。';
  }

  if (message.includes('User already registered')) {
    return 'このメールアドレスは登録されています。ログインするか、パスワード再設定を使ってください。';
  }

  if (code === '42501' || message.toLowerCase().includes('row-level security')) {
    return 'このメールアドレスはまだ研究室メンバーとして許可されていません。管理者に `workspace_members` への追加を依頼してください。';
  }

  if (code === 'PGRST205' || message.includes('Could not find the table')) {
    return 'Supabase のテーブル設定が未完了です。`supabase/schema.sql` または `supabase/add_admin_storage_locations.sql` を実行してください。';
  }

  if (
    message.includes('storage_locations')
    || message.includes('role')
    || message.includes('is_workspace_admin')
    || message.includes('detail_options')
    || message.includes('detail_fields')
  ) {
    return '管理者画面用の設定がまだ Supabase に追加されていません。`supabase/add_admin_storage_locations.sql` または `supabase/add_storage_location_detail_fields.sql` を実行してください。';
  }

  if (
    code === 'PGRST204'
    || message.includes('location_preset')
    || message.includes('location_detail')
    || message.includes('location_image_path')
    || message.includes('location_field_values')
  ) {
    return '保管場所の新しい項目がまだ Supabase に追加されていません。`supabase/add_storage_location_detail_fields.sql` を実行してください。';
  }

  if (message.includes('Bucket not found') || message.includes('inventory-location-images')) {
    return '保管場所の画像保存先がまだ作成されていません。`supabase/add_inventory_location_fields.sql` を実行してください。';
  }

  return message || fallback;
}

function isLikelyExistingSignupResult(user: User | null) {
  if (!user || !('identities' in user) || !Array.isArray(user.identities)) {
    return false;
  }

  return user.identities.length === 0;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeLocationFieldValues(value: unknown): InventoryLocationFieldValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Partial<InventoryLocationFieldValue>;
      const fieldId = typeof record.fieldId === 'string' ? record.fieldId.trim() : '';
      const fieldValue = typeof record.value === 'string' ? record.value.trim() : '';

      if (!fieldId || !fieldValue) {
        return null;
      }

      return {
        fieldId,
        value: fieldValue,
      } satisfies InventoryLocationFieldValue;
    })
    .filter((item): item is InventoryLocationFieldValue => item !== null);
}

function normalizeDetailFields(value: unknown): StorageLocationDetailField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Partial<StorageLocationDetailField>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const id =
        typeof record.id === 'string' && record.id.trim()
          ? record.id.trim()
          : createId('loc_field');

      if (!label) {
        return null;
      }

      const options = Array.isArray(record.options)
        ? Array.from(
            new Set(
              record.options
                .map((option) => (typeof option === 'string' ? option.trim() : ''))
                .filter(Boolean),
            ),
          )
        : [];

      return {
        id,
        label,
        options,
      } satisfies StorageLocationDetailField;
    })
    .filter((field): field is StorageLocationDetailField => field !== null);
}

function mapInventoryRow(row: InventoryRow): InventoryItem {
  const locationPreset = row.location_preset ?? '';
  const locationFieldValues = normalizeLocationFieldValues(row.location_field_values);
  const locationDetail =
    row.location_detail ?? (!locationPreset && row.location ? row.location : '');
  const location = row.location ?? buildInventoryLocation(locationPreset, locationFieldValues, locationDetail);
  const locationImagePath = row.location_image_path ?? '';

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: normalizeNumber(row.quantity),
    unit: row.unit,
    minQuantity: normalizeNumber(row.min_quantity),
    expiryDate: row.expiry_date,
    supplier: row.supplier ?? 'other',
    location,
    locationPreset,
    locationFieldValues,
    locationDetail,
    locationImagePath,
    locationImageUrl: locationImagePath ? getInventoryLocationImageUrl(locationImagePath) : null,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStorageLocationRow(row: StorageLocationRow): StorageLocation {
  return {
    id: row.id,
    name: row.name,
    details: row.details ?? '',
    detailFields: normalizeDetailFields(row.detail_fields),
    sortOrder: normalizeNumber(row.sort_order),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Partial<OrderItem>;
      const quantity = normalizeNumber(record.quantity);
      const unitPrice = normalizeNumber(record.unitPrice);
      const totalPrice = normalizeNumber(record.totalPrice, quantity * unitPrice);
      const itemName = typeof record.itemName === 'string' ? record.itemName : '';

      if (!itemName) {
        return null;
      }

      return {
        id: typeof record.id === 'string' ? record.id : createId(`order_item_${index + 1}`),
        itemName,
        quantity,
        unitPrice,
        totalPrice,
      } satisfies OrderItem;
    })
    .filter((item): item is OrderItem => item !== null);
}

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    items: mapOrderItems(row.items),
    totalAmount: normalizeNumber(row.total_amount),
    status: row.status,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProtocolSteps(steps: unknown): ProtocolStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step, index) => {
      if (!step || typeof step !== 'object') {
        return null;
      }

      const record = step as Partial<ProtocolStep>;
      const title = typeof record.title === 'string' ? record.title : '';
      const description = typeof record.description === 'string' ? record.description : '';

      if (!title || !description) {
        return null;
      }

      return {
        id: typeof record.id === 'string' ? record.id : createId(`protocol_step_${index + 1}`),
        stepNumber: normalizeNumber(record.stepNumber, index + 1),
        title,
        description,
        materials: Array.isArray(record.materials)
          ? record.materials.filter((material): material is string => typeof material === 'string')
          : [],
        duration: typeof record.duration === 'string' ? record.duration : '',
      } satisfies ProtocolStep;
    })
    .filter((step): step is ProtocolStep => step !== null);
}

function mapProtocolRow(row: ProtocolRow): Protocol {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description ?? '',
    steps: mapProtocolSteps(row.steps),
    estimatedTime: row.estimated_time ?? '',
    difficulty: row.difficulty,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSnapshotUpdatedAt(groups: Array<Array<{ updatedAt: string }>>) {
  const timestamps = groups.flatMap((items) => items.map((item) => item.updatedAt).filter(Boolean));

  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  );
}

function prepareInventoryPayload(payload: InventoryItemDraft) {
  const locationPreset = payload.locationPreset.trim();
  const locationFieldValues = normalizeLocationFieldValues(payload.locationFieldValues);
  const locationDetail = payload.locationDetail.trim();

  return {
    name: payload.name.trim(),
    category: payload.category,
    quantity: normalizeNumber(payload.quantity),
    unit: payload.unit.trim(),
    min_quantity: normalizeNumber(payload.minQuantity),
    expiry_date: payload.expiryDate.trim() || null,
    supplier: payload.supplier,
    location: buildInventoryLocation(locationPreset, locationFieldValues, locationDetail),
    location_preset: locationPreset,
    location_field_values: locationFieldValues,
    location_detail: locationDetail,
    location_image_path: payload.locationImagePath.trim(),
    notes: payload.notes.trim(),
  };
}

function prepareStorageLocationPayload(payload: StorageLocationDraft) {
  const detailFields = normalizeDetailFields(payload.detailFields);

  return {
    name: payload.name.trim(),
    details: payload.details.trim(),
    detail_fields: detailFields,
    sort_order: normalizeNumber(payload.sortOrder),
    is_active: payload.isActive,
  };
}

function prepareOrderItems(payload: OrderDraft) {
  return payload.items.map((item, index) => {
    const quantity = normalizeNumber(item.quantity);
    const unitPrice = normalizeNumber(item.unitPrice);

    return {
      id: createId(`order_item_${index + 1}`),
      itemName: item.itemName.trim(),
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
    } satisfies OrderItem;
  });
}

function prepareOrderPayload(payload: OrderDraft) {
  const items = prepareOrderItems(payload);

  return {
    order_number: payload.orderNumber.trim(),
    status: payload.status,
    notes: payload.notes.trim(),
    items,
    total_amount: items.reduce((sum, item) => sum + item.totalPrice, 0),
  };
}

function prepareProtocolPayload(payload: ProtocolDraft) {
  const steps = payload.steps.map((step, index) => ({
    id: createId(`protocol_step_${index + 1}`),
    stepNumber: index + 1,
    title: step.title.trim(),
    description: step.description.trim(),
    materials: step.materials.map((material) => material.trim()).filter(Boolean),
    duration: step.duration.trim(),
  }));

  return {
    title: payload.title.trim(),
    category: payload.category.trim(),
    description: payload.description.trim(),
    estimated_time: payload.estimatedTime.trim(),
    difficulty: payload.difficulty,
    steps,
  };
}

export const authAPI = {
  async getSession() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw new Error(getErrorMessage(error, 'ログイン状態を確認できませんでした。'));
    }

    return data.session;
  },

  async signIn(payload: AuthCredentials) {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: payload.email.trim(),
      password: payload.password,
    });

    if (error) {
      throw new Error(getErrorMessage(error, 'ログインできませんでした。'));
    }

    return data.session;
  },

  async signUp(payload: AuthCredentials): Promise<SignUpResult> {
    const client = getClient();
    const { data, error } = await client.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
    });

    if (error) {
      throw new Error(getErrorMessage(error, 'アカウントを作成できませんでした。'));
    }

    const isExistingUser = isLikelyExistingSignupResult(data.user);

    return {
      session: data.session,
      user: data.user,
      needsEmailConfirmation: data.session === null && !isExistingUser,
      isExistingUser,
    };
  },

  async signOut() {
    const client = getClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw new Error(getErrorMessage(error, 'ログアウトできませんでした。'));
    }
  },

  async requestPasswordReset(email: string) {
    const client = getClient();
    const redirectTo = getPasswordResetRedirectUrl();
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);

    if (error) {
      throw new Error(
        getErrorMessage(error, 'パスワード再設定メールを送信できませんでした。'),
      );
    }

    return {
      redirectTo,
    };
  },

  async updatePassword(password: string) {
    const client = getClient();
    const { error } = await client.auth.updateUser({ password });

    if (error) {
      throw new Error(
        getErrorMessage(error, '新しいパスワードを設定できませんでした。'),
      );
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const client = getClient();
    return client.auth.onAuthStateChange(callback);
  },
};

export const accessAPI = {
  async getWorkspaceAccess(): Promise<WorkspaceAccess> {
    const client = getClient();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    const email = user?.email?.trim();

    if (userError) {
      throw new Error(getErrorMessage(userError, 'ログイン中のユーザーを確認できませんでした。'));
    }

    if (!email) {
      return {
        allowed: false,
        role: null,
      };
    }

    const { data, error } = await client
      .from('workspace_members')
      .select('email, role')
      .ilike('email', email)
      .limit(1);

    if (error) {
      const message = error.message ?? '';
      const code = error.code ?? '';

      if (code === 'PGRST204' || message.includes('role')) {
        const fallback = await client
          .from('workspace_members')
          .select('email')
          .ilike('email', email)
          .limit(1);

        if (fallback.error) {
          throw new Error(getErrorMessage(fallback.error, '研究室メンバー権限を確認できませんでした。'));
        }

        return {
          allowed: (fallback.data ?? []).length > 0,
          role: (fallback.data ?? []).length > 0 ? 'member' : null,
        };
      }

      throw new Error(getErrorMessage(error, '研究室メンバー権限を確認できませんでした。'));
    }

    const member = (data ?? [])[0] as WorkspaceMemberRow | undefined;

    return {
      allowed: Boolean(member),
      role: member?.role === 'admin' ? 'admin' : member ? 'member' : null,
    };
  },

  async hasWorkspaceAccess() {
    const access = await this.getWorkspaceAccess();
    return access.allowed;
  },
};

export const storageAPI = {
  getInventoryLocationImageUrl,

  async uploadInventoryLocationImage(file: File, itemId?: string | null) {
    const client = getClient();
    const extension = getFileExtension(file.name);
    const safeItemId = itemId?.trim() || createId('inventory_location');
    const filePath = `${safeItemId}/${createId('image')}.${extension}`;
    const { error } = await client.storage.from(INVENTORY_LOCATION_IMAGE_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      throw new Error(getErrorMessage(error, '保管場所の画像をアップロードできませんでした。'));
    }

    return {
      path: filePath,
      publicUrl: getInventoryLocationImageUrl(filePath),
    };
  },

  async deleteInventoryLocationImage(path: string) {
    if (!path.trim()) {
      return;
    }

    const client = getClient();
    const { error } = await client.storage.from(INVENTORY_LOCATION_IMAGE_BUCKET).remove([path]);

    if (error) {
      throw new Error(getErrorMessage(error, '保管場所の画像を削除できませんでした。'));
    }
  },

  async createStorageLocation(payload: StorageLocationDraft) {
    const client = getClient();
    const { data, error } = await client
      .from('storage_locations')
      .insert(prepareStorageLocationPayload(payload))
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error, '保管場所を追加できませんでした。'));
    }

    return mapStorageLocationRow(data as StorageLocationRow);
  },

  async updateStorageLocation(id: string, payload: StorageLocationDraft, previousName?: string) {
    const client = getClient();
    const nextPayload = prepareStorageLocationPayload(payload);
    const { data, error } = await client
      .from('storage_locations')
      .update(nextPayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error, '保管場所を更新できませんでした。'));
    }

    const nextLocation = mapStorageLocationRow(data as StorageLocationRow);
    const oldName = previousName?.trim();

    if (oldName && oldName !== nextLocation.name) {
      const affected = await client
        .from('inventory_items')
        .select('id, location_detail, location_field_values')
        .eq('location_preset', oldName);

      if (affected.error) {
        throw new Error(getErrorMessage(affected.error, '既存在庫の保管場所名を更新できませんでした。'));
      }

      const updates = (affected.data ?? []).map((row) => {
        const locationDetail = typeof row.location_detail === 'string' ? row.location_detail : '';
        const locationFieldValues = normalizeLocationFieldValues(
          'location_field_values' in row ? row.location_field_values : [],
        );
        return client
          .from('inventory_items')
          .update({
            location_preset: nextLocation.name,
            location: buildInventoryLocation(nextLocation.name, locationFieldValues, locationDetail),
          })
          .eq('id', row.id);
      });

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);

      if (failed?.error) {
        throw new Error(getErrorMessage(failed.error, '既存在庫の保管場所名を更新できませんでした。'));
      }
    }

    return nextLocation;
  },

  async deleteStorageLocation(id: string) {
    const client = getClient();
    const { error } = await client.from('storage_locations').delete().eq('id', id);

    if (error) {
      throw new Error(getErrorMessage(error, '保管場所を削除できませんでした。'));
    }

    return { success: true as const };
  },

  async getSnapshot(): Promise<LabSnapshot> {
    const client = getClient();

    const [inventoryResponse, storageLocationsResponse, ordersResponse, protocolsResponse] = await Promise.all([
      client.from('inventory_items').select('*').order('updated_at', { ascending: false }),
      client
        .from('storage_locations')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      client.from('orders').select('*').order('updated_at', { ascending: false }),
      client.from('protocols').select('*').order('updated_at', { ascending: false }),
    ]);

    if (inventoryResponse.error) {
      throw new Error(getErrorMessage(inventoryResponse.error, '在庫を読み込めませんでした。'));
    }

    let storageLocations: StorageLocation[] = [];
    if (storageLocationsResponse.error) {
      const message = storageLocationsResponse.error.message ?? '';
      const code = storageLocationsResponse.error.code ?? '';

      if (!(code === 'PGRST205' || message.includes('storage_locations'))) {
        throw new Error(getErrorMessage(storageLocationsResponse.error, '保管場所マスタを読み込めませんでした。'));
      }
    } else {
      storageLocations = (storageLocationsResponse.data ?? []).map((row) =>
        mapStorageLocationRow(row as StorageLocationRow),
      );
    }

    if (ordersResponse.error) {
      throw new Error(getErrorMessage(ordersResponse.error, '発注を読み込めませんでした。'));
    }

    if (protocolsResponse.error) {
      throw new Error(getErrorMessage(protocolsResponse.error, 'プロトコルを読み込めませんでした。'));
    }

    const inventory = (inventoryResponse.data ?? []).map((row) => mapInventoryRow(row as InventoryRow));
    const orders = (ordersResponse.data ?? []).map((row) => mapOrderRow(row as OrderRow));
    const protocols = (protocolsResponse.data ?? []).map((row) => mapProtocolRow(row as ProtocolRow));

    return {
      inventory,
      storageLocations,
      orders,
      protocols,
      updatedAt: buildSnapshotUpdatedAt([inventory, storageLocations, orders, protocols]),
    };
  },

  async createInventoryItem(payload: InventoryItemDraft) {
    const client = getClient();
    const { data, error } = await client
      .from('inventory_items')
      .insert(prepareInventoryPayload(payload))
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error, '試薬を追加できませんでした。'));
    }

    return mapInventoryRow(data as InventoryRow);
  },

  async updateInventoryItem(id: string, payload: InventoryItemDraft) {
    const client = getClient();
    const { data, error } = await client
      .from('inventory_items')
      .update(prepareInventoryPayload(payload))
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error, '試薬を更新できませんでした。'));
    }

    return mapInventoryRow(data as InventoryRow);
  },

  async deleteInventoryItem(id: string) {
    const client = getClient();
    const { error } = await client.from('inventory_items').delete().eq('id', id);

    if (error) {
      throw new Error(getErrorMessage(error, '試薬を削除できませんでした。'));
    }

    return { success: true as const };
  },

  async createOrder(payload: OrderDraft) {
    const client = getClient();
    const { data, error } = await client.from('orders').insert(prepareOrderPayload(payload)).select('*').single();

    if (error) {
      throw new Error(getErrorMessage(error, '発注を作成できませんでした。'));
    }

    return mapOrderRow(data as OrderRow);
  },

  async updateOrder(id: string, payload: OrderDraft) {
    const client = getClient();
    const { data, error } = await client
      .from('orders')
      .update(prepareOrderPayload(payload))
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error, '発注を更新できませんでした。'));
    }

    return mapOrderRow(data as OrderRow);
  },

  async deleteOrder(id: string) {
    const client = getClient();
    const { error } = await client.from('orders').delete().eq('id', id);

    if (error) {
      throw new Error(getErrorMessage(error, '発注を削除できませんでした。'));
    }

    return { success: true as const };
  },

  async createProtocol(payload: ProtocolDraft) {
    const client = getClient();
    const { data, error } = await client
      .from('protocols')
      .insert(prepareProtocolPayload(payload))
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error, 'プロトコルを追加できませんでした。'));
    }

    return mapProtocolRow(data as ProtocolRow);
  },

  async updateProtocol(id: string, payload: ProtocolDraft) {
    const client = getClient();
    const { data, error } = await client
      .from('protocols')
      .update(prepareProtocolPayload(payload))
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error, 'プロトコルを更新できませんでした。'));
    }

    return mapProtocolRow(data as ProtocolRow);
  },

  async deleteProtocol(id: string) {
    const client = getClient();
    const { error } = await client.from('protocols').delete().eq('id', id);

    if (error) {
      throw new Error(getErrorMessage(error, 'プロトコルを削除できませんでした。'));
    }

    return { success: true as const };
  },

  subscribeToChanges(onMessage: (event: SnapshotEvent) => void) {
    if (typeof window === 'undefined' || !isSupabaseConfigured) {
      return () => undefined;
    }

    const client = getClient();
    const channel = client.channel(`lab-realtime-${createId('channel')}`);
    const emitSnapshotUpdate = () =>
      onMessage({
        type: 'snapshot-updated',
        updatedAt: new Date().toISOString(),
      });

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, emitSnapshotUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_locations' }, emitSnapshotUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, emitSnapshotUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'protocols' }, emitSnapshotUpdate)
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  },
};
