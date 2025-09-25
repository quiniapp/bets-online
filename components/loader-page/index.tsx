import { useEffect } from "react"
import { useLoader } from "@/hooks/use-loader"
import { FlexCol } from "../flex"


interface  LoaderPageProps {
    size?: 'sm'| 'md'|'lg'|'xl'
}

const LoaderPage = ({size = 'md'}: LoaderPageProps) => {
    const { showLoader, Loader } = useLoader({
        text: "Cargando datos...",
        size: size 
    })

    useEffect(() => {
        showLoader() // Activar al montar el componente
    }, [showLoader])
    
    return (
        <FlexCol className="h-screen items-center justify-center">
            <Loader />
        </FlexCol>
    )
}

export default  LoaderPage