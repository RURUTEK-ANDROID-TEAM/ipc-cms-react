import { Outlet } from "react-router";
import { Toaster } from "sonner";

const AuthLayout = () => {
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-center" />
    </>
  );
};

export default AuthLayout;
