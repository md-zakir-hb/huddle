/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * XnzGWFS5fnT6Gk75 - default
 *
 * 94tabJItm6j4SLkT - daily-tasks
 *
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import RootTabs from './navigation/RootTabs';
import AuthScreen from './screens/AuthScreen';

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UnreadMessagesProvider>
          <StatusBar barStyle={'light-content'} />
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </UnreadMessagesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#091540" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <AuthScreen />
      </SafeAreaView>
    );
  }

  return <RootTabs />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;
