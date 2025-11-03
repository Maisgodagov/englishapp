import type { ReactNode } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import type { AppTheme } from '@shared/theme/theme';
import { Typography } from '../typography/Typography';

export type TextButtonProps = {
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export const TextButton = ({
  children,
  onPress,
  disabled = false,
  style
}: TextButtonProps) => {
  const theme = useTheme() as AppTheme;

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Typography
        variant="caption"
        style={[
          styles.text,
          { color: theme.colors.primary },
          disabled && { color: theme.colors.textSecondary }
        ]}
      >
        {children}
      </Typography>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
