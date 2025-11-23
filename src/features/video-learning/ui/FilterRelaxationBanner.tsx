import { memo, useEffect } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@shared/ui';

interface FilterRelaxationBannerProps {
  message: string;
  onDismiss: () => void;
}

const FilterRelaxationBannerComponent = ({ message, onDismiss }: FilterRelaxationBannerProps) => {
  const theme = useTheme() as any;
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 5000);

    return () => clearTimeout(timer);
  }, [opacity, onDismiss]);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="information-circle" size={22} color={theme.colors.primary} />
        </View>
        <Typography variant="body" style={styles.message}>
          {message}
        </Typography>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export const FilterRelaxationBanner = memo(FilterRelaxationBannerComponent);
