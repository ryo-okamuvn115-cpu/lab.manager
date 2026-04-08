import { useAuth } from "@/hooks/use-auth";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { cn } from "@/lib/utils";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const { isAuthenticated, loading } = useAuth();
  const colors = useColors();
  const router = useRouter();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <ScreenContainer className="flex items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 items-center justify-center px-6 gap-8">
          {/* Header */}
          <View className="items-center gap-3">
            <Text className="text-4xl font-bold text-foreground">Lab Manager</Text>
            <Text className="text-base text-muted text-center">
              研究室の在庫・発注書・プロトコルを一元管理
            </Text>
          </View>

          {/* Features List */}
          <View className="w-full gap-4 bg-surface rounded-2xl p-6">
            <FeatureItem
              icon="📦"
              title="在庫管理"
              description="タンパク質・抗体・試薬を一括管理"
            />
            <FeatureItem
              icon="📋"
              title="発注書作成"
              description="複数品目をまとめて発注"
            />
            <FeatureItem
              icon="🔬"
              title="プロトコル検索"
              description="実験手順をすぐに検索"
            />
            <FeatureItem
              icon="☁️"
              title="データ同期"
              description="チーム全体でデータを共有"
            />
          </View>

          {/* Login Button */}
          <Pressable
            onPress={startOAuthLogin}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
            className="w-full py-4 rounded-full items-center justify-center"
          >
            <Text className="text-lg font-semibold text-white">ログイン</Text>
          </Pressable>

          {/* Info Text */}
          <Text className="text-xs text-muted text-center">
            Manus OAuth でセキュアにログインします
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row gap-3 items-start">
      <Text className="text-2xl">{icon}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted">{description}</Text>
      </View>
    </View>
  );
}
