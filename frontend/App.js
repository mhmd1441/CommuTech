import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { initAuth } from "./src/services/api";

import LoginScreen from "./src/containers/auth/LoginScreen.jsx";
import SignupScreen from "./src/containers/auth/SignUpScreen.jsx";
import ForgotPasswordScreen from "./src/containers/auth/ForgotPasswordScreen.jsx";
import EmailVerificationScreen from "./src/containers/auth/EmailVerificationScreen.jsx";

import CitizenHomeScreen from "./src/containers/citizen/CitizenHomeScreen.jsx";
import CreateIssueScreen from "./src/containers/citizen/CreateIssueScreen";
import MyReportsScreen from "./src/containers/citizen/MyReportsScreen";
import IssueDetailsScreen from "./src/containers/citizen/IssueDetailsScreen";
import ProfileScreen from "./src/containers/citizen/ProfileScreen";
import ReportHistoryScreen from "./src/containers/citizen/ReportHistoryScreen";
import MyContributionsScreen from "./src/containers/citizen/MyContributionsScreen";
import SavedPaymentMethodsScreen from "./src/containers/citizen/SavedPaymentMethodsScreen";
import NotificationsScreen from "./src/containers/citizen/NotificationsScreen";
import WorkerHomeScreen from "./src/containers/worker/WorkerHomeScreen";
import ChatScreen from "./src/containers/worker/ChatScreen";
import TermsScreen from "./src/containers/shared/TermsScreen";
import PrivacyPolicyScreen from "./src/containers/shared/PrivacyPolicyScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    initAuth().then((user) => {
      setInitialRoute(user ? "CitizenHome" : "Login");
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#19405F" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="CitizenHome" component={CitizenHomeScreen} />
          <Stack.Screen name="CreateIssue" component={CreateIssueScreen} />
          <Stack.Screen name="MyReports" component={MyReportsScreen} />
          <Stack.Screen name="IssueDetails" component={IssueDetailsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ReportHistory" component={ReportHistoryScreen} />
          <Stack.Screen name="MyContributions" component={MyContributionsScreen} />
          <Stack.Screen name="SavedPaymentMethods" component={SavedPaymentMethodsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
