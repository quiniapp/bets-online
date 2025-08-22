import Link from "next/link"

import { Button } from "@/components/ui/button"

import { Shield, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">BetPlatform Pro</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Professional betting platform with dual authentication system for administrators and users
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl">Administrator Portal</CardTitle>
              <CardDescription>Manage users, games, balances and platform operations</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
                <li>• User account management</li>
                <li>• Game access control</li>
                <li>• Balance adjustments</li>
                <li>• Platform analytics</li>
              </ul>
              <Link href="/admin/login">
                <Button className="w-full bg-red-600 hover:bg-red-700">Admin Login</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">User Portal</CardTitle>
              <CardDescription>Access games, manage profile and track betting history</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
                <li>• Game betting interface</li>
                <li>• Profile management</li>
                <li>• Account history</li>
                <li>• Game access requests</li>
              </ul>
              <Link href="/user/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">User Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-500 dark:text-gray-400">Secure • Reliable • Professional</p>
        </div>
      </div>
    </div>
  )
}
