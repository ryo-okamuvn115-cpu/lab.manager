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
import { addProtocol, ProtocolStep } from "@/lib/store";

const CATEGORIES = ["タンパク質解析", "免疫学的測定", "細胞培養", "核酸解析", "細胞・組織解析", "その他"];

function generateId() {
  return "s-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface StepForm {
  id: string;
  title: string;
  description: string;
  duration: string;
  notes: string;
}

export default function ProtocolAddScreen() {
  const router = useRouter();
  const colors = useColors();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("その他");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([
    { id: generateId(), title: "", description: "", duration: "", notes: "" },
  ]);
  const [reagents, setReagents] = useState("");
  const [equipment, setEquipment] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const updateStep = (id: string, field: keyof StepForm, value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { id: generateId(), title: "", description: "", duration: "", notes: "" }]);
  };

  const removeStep = (id: string) => {
    if (steps.length === 1) {
      Alert.alert("エラー", "ステップは1件以上必要です");
      return;
    }
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("入力エラー", "タイトルを入力してください");
      return;
    }
    if (steps.some((s) => !s.title.trim())) {
      Alert.alert("入力エラー", "すべてのステップにタイトルを入力してください");
      return;
    }

    setSaving(true);
    try {
      const protocolSteps: ProtocolStep[] = steps.map((s, i) => ({
        id: s.id,
        stepNumber: i + 1,
        title: s.title.trim(),
        description: s.description.trim(),
        duration: s.duration.trim() || null,
        notes: s.notes.trim(),
      }));
      await addProtocol({
        title: title.trim(),
        category,
        description: description.trim(),
        steps: protocolSteps,
        reagents: reagents.split("\n").map((r) => r.trim()).filter(Boolean),
        equipment: equipment.split("\n").map((e) => e.trim()).filter(Boolean),
        notes: notes.trim(),
      });
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>プロトコルを追加</Text>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "保存中..." : "保存"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>タイトル *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="例: Western Blot (SDS-PAGE)"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>カテゴリ</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: category === cat ? colors.primary : colors.surface,
                      borderColor: category === cat ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, { color: category === cat ? "#fff" : colors.muted }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>概要</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="この手順の概要を入力"
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
          </View>

          {/* Steps */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>手順ステップ</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
              onPress={addStep}
            >
              <IconSymbol name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>追加</Text>
            </TouchableOpacity>
          </View>

          {steps.map((step, index) => (
            <View key={step.id} style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.stepCardHeader}>
                <Text style={[styles.stepCardTitle, { color: colors.foreground }]}>ステップ {index + 1}</Text>
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: colors.error + "15" }]}
                  onPress={() => removeStep(step.id)}
                >
                  <IconSymbol name="trash" size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>ステップタイトル *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="例: サンプル調製"
                  placeholderTextColor={colors.muted}
                  value={step.title}
                  onChangeText={(v) => updateStep(step.id, "title", v)}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>説明</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="手順の詳細説明"
                  placeholderTextColor={colors.muted}
                  value={step.description}
                  onChangeText={(v) => updateStep(step.id, "description", v)}
                  multiline
                  numberOfLines={2}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>所要時間</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="例: 30分"
                    placeholderTextColor={colors.muted}
                    value={step.duration}
                    onChangeText={(v) => updateStep(step.id, "duration", v)}
                    returnKeyType="next"
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>注意事項</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="注意点・ポイント"
                  placeholderTextColor={colors.muted}
                  value={step.notes}
                  onChangeText={(v) => updateStep(step.id, "notes", v)}
                  returnKeyType="done"
                />
              </View>
            </View>
          ))}

          {/* Reagents */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>必要な試薬（1行1つ）</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder={"例:\nRIPAバッファー\nBCAアッセイキット"}
              placeholderTextColor={colors.muted}
              value={reagents}
              onChangeText={setReagents}
              multiline
              numberOfLines={4}
              returnKeyType="done"
            />
          </View>

          {/* Equipment */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>必要な機器（1行1つ）</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder={"例:\n電気泳動装置\n転写装置"}
              placeholderTextColor={colors.muted}
              value={equipment}
              onChangeText={setEquipment}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>全体の注意事項</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="全体的な注意点"
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              returnKeyType="done"
            />
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
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 22,
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
  textAreaSmall: {
    minHeight: 60,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  stepCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  stepCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
