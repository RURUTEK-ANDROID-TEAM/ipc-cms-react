import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { Toaster } from "sonner";

const AuthLayout = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      navigate("/dashboard", { replace: true });
    } else {
      setCheckingAuth(false);
    }
  }, [navigate]);

  return (
    <>
      {checkingAuth ? (
        <div className="flex items-center justify-center h-screen text-2xl font-bold">
          Welcome to Rurutek IP-CAMERA Management System
        </div>
      ) : (
        <Outlet />
      )}
      <Toaster richColors position="top-center" />
    </>
  );
};

export default AuthLayout;
