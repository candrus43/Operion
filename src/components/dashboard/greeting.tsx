"use client"

interface GreetingProps {
  firstName: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getTimeEmoji(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "☀️"
  if (hour < 17) return "🌤️"
  return "🌙"
}

export function Greeting({ firstName }: GreetingProps) {
  return (
    <>
      <span className="text-amber-400">{getTimeEmoji()}</span>{" "}
      {getGreeting()}, <span className="text-white">{firstName}</span>
    </>
  )
}
