"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { getUserProfile, type UserProfile } from "@/lib/user-client"

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const userProfile = await getUserProfile(user.uid)
        setProfile(userProfile)
      } catch (error) {
        console.error("Error loading user profile:", error)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  return { profile, loading }
}
