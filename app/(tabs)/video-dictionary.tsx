import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';

import type { AppTheme } from '@shared/theme/theme';
import { PhraseSearch } from '@features/video-learning/ui/PhraseSearch';

export default function CoursesScreen() {
  const theme = useTheme() as AppTheme;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <PhraseSearch />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

