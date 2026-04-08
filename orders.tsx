import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getOrders, deleteOrder, Order, OrderStatus } from "@/lib/store";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: "下書き", color: "#6B7280", bgColor: "#6B728020" },
  submitted: { label: "申請済み", color: "#2563EB", bgColor: "#2563EB20" },
  approved: { label: "承認済み", color: "#16A34A", bgColor: "#16A34A20" },
  received: { label: "受領済み", color: "#0EA5E9", bgColor: "#0EA5E920" },
};

const STATUS_FILTERS: Array<OrderStatus | "all"> = ["all", "draft", "submitted", "approved", "received"];
const STATUS_FILTER_LABELS: Record<OrderStatus | "all", string> = {
  all: "すべて",
  draft: "下書き",
  submitted: "申請済み",
  approved: "承認済み",
  received: "受領済み",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "all">("all");

  const loadOrders = useCallback(async () => {
    const data = await getOrders();
    setOrders(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const filtered = orders.filter(
    (o) => activeFilter === "all" || o.status === activeFilter
  );

  const handleDelete = (order: Order) => {
    Alert.alert("削除確認", `「${order.title}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await deleteOrder(order.id);
          loadOrders();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Order }) => {
    const statusConf = STATUS_CONFIG[item.status];
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => router.push({ pathname: "/orders/[id]", params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <IconSymbol name="list.bullet" size={14} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{item.items.length}品目</Text>
          </View>
          <View style={styles.metaItem}>
            <IconSymbol name="calendar" size={14} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {new Date(item.createdAt).toLocaleDateString("ja-JP")}
            </Text>
          </View>
        </View>
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.muted }]}>合計金額</Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>
            {formatCurrency(item.totalAmount)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>発注書</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/orders/new")}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
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
              <Text style={[styles.filterChipText, { color: activeFilter === filter ? "#fff" : colors.muted }]}>
                {STATUS_FILTER_LABELS[filter]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>発注書がありません</Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/orders/new")}
            >
              <Text style={styles.emptyButtonText}>発注書を作成する</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    lineHeight: 32,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  totalLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
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
