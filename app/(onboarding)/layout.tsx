import { LogoutButton } from "@/components/shared/logout-button"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="absolute top-4 right-4">
        <LogoutButton />
      </div>
      {children}
    </>
  )
}
