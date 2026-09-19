import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../constants/colors';

interface FloatingTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  colors?: ThemeColors;
}

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
  colors: propColors,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors: contextColors } = useTheme();
  const colors = propColors ?? contextColors;
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom + 14 }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const focused = index === state.index;
          const label = options.title ?? route.name;
          const icon = options.tabBarIcon?.({
            focused,
            color: focused ? colors.navText : colors.navInactive,
            size: 22,
          });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={4}>
              <View style={[styles.itemInner, focused && styles.itemActive]}>
                {icon}
                <Text
                  style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      paddingTop: 10,
      paddingHorizontal: 24,
      backgroundColor: colors.bg,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 36,
      height: 62,
      paddingHorizontal: 6,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 6,
      paddingVertical: 8,
      borderRadius: 24,
    },
    itemActive: {
      backgroundColor: colors.navActive,
      paddingHorizontal: 14,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
    },
    labelActive: {
      color: colors.navText,
    },
    labelInactive: {
      color: 'transparent',
    },
  });
