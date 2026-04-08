import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { InventoryItem, InventoryItemType } from "@/lib/store";

const TYPE_LABELS: Record<InventoryItemType | "all", string> = {
  all: "すべて",
  protein: "タンパク質",
  antibody: "抗体",
  reagent: "試薬",
  other: "その他",
};

const TYPE_FILTERS: Array<InventoryItemType | "all"> = ["all", "protein", "antibody", "reagent", "other"];

function getStockStatus(item: InventoryItem): "ok" | "low" | "empty" | "expired" {
  if (item.expiryDate) {
    const expiry = new Date(item.expiryDate);
    if (expiry < new Date()) return "expired";
  }
  if (item.quantity === 0) return "empty";
  if (item.quantity <= 2) return "low";
  return "ok";
}

function StockBadge({ status }: { status: ReturnType<typeof getStockStatus> }) {
  const colors = useColors();
  const config = {
    ok: { label: "在庫あり", color: colors.success },
    low: { label: "残り少", color: colors.warning },
    empty: { label: "在庫なし", color: colors.error },
    expired: { label: "期限切れ", color: colors.error },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.color + "20" }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function TypeBadge({ type }: { type: InventoryItemType }) {
  const colors = useColors();
  const typeColors: Record<InventoryItemType, string> = {
    protein: "#8B5CF6",
    antibody: "#0EA5E9",
    reagent: "#10B981",
    other: "#6B7280",
  };
  const color = typeColors[type];
  return (
    <View style={[styles.typeBadge, { backgroundColor: color + "20" }]}>
      <Text style={[styles.typeBadgeText, { color }]}>{TYPE_LABELS[type]}</Text>
    </View>
  );
}

export default function InventoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryItemType | "all">("all");

  // tRPC + React Query で在庫データを取得
  const { data: items = [], isLoading, refetch } = trpc.inventory.list.useQuery();

  // フォーカス時にリフレッシュ
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filtered = items.filter((item) => {
    const matchType = activeFilter === "all" || item.type === activeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.catalogNumber?.toLowerCase().includes(q) ?? false) ||
      item.manufacturer.toLowerCase().includes(q) ||
      (item.storageLocation?.toLowerCase().includes(q) ?? false);
    return matchType && matchSearch;
  });

  const deleteInventoryMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = (item: InventoryItem) => {
    Alert.alert("削除確認", `「${item.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          deleteInventoryMutation.mutate({ id: item.id });
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.push({ pathname: "/inventory/[id]", params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <StockBadge status={status} />
        </View>
        <View style={styles.cardMeta}>
          <TypeBadge type={item.type} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{item.manufacturer}</Text>
        </View>
        <View style={styles.cardDetails}>
          {item.catalogNumber && (
            <View style={styles.detailRow}>
              <IconSymbol name="number" size={13} color={colors.muted} />
              <Text style={[styles.detailText, { color: colors.muted }]}>{item.catalogNumber}</Text>
            </View>
          )}
          {item.storageLocation && (
            <View style={styles.detailRow}>
              <IconSymbol name="location.fill" size={13} color={colors.muted} />
              <Text style={[styles.detailText, { color: colors.muted }]}>{item.storageLocation}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.quantityText, { color: item.quantity === 0 ? colors.error : colors.foreground }]}>
            在庫: {item.quantity} {item.unit}
          </Text>
          {item.expiryDate && (
            <Text style={[styles.expiryText, { color: colors.muted }]}>
              期限: {new Date(item.expiryDate).toLocaleDateString("ja-JP")}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>在庫管理</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/inventory/add")}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="名前・カタログ番号・メーカーで検索"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TYPE_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: filter }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === filter ? colors.primary : colors.surface,
                  borderColor: activeFilter === filter ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === filter ? "#fff" : colors.muted },
                ]}
              >
                {TYPE_LABELS[filter]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="cube.box.fill" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {search ? "検索結果がありません" : "在庫がありません"}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/inventory/add")}
                >
                  <Text style={styles.emptyButtonText}>在庫を追加する</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  filterContainer: {
    borderBottomWidth: 0.5,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleRow: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  expiryText: {
    fontSize: 12,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 22,
  },
});
