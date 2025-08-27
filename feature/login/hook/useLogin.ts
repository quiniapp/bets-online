import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const useLogin = () => {
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
  } = useForm({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data:any) => {
    setError("");
    setIsLoading(true);
    
    try {
   
      const success = await login(
        { 
          username: data.email,
          password: data.password 
        }, 
        "admin" 
      );

      if (success) {
        console.log("Login exitoso");
      
        router.push("/admin/dashboard"); 
      } else {
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }
      
    } catch (error) {
      console.error("Error en login:", error);
      setError(error.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (errors) => {
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