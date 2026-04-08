import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getInventory,
  getOrders,
  getProtocols,
  InventoryItem,
  Order,
} from "@/lib/store";

function getStockStatus(item: InventoryItem): "ok" | "low" | "empty" | "expired" {
  if (item.expiryDate && new Date(item.expiryDate) < new Date()) return "expired";
  if (item.quantity === 0) return "empty";
  if (item.quantity <= 2) return "low";
  return "ok";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const [alertItems, setAlertItems] = useState<InventoryItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ inventory: 0, orders: 0, protocols: 0 });

  const loadData = useCallback(async () => {
    const [inventory, orders, protocols] = await Promise.all([
      getInventory(),
      getOrders(),
      getProtocols(),
    ]);

    const alerts = inventory.filter((item) => {
      const status = getStockStatus(item);
      return status === "empty" || status === "low" || status === "expired";
    });

    setAlertItems(alerts);
    setRecentOrders(orders.slice(0, 3));
    setStats({
      inventory: inventory.length,
      orders: orders.length,
      protocols: protocols.length,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const ORDER_STATUS_CONFIG = {
    draft: { label: "下書き", color: "#6B7280" },
    submitted: { label: "申請済み", color: "#2563EB" },
    approved: { label: "承認済み", color: "#16A34A" },
    received: { label: "受領済み", color: "#0EA5E9" },
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>研究室管理</Text>
            <Text style={[styles.appTitle, { color: colors.foreground }]}>Lab Manager</Text>
          </View>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="flask.fill" size={28} color={colors.primary} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Pressable
            style={({ pressed }) => [styles.statCard, { backgroundColor: "#8B5CF620", opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/inventory")}
          >
            <Text style={[styles.statNumber, { color: "#8B5CF6" }]}>{stats.inventory}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>在庫品目</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statCard, { backgroundColor: "#2563EB20", opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/orders")}
          >
            <Text style={[styles.statNumber, { color: "#2563EB" }]}>{stats.orders}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>発注書</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statCard, { backgroundColor: "#10B98120", opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/protocols")}
          >
            <Text style={[styles.statNumber, { color: "#10B981" }]}>{stats.protocols}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>プロトコル</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>クイックアクション</Text>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/inventory/add")}
          >
            <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
            <Text style={styles.quickActionText}>在庫を追加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: "#10B981" }]}
            onPress={() => router.push("/orders/new")}
          >
            <IconSymbol name="doc.text.fill" size={22} color="#fff" />
            <Text style={styles.quickActionText}>発注書を作成</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts */}
        {alertItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>在庫アラート</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(tabs)/inventory")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>すべて見る</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {alertItems.slice(0, 4).map((item, index) => {
                const status = getStockStatus(item);
                const statusColor = status === "expired" || status === "empty" ? colors.error : colors.warning;
                const statusLabel = status === "expired" ? "期限切れ" : status === "empty" ? "在庫なし" : "残り少";
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.alertItem,
                      index > 0 && { borderTopWidth: 0.5, borderTopColor: colors.border },
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => router.push({ pathname: "/inventory/[id]", params: { id: item.id } })}
                  >
                    <View style={[styles.alertDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.alertItemName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.alertBadge, { backgroundColor: statusColor + "20" }]}>
                      <Text style={[styles.alertBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Recent Orders */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>最近の発注書</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>すべて見る</Text>
          </TouchableOpacity>
        </View>
        {recentOrders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>発注書がありません</Text>
            <TouchableOpacity onPress={() => router.push("/orders/new")}>
              <Text style={[styles.emptyLink, { color: colors.primary }]}>作成する →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentOrders.map((order) => {
            const statusConf = ORDER_STATUS_CONFIG[order.status];
            return (
              <Pressable
                key={order.id}
                style={({ pressed }) => [
                  styles.orderCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => router.push({ pathname: "/orders/[id]", params: { id: order.id } })}
              >
                <View style={styles.orderCardHeader}>
                  <Text style={[styles.orderTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {order.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusConf.color + "20" }]}>
                    <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
                  </View>
                </View>
                <View style={styles.orderCardFooter}>
                  <Text style={[styles.orderMeta, { color: colors.muted }]}>
                    {order.items.length}品目 · {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                  </Text>
                  <Text style={[styles.orderAmount, { color: colors.primary }]}>
                    {formatCurrency(order.totalAmount)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {/* Protocol Quick Access */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>プロトコル</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/protocols")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>すべて見る</Text>
          </TouchableOpacity>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.protocolBanner,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => router.push("/(tabs)/protocols")}
        >
          <View style={styles.protocolBannerContent}>
            <IconSymbol name="list.bullet.clipboard.fill" size={32} color="rgba(255,255,255,0.9)" />
            <View style={styles.protocolBannerText}>
              <Text style={styles.protocolBannerTitle}>実験手順を検索</Text>
              <Text style={styles.protocolBannerSub}>
                Western Blot、ELISA、PCRなど{"\n"}
                {stats.protocols}件のプロトコルが利用可能
              </Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  greeting: {
    fontSize: 14,
    lineHeight: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  quickActionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  alertCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  alertItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  orderCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  orderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  orderTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  orderCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyLink: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  protocolBanner: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  protocolBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  protocolBannerText: {
    flex: 1,
    gap: 4,
  },
  protocolBannerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  protocolBannerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 18,
  },
});
