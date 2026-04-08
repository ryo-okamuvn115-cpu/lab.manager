import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addOrder, OrderItem } from "@/lib/store";

function generateItemId() {
  return "item-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

interface ItemFormState {
  id: string;
  name: string;
  catalogNumber: string;
  manufacturer: string;
  quantity: string;
  unitPrice: string;
  unit: string;
  purpose: string;
}

function OrderItemForm({
  item,
  index,
  onUpdate,
  onRemove,
  colors,
}: {
  item: ItemFormState;
  index: number;
  onUpdate: (id: string, field: keyof ItemFormState, value: string) => void;
  onRemove: (id: string) => void;
  colors: any;
}) {
  return (
    <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.itemCardHeader}>
        <Text style={[styles.itemCardTitle, { color: colors.foreground }]}>品目 {index + 1}</Text>
        <TouchableOpacity
          style={[styles.removeBtn, { backgroundColor: colors.error + "15" }]}
          onPress={() => onRemove(item.id)}
        >
          <IconSymbol name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.muted }]}>品名 *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="例: Anti-p53 Antibody"
          placeholderTextColor={colors.muted}
          value={item.name}
          onChangeText={(v) => onUpdate(item.id, "name", v)}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.muted }]}>メーカー</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="例: Santa Cruz Biotechnology"
          placeholderTextColor={colors.muted}
          value={item.manufacturer}
          onChangeText={(v) => onUpdate(item.id, "manufacturer", v)}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.muted }]}>カタログ番号</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="例: sc-126"
          placeholderTextColor={colors.muted}
          value={item.catalogNumber}
          onChangeText={(v) => onUpdate(item.id, "catalogNumber", v)}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>数量</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="1"
            placeholderTextColor={colors.muted}
            value={item.quantity}
            onChangeText={(v) => onUpdate(item.id, "quantity", v)}
            keyboardType="numeric"
            returnKeyType="next"
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>単位</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="vial, 本..."
            placeholderTextColor={colors.muted}
            value={item.unit}
            onChangeText={(v) => onUpdate(item.id, "unit", v)}
            returnKeyType="next"
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>単価 (円)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={item.unitPrice}
            onChangeText={(v) => onUpdate(item.id, "unitPrice", v)}
            keyboardType="numeric"
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.muted }]}>使用目的</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          placeholder="例: Western Blot実験用"
          placeholderTextColor={colors.muted}
          value={item.purpose}
          onChangeText={(v) => onUpdate(item.id, "purpose", v)}
          returnKeyType="done"
        />
      </View>

      {/* Subtotal */}
      {item.quantity && item.unitPrice && (
        <View style={[styles.subtotalRow, { backgroundColor: colors.primary + "10" }]}>
          <Text style={[styles.subtotalLabel, { color: colors.muted }]}>小計</Text>
          <Text style={[styles.subtotalValue, { color: colors.primary }]}>
            {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function OrderNewScreen() {
  const router = useRouter();
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<ItemFormState[]>([
    { id: generateItemId(), name: "", catalogNumber: "", manufacturer: "", quantity: "1", unitPrice: "", unit: "vial", purpose: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const totalAmount = orderItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  }, 0);

  const updateItem = (id: string, field: keyof ItemFormState, value: string) => {
    setOrderItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    if (orderItems.length === 1) {
      Alert.alert("エラー", "品目は1件以上必要です");
      return;
    }
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addItem = () => {
    setOrderItems((prev) => [
      ...prev,
      { id: generateItemId(), name: "", catalogNumber: "", manufacturer: "", quantity: "1", unitPrice: "", unit: "vial", purpose: "" },
    ]);
  };

  const handleSave = async (status: "draft" | "submitted") => {
    if (!title.trim()) {
      Alert.alert("入力エラー", "発注書タイトルを入力してください");
      return;
    }
    const hasEmptyName = orderItems.some((item) => !item.name.trim());
    if (hasEmptyName) {
      Alert.alert("入力エラー", "すべての品目に品名を入力してください");
      return;
    }

    setSaving(true);
    try {
      const items: Omit<OrderItem, never>[] = orderItems.map((item) => ({
        id: item.id,
        name: item.name.trim(),
        catalogNumber: item.catalogNumber.trim(),
        manufacturer: item.manufacturer.trim(),
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        unit: item.unit.trim() || "個",
        purpose: item.purpose.trim(),
      }));
      await addOrder({ title: title.trim(), status, items, notes: notes.trim() });
      router.back();
    } catch (e) {
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="xmark" size={22} color={colors.muted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>発注書を作成</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>発注書タイトル *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="例: 2026年3月 試薬発注"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>

          {/* Items */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>発注品目</Text>
            <TouchableOpacity
              style={[styles.addItemBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
              onPress={addItem}
            >
              <IconSymbol name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addItemBtnText, { color: colors.primary }]}>品目を追加</Text>
            </TouchableOpacity>
          </View>

          {orderItems.map((item, index) => (
            <OrderItemForm
              key={item.id}
              item={item}
              index={index}
              onUpdate={updateItem}
              onRemove={removeItem}
              colors={colors}
            />
          ))}

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>備考</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="特記事項など"
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
          </View>

          {/* Total */}
          <View style={[styles.totalCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.totalLabel, { color: colors.muted }]}>合計金額</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(totalAmount)}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.draftBtn, { borderColor: colors.border }]}
              onPress={() => handleSave("draft")}
              disabled={saving}
            >
              <IconSymbol name="doc.text" size={18} color={colors.muted} />
              <Text style={[styles.draftBtnText, { color: colors.muted }]}>下書き保存</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleSave("submitted")}
              disabled={saving}
            >
              <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>申請する</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
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
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  addItemBtnText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  itemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  subtotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
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
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  draftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  draftBtnText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
});
