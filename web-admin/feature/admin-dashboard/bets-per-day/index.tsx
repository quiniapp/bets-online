import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"


interface DailyRevenueData {
    day: string;
    revenue: number;
    bets: number;
}

interface BetsPerDayProps {
    dailyRevenue?: DailyRevenueData[];
}

export const BetsPerDay = ({ dailyRevenue }: BetsPerDayProps) => {

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ingresos Diarios</CardTitle>
                <CardDescription>Ingresos y número de apuestas por día</CardDescription>
            </CardHeader>
            <CardContent>
                {dailyRevenue?.length === 0 ? (
                    <div className="text-center py-8 text-center py-8 h-full items-center flex-col flex justify-center">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No recent activity</p>
                    </div>
                ) : (<ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>)}

            </CardContent>
        </Card>
    )
}
