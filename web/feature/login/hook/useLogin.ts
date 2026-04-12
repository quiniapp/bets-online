import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "helper";

interface LoginFormData {
  email: string;
  password: string;
}

const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(params.get("redirect"));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<LoginFormData>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);

    try {
      const user = await login({
        username: data.email,
        password: data.password
      });

      if (user) {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          switch (user.role) {
            case UserRole.OWNER:
            case UserRole.ADMIN:
              router.push("/admin/dashboard");
              break;
            case UserRole.CASHIER:
              router.push("/cashier/dashboard");
              break;
            case UserRole.PLAYER:
              router.push("/user/dashboard");
              break;
            default:
              router.push("/");
          }
        }
      } else {
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }

    } catch (error: any) {
      console.error("Error en login:", error);
      setError(error?.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (errors: any) => {
    console.log("Errores de validación:", errors);
  };

  const validationRules = {
    email: {
      required: "El usuario es requerido",
    },
    password: {
      required: "La contraseña es requerida",
      minLength: {
        value: 8,
        message: "La contraseña debe tener al menos 8 caracteres"
      }
    }
  };

  const clearError = () => {
    setError("");
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit, handleError),
    errors,
    isValid,
    watch,
    reset,
    isLoading,
    error,
    validationRules,
    onSubmit,
    clearError,
  };
};

export default useLogin;