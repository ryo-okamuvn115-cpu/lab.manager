import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getOrders, updateOrder, deleteOrder, Order, OrderStatus } from "@/lib/store";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: "下書き", color: "#6B7280", bgColor: "#6B728020" },
  submitted: { label: "申請済み", color: "#2563EB", bgColor: "#2563EB20" },
  approved: { label: "承認済み", color: "#16A34A", bgColor: "#16A34A20" },
  received: { label: "受領済み", color: "#0EA5E9", bgColor: "#0EA5E920" },
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  draft: "submitted",
  submitted: "approved",
  approved: "received",
  received: null,
};

const STATUS_TRANSITION_LABELS: Record<OrderStatus, string> = {
  draft: "申請する",
  submitted: "承認済みにする",
  approved: "受領済みにする",
  received: "",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [order, setOrder] = useState<Order | null>(null);

  const loadOrder = async () => {
    const orders = await getOrders();
    const found = orders.find((o) => o.id === id);
    setOrder(found || null);
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleStatusChange = async () => {
    if (!order) return;
    const nextStatus = STATUS_TRANSITIONS[order.status];
    if (!nextStatus) return;
    Alert.alert(
      "ステータス変更",
      `ステータスを「${STATUS_CONFIG[nextStatus].label}」に変更しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "変更する",
          onPress: async () => {
            await updateOrder(id, { status: nextStatus });
            loadOrder();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert("削除確認", `「${order?.title}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await deleteOrder(id);
          router.back();
        },
      },
    ]);
  };

  if (!order) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>発注書が見つかりません</Text>
        </View>
      </ScreenContainer>
    );
  }

  const statusConf = STATUS_CONFIG[order.status];
  const nextStatus = STATUS_TRANSITIONS[order.status];

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          発注書詳細
        </Text>
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.error + "15" }]}
          onPress={handleDelete}
        >
          <IconSymbol name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title & Status */}
        <View style={[styles.titleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.orderTitle, { color: colors.foreground }]}>{order.title}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConf.bgColor }]}>
              <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
            </View>
            <Text style={[styles.dateText, { color: colors.muted }]}>
              {new Date(order.createdAt).toLocaleDateString("ja-JP")}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>発注品目</Text>
          <Text style={[styles.itemCount, { color: colors.muted }]}>{order.items.length}品目</Text>
        </View>

        {order.items.map((item, index) => (
          <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
              <View style={[styles.itemIndex, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.itemIndexText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
            <View style={styles.itemDetails}>
              {item.manufacturer ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>メーカー</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.manufacturer}</Text>
                </View>
              ) : null}
              {item.catalogNumber ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>カタログ番号</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.catalogNumber}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>数量</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.quantity} {item.unit}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>単価</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{formatCurrency(item.unitPrice)}</Text>
              </View>
              {item.purpose ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>使用目的</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.purpose}</Text>
                </View>
              ) : null}
              <View style={[styles.subtotalRow, { backgroundColor: colors.primary + "10" }]}>
                <Text style={[styles.subtotalLabel, { color: colors.muted }]}>小計</Text>
                <Text style={[styles.subtotalValue, { color: colors.primary }]}>
                  {formatCurrency(item.quantity * item.unitPrice)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Notes */}
        {order.notes ? (
          <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>備考</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{order.notes}</Text>
          </View>
        ) : null}

        {/* Total */}
        <View style={[styles.totalCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.totalLabel, { color: colors.muted }]}>合計金額</Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(order.totalAmount)}</Text>
        </View>

        {/* Status Change Button */}
        {nextStatus && (
          <TouchableOpacity
            style={[styles.statusChangeBtn, { backgroundColor: STATUS_CONFIG[nextStatus].color }]}
            onPress={handleStatusChange}
          >
            <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
            <Text style={styles.statusChangeBtnText}>{STATUS_TRANSITION_LABELS[order.status]}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  titleCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  dateText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  itemCount: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemIndexText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  itemDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    flex: 2,
    textAlign: "right",
  },
  subtotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  subtotalLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  subtotalValue: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  notesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  totalLabel: {
    fontSize: 15,
    lineHeight: 22,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
  },
  statusChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  statusChangeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
});
