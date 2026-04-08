import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getProtocols, Protocol } from "@/lib/store";

const CATEGORY_COLORS: Record<string, string> = {
  "タンパク質解析": "#8B5CF6",
  "免疫学的測定": "#0EA5E9",
  "細胞培養": "#10B981",
  "核酸解析": "#F59E0B",
  "細胞・組織解析": "#EF4444",
  "その他": "#6B7280",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#6B7280";
}

export default function ProtocolsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("すべて");

  const loadProtocols = useCallback(async () => {
    const data = await getProtocols();
    setProtocols(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProtocols();
    }, [loadProtocols])
  );

  const categories = ["すべて", ...Array.from(new Set(protocols.map((p) => p.category)))];

  const filtered = protocols.filter((p) => {
    const matchCat = activeCategory === "すべて" || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false) ||
      p.reagents.some((r) => r.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const renderItem = ({ item }: { item: Protocol }) => {
    const catColor = getCategoryColor(item.category);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => router.push({ pathname: "/protocols/[id]", params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
          <View style={styles.cardTitleArea}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + "20" }]}>
              <Text style={[styles.categoryBadgeText, { color: catColor }]}>{item.category}</Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={18} color={colors.muted} />
        </View>
        <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <IconSymbol name="list.bullet" size={13} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{item.steps.length}ステップ</Text>
          </View>
          <View style={styles.metaItem}>
            <IconSymbol name="testtube.2" size={13} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{item.reagents.length}試薬</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>プロトコル</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/protocols/add")}
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
            placeholder="手順名・試薬名・カテゴリで検索"
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

      {/* Category Filter */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: cat }) => {
            const catColor = cat === "すべて" ? colors.primary : getCategoryColor(cat);
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? catColor : colors.surface,
                    borderColor: isActive ? catColor : colors.border,
                  },
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.muted }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="list.bullet.clipboard.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {search ? "検索結果がありません" : "プロトコルがありません"}
            </Text>
            {!search && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/protocols/add")}
              >
                <Text style={styles.emptyButtonText}>プロトコルを追加する</Text>
              </TouchableOpacity>
            )}
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
    gap: 8,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  cardTitleArea: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 18,
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
