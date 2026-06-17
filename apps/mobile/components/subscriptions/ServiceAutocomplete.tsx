import { searchServices, type Service } from "@zeno/service-catalog";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { getAvatarStyle } from "../../src/utils/subscription-ui";

/** Max suggestions shown in the type-ahead dropdown. */
const MAX_SUGGESTIONS = 6;

/** Short "$9.99/mo" / "$99/yr" label, or null when the catalog has no price. */
export function servicePriceLabel(service: Service): string | null {
  if (service.defaultMonthlyPrice != null) return `$${service.defaultMonthlyPrice.toFixed(2)}/mo`;
  if (service.defaultAnnualPrice != null) return `$${service.defaultAnnualPrice.toFixed(2)}/yr`;
  return null;
}

type Props = {
  /** Current text in the name field. */
  query: string;
  /** Slug of the currently picked catalog service, if any (hides the dropdown). */
  selectedSlug?: string;
  /** Called when the user taps a catalog match. */
  onSelect: (service: Service) => void;
  /** Called when the user taps "Use \"<query>\"" to keep their free-text entry. */
  onUseCustom: () => void;
  theme: ThemeTokens;
};

/**
 * Type-ahead dropdown that surfaces catalog matches for the name field. Renders
 * nothing until the user has typed and has not yet locked in a catalog service.
 * Each row shows the service name, its category, and (when known) the typical
 * price/cycle so the user can pick the right entry at a glance.
 */
export function ServiceAutocomplete({ query, selectedSlug, onSelect, onUseCustom, theme }: Props) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) return [];
    return searchServices(trimmed, MAX_SUGGESTIONS);
  }, [query]);

  // Hide once a catalog service is locked in, or before the user types.
  if (selectedSlug || query.trim().length < 1) return null;

  // Don't offer "use exactly this" when the top match already equals the query.
  const exactMatch = matches.some((service) => service.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <View style={styles.dropdown} accessibilityLabel="Service suggestions">
      {matches.map((service, index) => {
        const avatar = getAvatarStyle(service.category, theme);
        const price = servicePriceLabel(service);
        const isLast = index === matches.length - 1 && exactMatch;
        return (
          <Pressable
            key={service.id}
            accessibilityRole="button"
            accessibilityLabel={price ? `${service.name}, ${price}` : service.name}
            onPress={() => onSelect(service)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
              <Text style={[styles.avatarText, { color: avatar.text }]}>
                {service.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.middle}>
              <Text style={styles.name} numberOfLines={1}>{service.name}</Text>
              <Text style={styles.category}>{service.category.replace("_", " ")}</Text>
            </View>
            {price ? <Text style={styles.price}>{price}</Text> : null}
            {!isLast ? <View style={styles.separator} /> : null}
          </Pressable>
        );
      })}

      {!exactMatch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Use ${query.trim()} as a custom service`}
          onPress={onUseCustom}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={styles.customPlus}>+</Text>
          </View>
          <View style={styles.middle}>
            <Text style={styles.name} numberOfLines={1}>Use “{query.trim()}”</Text>
            <Text style={styles.category}>Custom service, not in our list</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    dropdown: {
      backgroundColor: theme.card,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 0.5,
      borderColor: theme.border
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 12,
      minHeight: 48
    },
    rowPressed: { backgroundColor: theme.surfaceAlt },
    avatar: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 13, fontWeight: "700" },
    customPlus: { fontSize: 20, color: theme.primary, fontWeight: "700" },
    middle: { flex: 1, minWidth: 0 },
    name: { ...typography.subheadline, color: theme.text },
    category: { ...typography.caption1, color: theme.mutedText, marginTop: 1, textTransform: "capitalize" },
    price: { ...typography.subheadline, color: theme.mutedText, fontVariant: ["tabular-nums"] },
    separator: {
      position: "absolute",
      left: 60, right: 0, bottom: 0,
      height: 0.5,
      backgroundColor: theme.border
    }
  });
}
