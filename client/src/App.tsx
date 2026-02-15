import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModeProvider } from "@/contexts/ModeContext";
import NotFound from "@/pages/not-found";
import RoleSelection from "@/pages/RoleSelection";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import ResetPassword from "@/pages/ResetPassword";
import ForgotPassword from "@/pages/ForgotPassword";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import StudentDashboard from "@/pages/dashboards/StudentDashboard";
import ParentDashboard from "@/pages/dashboards/ParentDashboard";
import EmployeeDashboard from "@/pages/dashboards/EmployeeDashboard";
import SocialFeed from "@/pages/SocialFeed";
import Explore from "@/pages/Explore";
import Communities from "@/pages/Communities";
import Chats from "@/pages/Chats";
import Notifications from "@/pages/Notifications";
import Achievements from "@/pages/Achievements";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import CampusUsersPage from "@/pages/campus/Users";
import CampusAcademicsPage from "@/pages/campus/Academics";
import CampusAttendancePage from "@/pages/campus/Attendance";
import CampusAssignmentsPage from "@/pages/campus/Assignments";
import CampusSchedulePage from "@/pages/campus/Schedule";
import CampusAnnouncementsPage from "@/pages/campus/Announcements";
import CampusReportsPage from "@/pages/campus/Reports";
import CampusResourcesPage from "@/pages/campus/Resources";
import CampusPaymentsPage from "@/pages/campus/Payments";
import CampusExamsPage from "@/pages/campus/Exams";
import CampusExpensesPage from "@/pages/campus/Expenses";
import CampusStaffAttendancePage from "@/pages/campus/StaffAttendance";
import CampusPromotionsPage from "@/pages/campus/Promotions";
import CampusCertificatesPage from "@/pages/campus/Certificates";
import CampusAdminSetupPage from "@/pages/campus/Admin";
import StudentEnrollmentPage from "@/pages/enrollment/StudentEnrollment";
import ParentEnrollmentPage from "@/pages/enrollment/ParentEnrollment";
import EmployeeEnrollmentPage from "@/pages/enrollment/EmployeeEnrollment";
import AdminEnrollmentPage from "@/pages/enrollment/AdminEnrollment";

function ProtectedRoute({ component: Component, allowedRoles }: { component: any; allowedRoles?: string[] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Redirect to={`/dashboard/${user.role}`} />;
  }

  return <Component />;
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return <Redirect to={`/dashboard/${user.role}`} />;
  }

  return <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <RootRedirect />}</Route>
      <Route path="/login">{() => <Login />}</Route>
      <Route path="/role-selection">{() => <RoleSelection />}</Route>
      <Route path="/register">{() => <Register />}</Route>
      <Route path="/verify-email">{() => <VerifyEmail />}</Route>
      <Route path="/reset-password">{() => <ResetPassword />}</Route>
      <Route path="/forgot-password">{() => <ForgotPassword />}</Route>
      
      <Route path="/dashboard/admin">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} />}
      </Route>
      <Route path="/dashboard/student">
        {() => <ProtectedRoute component={StudentDashboard} allowedRoles={['student']} />}
      </Route>
      <Route path="/dashboard/parent">
        {() => <ProtectedRoute component={ParentDashboard} allowedRoles={['parent']} />}
      </Route>
      <Route path="/dashboard/employee">
        {() => <ProtectedRoute component={EmployeeDashboard} allowedRoles={['employee']} />}
      </Route>
      
      <Route path="/dashboard/social">
        {() => <ProtectedRoute component={SocialFeed} />}
      </Route>
      <Route path="/social/explore">
        {() => <ProtectedRoute component={Explore} />}
      </Route>
      <Route path="/social/communities">
        {() => <ProtectedRoute component={Communities} />}
      </Route>
      <Route path="/social/chats">
        {() => <ProtectedRoute component={Chats} />}
      </Route>
      <Route path="/social/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>
      <Route path="/dashboard/student/achievements">
        {() => <ProtectedRoute component={Achievements} allowedRoles={['student']} />}
      </Route>
      
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>
      
      <Route path="/campus/users">
        {() => <ProtectedRoute component={CampusUsersPage} allowedRoles={['admin']} />}
      </Route>
      <Route path="/enrollment/student">
        {() => <ProtectedRoute component={StudentEnrollmentPage} allowedRoles={['student']} />}
      </Route>
      <Route path="/enrollment/parent">
        {() => <ProtectedRoute component={ParentEnrollmentPage} allowedRoles={['parent']} />}
      </Route>
      <Route path="/enrollment/employee">
        {() => <ProtectedRoute component={EmployeeEnrollmentPage} allowedRoles={['employee']} />}
      </Route>
      <Route path="/enrollment/admin">
        {() => <ProtectedRoute component={AdminEnrollmentPage} allowedRoles={['admin']} />}
      </Route>
      <Route path="/campus/academics">
        {() => <ProtectedRoute component={CampusAcademicsPage} />}
      </Route>
      <Route path="/campus/attendance">
        {() => <ProtectedRoute component={CampusAttendancePage} />}
      </Route>
      <Route path="/campus/assignments">
        {() => <ProtectedRoute component={CampusAssignmentsPage} />}
      </Route>
      <Route path="/campus/schedule">
        {() => <ProtectedRoute component={CampusSchedulePage} />}
      </Route>
      <Route path="/campus/payments">
        {() => <ProtectedRoute component={CampusPaymentsPage} />}
      </Route>
      <Route path="/campus/announcements">
        {() => <ProtectedRoute component={CampusAnnouncementsPage} />}
      </Route>
      <Route path="/campus/reports">
        {() => <ProtectedRoute component={CampusReportsPage} />}
      </Route>
      <Route path="/campus/resources">
        {() => <ProtectedRoute component={CampusResourcesPage} />}
      </Route>
      <Route path="/campus/exams">
        {() => <ProtectedRoute component={CampusExamsPage} />}
      </Route>
      <Route path="/campus/expenses">
        {() => <ProtectedRoute component={CampusExpensesPage} />}
      </Route>
      <Route path="/campus/staff-attendance">
        {() => <ProtectedRoute component={CampusStaffAttendancePage} />}
      </Route>
      <Route path="/campus/promotions">
        {() => <ProtectedRoute component={CampusPromotionsPage} allowedRoles={['admin']} />}
      </Route>
      <Route path="/campus/certificates">
        {() => <ProtectedRoute component={CampusCertificatesPage} />}
      </Route>
      <Route path="/campus/admin">
        {() => <ProtectedRoute component={CampusAdminSetupPage} allowedRoles={['admin']} />}
      </Route>
      <Route path="/social/connect">
        {() => <ProtectedRoute component={() => <PlaceholderPage title="Connect" description="Connect with peers and teachers" />} />}
      </Route>
      <Route path="/social/messages">
        {() => <ProtectedRoute component={() => <PlaceholderPage title="Messages" description="Chat with campus community" />} />}
      </Route>
      <Route path="/social/notifications">
        {() => <ProtectedRoute component={() => <PlaceholderPage title="Notifications" description="View your notifications" />} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={() => <PlaceholderPage title="Notifications" description="View all your notifications" />} />}
      </Route>
      
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;