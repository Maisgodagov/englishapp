import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';

export type SurfaceCardProps = {
  padded?: boolean;
  style?: object;
  children?: ReactNode;
  fill?: boolean
};

export const SurfaceCard = ({ children, padded = true, style, fill = false }: SurfaceCardProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={[styles.container, fill && styles.fill, style]}>
      <View style={[styles.body, padded && styles.padded]}>
        {children}
      </View>
    </View>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 3,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fill: {
    flex: 1,
  },
  body: {
    // padding будет добавлен условно
  },
  padded: {
    padding: 20,
  },
});
