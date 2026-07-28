import BottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";
import { springs } from "../../theme/motion";
import { haptics } from "../../theme/haptics";
import { Button } from "./Button";
import { TearEdge } from "./Ledger";

/**
 * LedgerSheet — the designed replacement for system Alert pickers.
 * A receipt torn off the roll: tear edge, caps-mono title over a hairline, then
 * ledger rows. Two shapes, per the DS BottomSheetLite:
 *   • an option list (single choice, current value checked)
 *   • a destructive confirm (danger-toned option + an explanatory note)
 * Ported from Zeno Design System/ui_kits/app/Ledger.jsx.
 */
export type LedgerSheetOption = {
  value: string;
  label: string;
  meta?: string;
  selected?: boolean;
  tone?: "default" | "danger";
};

export type LedgerSheetProps = {
  open: boolean;
  title: string;
  options: LedgerSheetOption[];
  onPick: (value: string) => void;
  onClose: () => void;
  /** Explanatory note shown under the options for destructive sheets. */
  destructive?: string;
  closeLabel?: string;
};

export function LedgerSheet({ open, title, options, onPick, onClose, destructive, closeLabel = "Close" }: LedgerSheetProps) {
  const t = useZenoTokens();
  const c = t.color;
  const ref = useRef<BottomSheet>(null);

  useEffect(() => {
    if (open) {
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [open]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.55} />
    ),
    []
  );

  if (!open) {
    return null;
  }

  return (
    <BottomSheet
      ref={ref}
      index={0}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      animationConfigs={springs.sheet}
      handleComponent={null}
      backgroundStyle={{ backgroundColor: "transparent" }}
    >
      <BottomSheetView style={{ backgroundColor: "transparent" }}>
        <TearEdge />
        <View style={{ backgroundColor: c.surfaceCard, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 }}>
          <Text
            style={{
              fontFamily: t.fonts.mono.bold,
              fontSize: 10.5,
              letterSpacing: 1.7,
              textTransform: "uppercase",
              color: c.textTertiary,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderColor: c.rule
            }}
          >
            {title}
          </Text>

          {options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: Boolean(o.selected) }}
              accessibilityLabel={o.meta ? `${o.label}, ${o.meta}` : o.label}
              onPress={() => {
                haptics.rowPress();
                onPick(o.value);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                columnGap: 10,
                minHeight: 46,
                paddingVertical: 13,
                paddingHorizontal: 2,
                borderBottomWidth: 1,
                borderColor: c.rule,
                backgroundColor: pressed ? c.surfaceSunken : "transparent"
              })}
            >
              <Text
                style={{
                  flex: 1,
                  fontFamily: o.selected ? t.fonts.sans.bold : t.fonts.sans.medium,
                  fontSize: 15,
                  color: o.tone === "danger" ? c.stampAlert : c.textPrimary
                }}
              >
                {o.label}
              </Text>
              {o.meta ? <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 12, color: c.textTertiary }}>{o.meta}</Text> : null}
              {o.selected ? <Check size={16} color={c.accentText} strokeWidth={2.4} /> : null}
            </Pressable>
          ))}

          {destructive ? (
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12, color: c.textTertiary, paddingTop: 10, lineHeight: 17 }}>
              {destructive}
            </Text>
          ) : null}

          <Button variant="ghost" size="md" fullWidth onPress={onClose} style={{ marginTop: 12 }}>
            {closeLabel}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

/** Convenience wrapper: a single destructive confirmation. */
export function ConfirmSheet({
  open,
  title,
  confirmLabel,
  note,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  note?: string;
  onConfirm: () => void;
  onClose: () => void;
}): ReactNode {
  return (
    <LedgerSheet
      open={open}
      title={title}
      options={[{ value: "confirm", label: confirmLabel, tone: "danger" }]}
      onPick={onConfirm}
      onClose={onClose}
      {...(note ? { destructive: note } : {})}
      closeLabel="Cancel"
    />
  );
}
