import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

/**
 * 画像を選択してBase64エンコードして返す
 */
export async function pickAndEncodeImage(): Promise<{
  base64: string;
  uri: string;
  fileName: string;
} | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const uri = result.assets[0].uri;
    const fileName = uri.split("/").pop() || "image.jpg";

    // Web プラットフォームの場合は異なる処理
    if (Platform.OS === "web") {
      // Web では Blob として取得
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve({ base64, uri, fileName });
        };
        reader.readAsDataURL(blob);
      });
    }

    // ネイティブプラットフォームの場合
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { base64, uri, fileName };
  } catch (error) {
    console.error("Error picking image:", error);
    return null;
  }
}

/**
 * Base64 文字列から画像 URI を生成
 */
export function base64ToImageUri(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}
