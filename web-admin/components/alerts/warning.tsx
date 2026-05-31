import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "../ui/card"


interface AlertWarningProps {
    title: string
    body: string
}

const  AlertWarning = ({title, body}: AlertWarningProps) => {
    return(
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                    {title}
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {body}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
    )
}
export default AlertWarning