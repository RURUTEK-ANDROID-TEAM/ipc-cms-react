import { LoginForm } from "@/components/auth/forms/login-form";
import { useTheme } from "@/hooks/use-theme-provider";
import { NavLink } from "react-router";

const Login = () => {
  const { theme } = useTheme();

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <NavLink
          to="#"
          className="flex items-center gap-2 self-center font-medium"
        >
          <img
            src={
              theme === "dark" ? "/rurutek_logo_dark.png" : "/rurutek_logo.png"
            }
            alt="Ruru Tek Logo"
            className="w-8 h-auto"
          />
          <span className="text-xl font-semibold">
            Ruru Tek Private Limited
          </span>
        </NavLink>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
