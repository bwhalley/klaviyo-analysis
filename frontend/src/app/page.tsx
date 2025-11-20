import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { BarChart, TrendingUp, Users, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold">Klaviyo Analysis</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold mb-6">
            Analyze Your Email-to-Purchase Journey
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Understand how long it takes new email subscribers to make their
            first purchase. Get actionable insights with cohort analysis, conversion
            metrics, and beautiful visualizations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg">Start Free Analysis</Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">
          Powerful Analytics Features
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Users className="h-10 w-10 text-primary-600" />}
            title="Subscriber Tracking"
            description="Track all email subscribers and their journey to first purchase"
          />
          <FeatureCard
            icon={<TrendingUp className="h-10 w-10 text-primary-600" />}
            title="Conversion Metrics"
            description="Calculate conversion rates, median time to purchase, and more"
          />
          <FeatureCard
            icon={<BarChart className="h-10 w-10 text-primary-600" />}
            title="Cohort Analysis"
            description="Group subscribers by signup date and compare performance"
          />
          <FeatureCard
            icon={<Clock className="h-10 w-10 text-primary-600" />}
            title="Time Analysis"
            description="Understand the optimal timing for follow-ups and campaigns"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-xl mb-8 opacity-90">
            Connect your Klaviyo account and run your first analysis in minutes
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 Klaviyo Analysis. Built with Next.js and love.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

