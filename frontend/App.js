import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "./src/containers/auth/LoginScreen.jsx";
import SignupScreen from "./src/containers/auth/SignUpScreen.jsx";
import ForgotPasswordScreen from "./src/containers/auth/ForgotPasswordScreen.jsx";

import CitizenHomeScreen from "./src/containers/citizen/CitizenHomeScreen.jsx";
import CreateIssueScreen from "./src/containers/citizen/CreateIssueScreen";
import MyReportsScreen from "./src/containers/citizen/MyReportsScreen";
import IssueDetailsScreen from "./src/containers/citizen/IssueDetailsScreen";
import ProfileScreen from "./src/containers/citizen/ProfileScreen";
import NotificationsScreen from "./src/containers/citizen/NotificationsScreen";
import WorkerHomeScreen from "./src/containers/worker/WorkerHomeScreen";
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="CitizenHome" component={CitizenHomeScreen} />
          <Stack.Screen name="CreateIssue" component={CreateIssueScreen} />
          <Stack.Screen name="MyReports" component={MyReportsScreen} />
          <Stack.Screen name="IssueDetails" component={IssueDetailsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
