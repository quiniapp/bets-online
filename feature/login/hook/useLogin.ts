import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface LoginFormData {
  email: string;
  password: string;
}

const useLogin = (userType?: "admin" | "user") => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

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

      let success = await login(
        {
          username: data.email,
          password: data.password
        },
        "admin"
      );

      if (!success) {
        success = await login(
          {
            username: data.email,
            password: data.password
          },
          "user"
        );
      }


      if (success) {

        const userRole = localStorage.getItem("auth_role");


        if (userRole === "superadmin" || userRole === "admin") {

          router.push("/admin/dashboard");
        } else if (userRole === "user") {

          router.push("/user/dashboard");
        } else {

          router.push("/");
        }

      } else {

        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }

    } catch (error: any) {

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
      required: "El email/usuario es requerido",
    },
    password: {
      required: "La contraseña es requerida",
      minLength: {
        value: 3,
        message: "La contraseña debe tener al menos 3 caracteres"
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