import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react";
import {
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts"

interface GamePopularityData {
    name: string;
    value: number;
    color: string;
}

interface PriorityGamesProps {
    gamePopularity?: GamePopularityData[];
}

export const PriorityGames = ({ gamePopularity }: PriorityGamesProps) => {
console.log('gamePopularity',gamePopularity)
    return (
        <Card>
            <CardHeader>
                <CardTitle>Popularidad de Juegos</CardTitle>
                <CardDescription>Distribución de apuestas por tipo de juego</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
                {gamePopularity?.length === 0 ? (
                    <div className="text-center py-8 text-center py-8 h-full items-center flex-col flex justify-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={gamePopularity}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                            {gamePopularity?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                )}
                
            </CardContent>
        </Card>
    )
}