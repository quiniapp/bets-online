import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

// ✅ Interfaz para los datos del formulario
interface LoginFormData {
  email: string;
  password: string;
}

const useLogin = (userType: "admin" | "user" = "admin") => {
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
    console.log("📝 Form submitted with:", data); // DEBUG
    setError("");
    setIsLoading(true);
    
    try {
      console.log("🚀 Attempting login..."); // DEBUG
      const success = await login(
        { 
          username: data.email,
          password: data.password 
        }, 
        userType
      );

      console.log("📊 Login success:", success); // DEBUG

      if (success) {
        console.log("✅ Login exitoso, redirecting..."); // DEBUG
        
        // DEBUG: Verificar el estado antes de redirigir
        setTimeout(() => {
          console.log("🔍 Auth state after login:", { 
            localStorage: {
              user: localStorage.getItem("auth_user"),
              role: localStorage.getItem("auth_role")
            }
          });
        }, 100);
        
        // ✅ Redirigir según el tipo de usuario
        if (userType === "admin") {
          console.log("🧭 Navigating to /admin/dashboard"); // DEBUG
          
          // Prueba con window.location para descartar problemas del router
          setTimeout(() => {
            window.location.href = "/admin/dashboard";
          }, 100);
          
        } else {
          router.push("/dashboard"); // o la ruta que uses para usuarios normales
        }
      } else {
        console.log("❌ Login failed, setting error"); // DEBUG
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }
      
    } catch (error: any) {
      console.error("🚨 Error en login:", error); // DEBUG
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