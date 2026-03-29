import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { OrderListScreen } from '../screens/OrderListScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { CompletionScreen } from '../screens/CompletionScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { token, isLoading: authLoading } = useAuth();
  const { isLoading: themeLoading, theme } = useTheme();

  if (authLoading || themeLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.primary }}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={token ? 'OrderList' : 'Login'}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OrderList" component={OrderListScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="Completion" component={CompletionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
