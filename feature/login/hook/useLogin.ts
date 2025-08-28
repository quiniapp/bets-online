import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

// ✅ Interfaz para los datos del formulario
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
  } = useForm<LoginFormData>({ // ✅ Tipado del useForm
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log("📝 Form submitted with:", data);
    setError("");
    setIsLoading(true);
    
    try {
      console.log("🚀 Attempting login...");
      
      // ✅ Primero intentar como admin/superadmin
      let success = await login(
        { 
          username: data.email,
          password: data.password 
        }, 
        "admin"
      );

      // ✅ Si falla admin, intentar como user
      if (!success) {
        success = await login(
          { 
            username: data.email,
            password: data.password 
          }, 
          "user"
        );
      }

      console.log("📊 Login success:", success);

      if (success) {
        console.log("✅ Login exitoso, redirecting...");
        
        // DEBUG: Verificar el estado antes de redirigir
        setTimeout(() => {
          console.log("🔍 Auth state after login:", { 
            localStorage: {
              user: localStorage.getItem("auth_user"),
              role: localStorage.getItem("auth_role")
            }
          });
        }, 100);
        
        // ✅ Redirigir según el role del usuario logueado
        const userRole = localStorage.getItem("auth_role");
        console.log("🧭 User role for redirect:", userRole);
        
        if (userRole === "superadmin" || userRole === "admin") {
          console.log("🧭 Navigating to admin dashboard");
          router.push("/admin/dashboard");
        } else if (userRole === "user") {
          console.log("🧭 Navigating to user dashboard");
          router.push("/user/dashboard");
        } else {
          console.log("🧭 Unknown role, navigating to home");
          router.push("/");
        }
        
      } else {
        console.log("❌ Login failed, setting error");
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }
      
    } catch (error: any) {
      console.error("🚨 Error en login:", error);
      setError(error?.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (errors: any) => { // ✅ Tipado del error handler
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