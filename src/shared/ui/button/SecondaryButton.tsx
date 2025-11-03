import type { ReactNode } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import type { AppTheme } from '@shared/theme/theme';
import { Typography } from '../typography/Typography';

export type SecondaryButtonProps = {
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export const SecondaryButton = ({
  children,
  onPress,
  disabled = false,
  style
}: SecondaryButtonProps) => {
  const theme = useTheme() as AppTheme;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: 'transparent',
          borderColor: theme.colors.primary,
          borderWidth: 2,
        },
        disabled && {
          borderColor: theme.colors.textSecondary,
          opacity: 0.5
        },
        style
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Typography
        variant="body"
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
