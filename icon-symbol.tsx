// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "pencil": "edit",
  "trash": "delete",
  "trash.fill": "delete",
  "magnifyingglass": "search",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-horiz",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.up": "arrow-upward",
  "arrow.down": "arrow-downward",
  "square.and.arrow.up": "share",
  "doc.on.clipboard": "content-paste",
  "doc.text.fill": "description",
  "doc.text": "description",
  "list.bullet": "list",
  "list.bullet.clipboard.fill": "assignment",
  "flask.fill": "science",
  "cube.box.fill": "inventory",
  "cart.fill": "shopping-cart",
  "bell.fill": "notifications",
  "person.fill": "person",
  "gear": "settings",
  "info.circle": "info",
  "exclamationmark.triangle.fill": "warning",
  "checkmark.seal.fill": "verified",
  "clock.fill": "access-time",
  "calendar": "calendar-today",
  "tag.fill": "label",
  "building.2.fill": "business",
  "number": "tag",
  "location.fill": "location-on",
  "note.text": "note",
  "arrow.clockwise": "refresh",
  "line.3.horizontal.decrease.circle": "filter-list",
  "slider.horizontal.3": "tune",
  "star.fill": "star",
  "bookmark.fill": "bookmark",
  "printer.fill": "print",
  "envelope.fill": "email",
  "phone.fill": "phone",
  "link": "link",
  "photo": "photo",
  "camera.fill": "camera-alt",
  "tray.fill": "inbox",
  "folder.fill": "folder",
  "externaldrive.fill": "storage",
  "waveform.path.ecg": "monitor-heart",
  "eyedropper": "colorize",
  "testtube.2": "science",
  "cross.vial.fill": "biotech",
  "pills.fill": "medication",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
