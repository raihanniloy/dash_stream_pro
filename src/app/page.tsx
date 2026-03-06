import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold">DashStream</span>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Turn your spreadsheets into dashboards
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Upload a CSV or Excel file. AI analyzes your data and suggests the
          best charts. Build interactive dashboards in minutes — no SQL or
          coding required.
        </p>
        <Link href="/register">
          <Button size="lg">Start for Free</Button>
        </Link>
      </main>
    </div>
  );
}
